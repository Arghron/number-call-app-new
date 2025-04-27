import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const App = () => {
  const [input, setInput] = useState('');
  const [drsNumbers, setDrsNumbers] = useState([]);
  const [overrideNumbers, setOverrideNumbers] = useState([]);
  const [checkDateNumbers, setCheckDateNumbers] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [socket, setSocket] = useState(null);
  const [muted, setMuted] = useState(true); // Mute by default
  const [announcedNumbers, setAnnouncedNumbers] = useState(new Set()); // Track announced numbers
  const inputRef = useRef(null); // Ref for input field

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });

    // Handle initial state
    newSocket.on('initial-state', (data) => {
      console.log('Received initial state:', data);
      setDrsNumbers(data.DRS || []);
      setOverrideNumbers(data.Override || []);
      setCheckDateNumbers(data['Check Date'] || []);
    });

    newSocket.on('number-update', (data) => {
      console.log('Received update:', data);
      switch(data.category) {
        case 'DRS':
          setDrsNumbers(prev => [...prev, data.number]);
          break;
        case 'Override':
          setOverrideNumbers(prev => [...prev, data.number]);
          break;
        case 'Check Date':
          setCheckDateNumbers(prev => [...prev, data.number]);
          break;
        default:
          console.log('Unknown category:', data.category);
          break;
      }
      // Only speak if not muted and not previously announced
      const uniqueKey = `${data.category}-${data.number}`;
      if (!muted && !announcedNumbers.has(uniqueKey)) {
        speak(data.text);
        setAnnouncedNumbers(prev => new Set(prev).add(uniqueKey));
      }
    });

    // Handle deletions from other clients
    newSocket.on('number-deleted', (data) => {
      console.log('Received deletion:', data);
      switch(data.category) {
        case 'DRS':
          setDrsNumbers(prev => prev.filter((_, i) => i !== data.index));
          break;
        case 'Override':
          setOverrideNumbers(prev => prev.filter((_, i) => i !== data.index));
          break;
        case 'Check Date':
          setCheckDateNumbers(prev => prev.filter((_, i) => i !== data.index));
          break;
      }
      // Remove from announced numbers
      const uniqueKey = `${data.category}-${data.number}`;
      setAnnouncedNumbers(prev => {
        const newSet = new Set(prev);
        newSet.delete(uniqueKey);
        return newSet;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [muted, announcedNumbers]);

  // Handle keyboard input (only when input field is not focused)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keydown events if the input field is focused
      if (document.activeElement === inputRef.current) return;

      if (/^[0-9]$/.test(e.key)) {
        setInput(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle repeated announcements
  useEffect(() => {
    const interval = setInterval(() => {
      // Only include categories with numbers in the announcement
      const announcements = [];
      if (drsNumbers.length > 0) announcements.push(`DRS: ${drsNumbers.join(', ')}`);
      if (overrideNumbers.length > 0) announcements.push(`Override: ${overrideNumbers.join(', ')}`);
      if (checkDateNumbers.length > 0) announcements.push(`Check Date: ${checkDateNumbers.join(', ')}`);

      const text = announcements.join('. ');
      if (!text) return; // Skip if there are no numbers to announce

      if (socket) {
        socket.emit('repeat-message', { text });
      }
      if (!muted) {
        speak(text);
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [drsNumbers, overrideNumbers, checkDateNumbers, intervalMinutes, socket, muted]);

  // Text-to-speech function
  const speak = (text) => {
    if (!text || !('speechSynthesis' in window)) {
      console.log('Speech synthesis not supported or no text provided');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;

    // Attempt to use Cantonese (zh-HK)
    const voices = window.speechSynthesis.getVoices();
    const cantoneseVoice = voices.find(voice => voice.lang === 'zh-HK');
    if (cantoneseVoice) {
      utterance.voice = cantoneseVoice;
    } else {
      console.log('Cantonese voice not available, falling back to default');
    }

    utterance.onend = () => console.log('Speech finished');
    utterance.onerror = (event) => console.log('Speech error:', event.error);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Handle button clicks
  const handleButtonClick = (category) => {
    if (!input.trim()) return;

    const text = `${category} ${input}`;
    const data = {
      category,
      number: input,
      text
    };

    if (socket) {
      socket.emit('number-added', data);
    }

    setInput('');
    // Auto-focus the input field
    inputRef.current.focus();
  };

  // Handle number deletion
  const deleteNumber = (category, index) => {
    const updaters = {
      'DRS': setDrsNumbers,
      'Override': setOverrideNumbers,
      'Check Date': setCheckDateNumbers
    };

    let number;
    updaters[category](prev => {
      number = prev[index]; // Store the number before filtering
      return prev.filter((_, i) => i !== index);
    });

    const uniqueKey = `${category}-${number}`;
    setAnnouncedNumbers(prev => {
      const newSet = new Set(prev);
      newSet.delete(uniqueKey);
      return newSet;
    });

    if (socket) {
      socket.emit('number-deleted', { category, index });
    }
  };

  return (
    <div className="container mx-auto p-4 text-lg">
      <h1 className="text-4xl font-bold mb-6">Number Call App</h1>

      <div className="mb-6">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
          className="border p-3 mr-3 rounded w-64 text-xl"
          placeholder="Type numbers..."
        />

        <div className="mt-3 space-x-3">
          <button
            onClick={() => setMuted(!muted)}
            className={`p-3 rounded text-white text-xl ${muted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            onClick={() => handleButtonClick('DRS')}
            className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600 text-xl"
          >
            DRS
          </button>
          <button
            onClick={() => handleButtonClick('Override')}
            className="bg-green-500 text-white p-3 rounded hover:bg-green-600 text-xl"
          >
            Override
          </button>
          <button
            onClick={() => handleButtonClick('Check Date')}
            className="bg-yellow-500 text-white p-3 rounded hover:bg-yellow-600 text-xl"
          >
            Check Date
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="mr-3 font-medium text-xl">Repeat interval (minutes):</label>
        <input
          type="number"
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Math.max(1, Number(e.target.value)))}
          min="1"
          className="border p-3 rounded w-20 text-xl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="text-2xl font-semibold">DRS</h2>
          <ul className="mt-3">
            {drsNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-2">
                <span className="mr-3 text-3xl">{num}</span>
                <button
                  onClick={() => deleteNumber('DRS', index)}
                  className="text-red-500 hover:text-red-700 text-xl"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Override</h2>
          <ul className="mt-3">
            {overrideNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-2">
                <span className="mr-3 text-3xl">{num}</span>
                <button
                  onClick={() => deleteNumber('Override', index)}
                  className="text-red-500 hover:text-red-700 text-xl"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Check Date</h2>
          <ul className="mt-3">
            {checkDateNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-2">
                <span className="mr-3 text-3xl">{num}</span>
                <button
                  onClick={() => deleteNumber('Check Date', index)}
                  className="text-red-500 hover:text-red-700 text-xl"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
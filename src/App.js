import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const App = () => {
  const [input, setInput] = useState('');
  const [dksNumbers, setDksNumbers] = useState([]);
  const [overrideNumbers, setOverrideNumbers] = useState([]);
  const [checkDateNumbers, setCheckDateNumbers] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [socket, setSocket] = useState(null);

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
      setDksNumbers(data.DKS);
      setOverrideNumbers(data.Override);
      setCheckDateNumbers(data['Check Date']);
    });

    newSocket.on('number-update', (data) => {
      console.log('Received update:', data);
      switch(data.category) {
        case 'DKS':
          setDksNumbers(prev => [...prev, data.number]);
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
      speak(data.text);
    });

    // Handle deletions from other clients
    newSocket.on('number-deleted', (data) => {
      console.log('Received deletion:', data);
      switch(data.category) {
        case 'DKS':
          setDksNumbers(prev => prev.filter((_, i) => i !== data.index));
          break;
        case 'Override':
          setOverrideNumbers(prev => prev.filter((_, i) => i !== data.index));
          break;
        case 'Check Date':
          setCheckDateNumbers(prev => prev.filter((_, i) => i !== data.index));
          break;
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
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
      const text = [
        `DKS: ${dksNumbers.join(', ') || 'none'}`,
        `Override: ${overrideNumbers.join(', ') || 'none'}`,
        `Check Date: ${checkDateNumbers.join(', ') || 'none'}`
      ].join('. ');

      if (socket) {
        socket.emit('repeat-message', { text });
      }
      speak(text);
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [dksNumbers, overrideNumbers, checkDateNumbers, intervalMinutes, socket]);

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
  };

  // Handle number deletion
  const deleteNumber = (category, index) => {
    const updaters = {
      'DKS': setDksNumbers,
      'Override': setOverrideNumbers,
      'Check Date': setCheckDateNumbers
    };

    updaters[category](prev => prev.filter((_, i) => i !== index));

    if (socket) {
      socket.emit('number-deleted', { category, index });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Number Call App</h1>

      <div className="mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
          className="border p-2 mr-2 rounded w-64"
          placeholder="Type numbers..."
        />

        <div className="mt-2 space-x-2">
          <button
            onClick={() => speak('Audio test successful')}
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
          >
            Test Audio
          </button>
          <button
            onClick={() => handleButtonClick('DKS')}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            DKS
          </button>
          <button
            onClick={() => handleButtonClick('Override')}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            Override
          </button>
          <button
            onClick={() => handleButtonClick('Check Date')}
            className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600"
          >
            Check Date
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="mr-2 font-medium">Repeat interval (minutes):</label>
        <input
          type="number"
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Math.max(1, Number(e.target.value)))}
          min="1"
          className="border p-2 rounded w-20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h2 className="text-xl font-semibold">DKS</h2>
          <ul className="mt-2">
            {dksNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-1">
                <span className="mr-2">{num}</span>
                <button
                  onClick={() => deleteNumber('DKS', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Override</h2>
          <ul className="mt-2">
            {overrideNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-1">
                <span className="mr-2">{num}</span>
                <button
                  onClick={() => deleteNumber('Override', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Check Date</h2>
          <ul className="mt-2">
            {checkDateNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-1">
                <span className="mr-2">{num}</span>
                <button
                  onClick={() => deleteNumber('Check Date', index)}
                  className="text-red-500 hover:text-red-700"
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
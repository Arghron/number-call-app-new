import React, { useState, useEffect } from 'react';
import './App.css';
import { io } from 'socket.io-client';

const App = () => {
  const [input, setInput] = useState('');
  const [drsNumbers, setDrsNumbers] = useState([]);
  const [overrideNumbers, setOverrideNumbers] = useState([]);
  const [checkDateNumbers, setCheckDateNumbers] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.IO connection with better configuration
  useEffect(() => {
    const newSocket = io(window.location.origin, { 
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });

    // Updated message handler for number updates
    newSocket.on('number-update', (data) => {
      console.log('Received update:', data);
      speak(data.text);
      
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
          break;
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('number-update');
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

  // Handle repeated calls
  useEffect(() => {
    const interval = setInterval(() => {
      const text = [
        `DRS: ${drsNumbers.join(', ') || 'none'}`,
        `Override: ${overrideNumbers.join(', ') || 'none'}`,
        `Check Date: ${checkDateNumbers.join(', ') || 'none'}`
      ].join('. ');
      
      if (socket) {
        socket.emit('repeat-message', { text });
      }
      speak(text);
    }, intervalMinutes * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [drsNumbers, overrideNumbers, checkDateNumbers, intervalMinutes, socket]);

  // Text-to-speech function
  const speak = (text) => {
    if (!text) return;
    console.log('Speaking:', text);
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // Handle button clicks - updated to match server event names
  const handleButtonClick = (category) => {
    if (!input) return;
    const text = `${category} ${input}`;
    
    if (socket) {
      socket.emit('number-added', {
        category,
        number: input,
        text
      });
    }
    
    setInput('');
  };

  // Handle number deletion
  const deleteNumber = (category, index) => {
    const updateState = {
      'DRS': setDrsNumbers,
      'Override': setOverrideNumbers,
      'Check Date': setCheckDateNumbers
    };
    
    updateState[category](prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Number Call App</h1>
      <div className="mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
          className="border p-2 mr-2 rounded"
          placeholder="Type numbers..."
        />
        <div className="mt-2 space-x-2">
          <button
            onClick={() => speak('Manual test')}
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
          >
            Test Audio
          </button>
          <button
            onClick={() => handleButtonClick('DRS')}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            DRS
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
          onChange={(e) => setIntervalMinutes(Number(e.target.value))}
          min="1"
          className="border p-2 rounded"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h2 className="text-xl font-semibold">DRS</h2>
          <ul className="mt-2">
            {drsNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-1">
                <span>{num}</span>
                <button
                  onClick={() => deleteNumber('DRS', index)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Other number lists remain the same */}
      </div>
    </div>
  );
};

export default App;
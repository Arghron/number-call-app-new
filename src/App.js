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

  // Handle Socket.IO for real-time audio sharing and state syncing
  useEffect(() => {
    const newSocket = io('http://localhost:3001', { transports: ['websocket'] });
    newSocket.on('connect', () => console.log('Socket.IO connected'));
    newSocket.on('message', (data) => {
      console.log('Received message:', data);
      const { type, text, category, number } = data;
      if (type === 'number-added') {
        speak(text);
        if (category === 'DRS') {
          setDrsNumbers((prev) => {
            console.log('Updating DRS numbers:', [...prev, number]);
            return [...prev, number];
          });
        } else if (category === 'Override') {
          setOverrideNumbers((prev) => [...prev, number]);
        } else if (category === 'Check Date') {
          setCheckDateNumbers((prev) => [...prev, number]);
        }
      } else if (type === 'repeat') {
        speak(text);
      }
    });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        setInput((prev) => prev + e.key);
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
        socket.emit('message', { type: 'repeat', text });
      }
    }, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [drsNumbers, overrideNumbers, checkDateNumbers, intervalMinutes, socket]);

  // Text-to-speech function
  const speak = (text) => {
    console.log('Speaking:', text);
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // Handle button clicks
  const handleButtonClick = (category) => {
    if (!input) return;
    const text = `${category} ${input}`;
    if (socket) {
      console.log('Sending message:', { type: 'number-added', text, category, number: input });
      socket.emit('message', { type: 'number-added', text, category, number: input });
    }
    setInput('');
  };

  // Handle number deletion
  const deleteNumber = (category, index) => {
    if (category === 'DRS') {
      setDrsNumbers((prev) => prev.filter((_, i) => i !== index));
    } else if (category === 'Override') {
      setOverrideNumbers((prev) => prev.filter((_, i) => i !== index));
    } else if (category === 'Check Date') {
      setCheckDateNumbers((prev) => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Number Call App</h1>
      <div className="mb-4">
        <input
          type="text"
          value={input}
          readOnly
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
            className="bg-green-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Override
          </button>
          <button
            onClick={() => handleButtonClick('Check Date')}
            className="bg-yellow-500 text-white p-2 rounded hover:bg-blue-600"
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
            {console.log('Rendering DRS numbers:', drsNumbers)}
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
        <div>
          <h2 className="text-xl font-semibold">Override</h2>
          <ul className="mt-2">
            {overrideNumbers.map((num, index) => (
              <li key={index} className="flex items-center py-1">
                <span>{num}</span>
                <button
                  onClick={() => deleteNumber('Override', index)}
                  className="ml-2 text-red-500 hover:text-red-700"
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
                <span>{num}</span>
                <button
                  onClick={() => deleteNumber('Check Date', index)}
                  className="ml-2 text-red-500 hover:text-red-700"
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
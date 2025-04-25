import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [input, setInput] = useState('');
  const [drsNumbers, setDrsNumbers] = useState([]);
  const [overrideNumbers, setOverrideNumbers] = useState([]);
  const [checkDateNumbers, setCheckDateNumbers] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [ws, setWs] = useState(null);
  const audioContextRef = useRef(new AudioContext());

  // Handle WebSocket for real-time audio sharing
  useEffect(() => {
    const socket = new WebSocket('wss://echo.websocket.org'); // Replace with your WebSocket server
    socket.onopen = () => console.log('WebSocket connected');
    socket.onmessage = (event) => {
      const { text } = JSON.parse(event.data);
      speak(text);
    };
    setWs(socket);
    return () => socket.close();
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
      speak(text);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ text }));
      }
    }, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [drsNumbers, overrideNumbers, checkDateNumbers, intervalMinutes, ws]);

  // Text-to-speech function
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // Handle button clicks
  const handleButtonClick = (category) => {
    if (!input) return;
    const text = `${category} ${input}`;
    speak(text);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ text }));
    }
    if (category === 'DRS') {
      setDrsNumbers((prev) => [...prev, input]);
    } else if (category === 'Override') {
      setOverrideNumbers((prev) => [...prev, input]);
    } else if (category === 'Check Date') {
      setCheckDateNumbers((prev) => [...prev, input]);
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

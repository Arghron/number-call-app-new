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
  const [muted, setMuted] = useState(true);
  const [announcedNumbers, setAnnouncedNumbers] = useState(new Set());
  const inputRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });

    newSocket.on('initial-state', (data) => {
      setDrsNumbers(data.DRS || []);
      setOverrideNumbers(data.Override || []);
      setCheckDateNumbers(data['Check Date'] || []);
    });

    newSocket.on('number-update', (data) => {
      // This is now just for other clients, since we update locally immediately
      const uniqueKey = `${data.category}-${data.number}`;
      if (!muted && !announcedNumbers.has(uniqueKey)) {
        speak(data.text);
        setAnnouncedNumbers(prev => new Set(prev).add(uniqueKey));
      }
    });

    newSocket.on('number-deleted', (data) => {
      // Handle deletions from other clients
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
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [muted]);

  // ... (keep other useEffect hooks and functions the same)

  const handleButtonClick = (category) => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !/^\d+$/.test(trimmedInput)) {
      console.error('Invalid input - must contain only numbers');
      return;
    }

    if (!socket || !socket.connected) {
      console.error('Socket not connected!');
      return;
    }

    const text = `${category} ${trimmedInput}`;
    const data = {
      category,
      number: trimmedInput,
      text
    };

    // Update local state immediately
    switch(category) {
      case 'DRS':
        setDrsNumbers(prev => [...prev, trimmedInput]);
        break;
      case 'Override':
        setOverrideNumbers(prev => [...prev, trimmedInput]);
        break;
      case 'Check Date':
        setCheckDateNumbers(prev => [...prev, trimmedInput]);
        break;
    }

    // Emit socket event
    socket.emit('number-added', data);

    // Add to announced numbers
    const uniqueKey = `${category}-${trimmedInput}`;
    setAnnouncedNumbers(prev => new Set(prev).add(uniqueKey));

    setInput('');
    inputRef.current.focus();
  };

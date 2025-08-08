const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the WebRTC client at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected. Total clients:', clients.size + 1);
  clients.add(ws);

  // Relay messages between clients
  ws.on('message', (message) => {
    console.log('Relaying message:', message.toString());
    
    // Forward message to all other connected clients
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Total clients:', clients.size);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
});
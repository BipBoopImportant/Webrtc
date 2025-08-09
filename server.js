const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const NodeMediaServer = require('node-media-server');

const app = express();
app.use(express.static('public')); // Serve the HTML file

const server = http.createServer(app);

// --- Part 1: WebRTC Signaling Server (for Hotspot Mode) ---
const wss = new WebSocketServer({ noServer: true }); // We'll handle the upgrade manually
let clients = [];
wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('WebRTC client connected. Total:', clients.length);
    ws.on('message', (message) => {
        clients.forEach(c => {
            if (c !== ws && c.readyState === ws.OPEN) c.send(message.toString());
        });
    });
    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        console.log('WebRTC client disconnected. Total:', clients.length);
    });
});

// --- Part 2: Node Media Server (for Internet Mode) ---
const nmsConfig = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000, // Internal port, Render will proxy this
    mediaroot: './media',
    allow_origin: '*'
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg', // Default path on many Linux systems, including Render
    tasks: [{
      app: 'live',
      hls: true,
      hlsFlags: '[hls_time=1:hls_list_size=3:hls_flags=delete_segments]',
    }]
  }
};
const nms = new NodeMediaServer(nmsConfig);
nms.run(); // Start the media server

// --- Server Upgrade Handler ---
// This allows both servers to run on the same port
server.on('upgrade', (request, socket, head) => {
  // Differentiate between WebRTC signaling and other requests
  if (request.url === '/webrtc') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // You could add handlers for other WebSocket paths here if needed
    socket.destroy();
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Main server (HTTP & WebSocket) running on port ${port}`);
    console.log(`Media server RTMP input on port 1935`);
});

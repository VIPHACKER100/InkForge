const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;

/* Phase F4 — collaboration hardening:
   - optional shared room token (INKFORGE_ROOM_TOKEN env): connections without
     ?token=<match> are closed with 4401 before joining;
   - per-connection message rate limit and per-IP concurrent-connection cap;
   - 64 KB payload cap (ws closes oversized frames with 1009 itself).
   With no token configured the relay behaves exactly as before (LAN mode). */
const HARDENING = {
  MESSAGE_RATE_WINDOW: 10000,
  MESSAGE_RATE_MAX: 240,
  MAX_CONNECTIONS_PER_IP: 5,
  MAX_PAYLOAD_BYTES: 64 * 1024,
};

function generateColor() {
  const colors = [
    '#f44336',
    '#e91e63',
    '#9c27b0',
    '#673ab7',
    '#3f51b5',
    '#2196f3',
    '#03a9f4',
    '#00bcd4',
    '#009688',
    '#4caf50',
    '#8bc34a',
    '#cddc39',
    '#ffeb3b',
    '#ffc107',
    '#ff9800',
    '#ff5722',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Basic string transformation logic (Operational Transformation)
// We only support INSERT and DELETE for a single character or string at a given position.
function transform(op1, op2) {
  // transforms op1 to include the effects of op2
  if (op1.type === 'INSERT' && op2.type === 'INSERT') {
    if (op1.position < op2.position) {
      return op1; // op1 stays the same
    } else if (op1.position > op2.position) {
      return { ...op1, position: op1.position + op2.char.length };
    } else {
      // If at same position, we need a tie-breaker. Usually user ID or alphabetical.
      // Let's tie-break using user ID to ensure consistency.
      if (op1.userId > op2.userId) {
        return { ...op1, position: op1.position + op2.char.length };
      }
      return op1;
    }
  }

  if (op1.type === 'INSERT' && op2.type === 'DELETE') {
    if (op1.position <= op2.position) {
      return op1;
    } else {
      // op2 deleted something before op1
      const overlap = Math.max(0, Math.min(op1.position - op2.position, op2.char.length));
      return { ...op1, position: op1.position - overlap };
    }
  }

  if (op1.type === 'DELETE' && op2.type === 'INSERT') {
    if (op1.position < op2.position) {
      return op1; // We delete before their insertion
    } else {
      // We delete after their insertion
      return { ...op1, position: op1.position + op2.char.length };
    }
  }

  if (op1.type === 'DELETE' && op2.type === 'DELETE') {
    if (op1.position < op2.position) {
      return op1;
    } else {
      // Both are deleting, potentially overlapping
      if (op1.position >= op2.position + op2.char.length) {
        return { ...op1, position: op1.position - op2.char.length };
      } else {
        // They overlap. We simplify by treating overlapping deletes as doing nothing for the overlapping part.
        // A full OT system splits operations here.
        // For simplicity, we just adjust the position.
        return { ...op1, position: op2.position };
      }
    }
  }

  return op1;
}


function createCollabServer({ port = PORT, token = null } = {}) {
  const server = http.createServer();
  const wss = new WebSocket.Server({ server, maxPayload: HARDENING.MAX_PAYLOAD_BYTES });
  server.listen(port);

// Server state
let documentText = '';
let serverRevision = 0;
const operationHistory = []; // Array of { revision, op }
const MAX_HISTORY = 1000;
let historyOffset = 0; // tracks how many entries have been discarded from front
const connectedClients = new Map();

  const ipConnections = new Map(); // ip -> count

  wss.on('connection', (ws, req) => {
    // Room token gate (Phase F4)
    if (token) {
      const url = new URL(req.url, 'http://localhost');
      if (url.searchParams.get('token') !== token) {
        ws.close(4401, 'Room token required');
        return;
      }
    }

    // Per-IP concurrent-connection cap (Phase F4)
    const ip = req.socket.remoteAddress || 'unknown';
    const concurrent = ipConnections.get(ip) || 0;
    if (concurrent >= HARDENING.MAX_CONNECTIONS_PER_IP) {
      ws.close(1013, 'Too many connections');
      return;
    }
    ipConnections.set(ip, concurrent + 1);

    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const color = generateColor();

    const clientInfo = { ws, userId, color, cursor: 0 };
    connectedClients.set(userId, clientInfo);

    // Per-connection message rate limit (Phase F4): sliding 10 s window
    let messageTimestamps = [];
    function rateLimited() {
      const now = Date.now();
      messageTimestamps = messageTimestamps.filter((t) => now - t < HARDENING.MESSAGE_RATE_WINDOW);
      messageTimestamps.push(now);
      return messageTimestamps.length > HARDENING.MESSAGE_RATE_MAX;
    }

    console.log(`Client connected: ${userId}`);

  // Send initial state to the client
  ws.send(
    JSON.stringify({
      type: 'INIT',
      userId,
      color,
      text: documentText,
      revision: serverRevision,
      users: Array.from(connectedClients.values()).map((c) => ({ userId: c.userId, color: c.color, cursor: c.cursor })),
    })
  );

  // Broadcast the new user to everyone else
  broadcast(
    {
      type: 'USER_JOINED',
      userId,
      color,
    },
    userId
  );

  ws.on('message', (message, isBinary) => {
    if (rateLimited()) {
      ws.close(1008, 'Message rate limit exceeded');
      return;
    }
    if (isBinary) {
      ws.close(1003, 'Binary messages not supported');
      return;
    }
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'OPERATION') {
        let op = msg.operation;
        if (!op || !op.type) {
          ws.close();
          return;
        }
        const clientRevision = msg.revision || 0;

        // OT logic: transform incoming operation against all history operations that happened after clientRevision
        if (clientRevision < 0 || clientRevision > serverRevision) {
          ws.close();
          return;
        }
        if (clientRevision < historyOffset) {
          ws.close();
          return;
        } // history too old
        for (let i = clientRevision; i < serverRevision; i++) {
          const pastOp = operationHistory[i - historyOffset].op;
          op = transform(op, pastOp);
        }

        // Apply operation to server's document text
        if (typeof op.char !== 'string') {
          ws.close();
          return;
        }
        if (typeof op.position !== 'number' || op.position < 0 || op.position > documentText.length) {
          ws.close();
          return;
        }
        if (op.type === 'INSERT') {
          documentText = documentText.slice(0, op.position) + op.char + documentText.slice(op.position);
        } else if (op.type === 'DELETE') {
          documentText = documentText.slice(0, op.position) + documentText.slice(op.position + op.char.length);
        }

        // Save to history and increment revision
        operationHistory.push({ revision: serverRevision, op });
        serverRevision++;
        // Compact history if it exceeds limit
        if (operationHistory.length > MAX_HISTORY) {
          const discard = operationHistory.length - MAX_HISTORY;
          operationHistory.splice(0, discard);
          historyOffset += discard;
        }

        // Send ACK to the sender (just updates their revision, no re-apply)
        ws.send(
          JSON.stringify({
            type: 'ACK',
            revision: serverRevision,
          })
        );

        // Broadcast the transformed operation to all OTHER clients
        broadcast(
          {
            type: 'OPERATION',
            operation: op,
            revision: serverRevision,
            sourceUserId: userId,
          },
          userId
        );
      } else if (msg.type === 'CURSOR') {
        clientInfo.cursor = msg.position;
        broadcast(
          {
            type: 'CURSOR',
            userId,
            position: msg.position,
          },
          userId
        );
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('error', () => {});

  ws.on('close', () => {
    console.log(`Client disconnected: ${userId}`);
    connectedClients.delete(userId);
    const count = ipConnections.get(ip) || 1;
    if (count <= 1) ipConnections.delete(ip);
    else ipConnections.set(ip, count - 1);
    broadcast({
      type: 'USER_LEFT',
      userId,
    });
  });
});

  function broadcast(data, excludeUserId = null) {
    const message = JSON.stringify(data);
    for (const [userId, client] of connectedClients.entries()) {
      if (userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  return {
    server,
    wss,
    close: () =>
      new Promise((resolve) => {
        for (const client of connectedClients.values()) client.ws.terminate();
        connectedClients.clear();
        server.close(resolve);
      }),
  };
}

module.exports = { createCollabServer, transform, HARDENING };

/* Run directly: node server.js — set INKFORGE_ROOM_TOKEN to require a room token. */
if (require.main === module) {
  const token = process.env.INKFORGE_ROOM_TOKEN || null;
  createCollabServer({ port: PORT, token });
  console.log(
    `WebSocket Collaborative Server running on ws://localhost:${PORT}` +
      (token ? ' (room token required)' : ' (open — LAN only)')
  );
}


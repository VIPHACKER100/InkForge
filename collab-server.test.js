/**
 * Collaboration Relay Server Hardening Tests — Phase F4
 * Covers the room-token gate, the per-IP connection cap, and the message
 * rate limit of the factory-built relay (server.js createCollabServer).
 * Uses ephemeral ports; each test gets its own isolated server instance.
 */
import { describe, it, expect, afterEach } from 'vitest';
import WebSocket from 'ws';
import { createCollabServer } from './server.js';

let active = null;

async function start(opts = {}) {
  active = createCollabServer({ port: 0, ...opts });
  await new Promise((resolve) => active.server.on('listening', resolve));
  return 'ws://127.0.0.1:' + active.server.address().port;
}

// Rejection closes arrive AFTER the handshake 'open' — await them explicitly
async function waitForClose(state) {
  if (state.closed !== null) return;
  await new Promise((resolve) => state.ws.once('close', resolve));
}

function connect(url) {
  // state is returned by reference so late close codes stay visible to the caller
  const state = { ws: null, messages: [], closed: null };
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    state.ws = ws;
    ws.on('open', () => {
      if (!state.resolved) {
        state.resolved = true;
        resolve(state);
      }
    });
    ws.on('message', (d) => state.messages.push(JSON.parse(d.toString())));
    ws.on('close', (code) => {
      state.closed = code;
      if (!state.resolved) {
        state.resolved = true;
        resolve(state);
      }
    });
    ws.on('error', () => {});
    setTimeout(() => {
      if (!state.resolved) {
        state.resolved = true;
        resolve(state);
      }
    }, 2000);
  });
}

afterEach(async () => {
  if (active) {
    await active.close();
    active = null;
  }
});

describe('collab relay hardening (Phase F4)', () => {
  it('open mode: connects and receives INIT', async () => {
    const url = await start({});
    const client = await connect(url);
    expect(client.closed).toBeNull();
    expect(client.messages[0].type).toBe('INIT');
    client.ws.close();
  });

  it('token gate: closes 4401 without the token', async () => {
    const url = await start({ token: 'secret' });
    const client = await connect(url);
    await waitForClose(client);
    expect(client.closed).toBe(4401);
    expect(client.messages).toHaveLength(0);
  });

  it('token gate: accepts the correct token', async () => {
    const url = await start({ token: 'secret' });
    const client = await connect(url + '?token=secret');
    expect(client.closed).toBeNull();
    expect(client.messages[0].type).toBe('INIT');
    client.ws.close();
  });

  it('token gate: rejects a wrong token', async () => {
    const url = await start({ token: 'secret' });
    const client = await connect(url + '?token=nope');
    await waitForClose(client);
    expect(client.closed).toBe(4401);
  });

  it('per-IP cap: the 6th concurrent connection is closed with 1013', async () => {
    const url = await start({});
    const clients = [];
    for (let i = 0; i < 5; i++) clients.push(await connect(url));
    const sixth = await connect(url);
    await waitForClose(sixth);
    expect(sixth.closed).toBe(1013);
    clients.forEach((c) => c.ws.close());
  });

  it('message rate limit: flooding closes with 1008', async () => {
    const url = await start({});
    const client = await connect(url);
    // 300 junk messages blow past the 240-per-10s window
    for (let i = 0; i < 300; i++) {
      if (client.ws.readyState !== WebSocket.OPEN) break;
      client.ws.send('not json');
    }
    await new Promise((r) => setTimeout(r, 300));
    expect(client.closed).toBe(1008);
  });

  it('oversized payloads are rejected by the 64 KB frame cap', async () => {
    const url = await start({});
    const client = await connect(url);
    const big = 'x'.repeat(80 * 1024);
    await new Promise((resolve) => {
      client.ws.on('close', (code) => {
        client.closed = code;
        resolve();
      });
      client.ws.on('message', () => {}); // keep collecting
      client.ws.send(big);
    });
    expect(client.closed).toBe(1009);
  });
});

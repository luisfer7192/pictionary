
# Pictionary – Web (Vite)

Tiny React (Vite + TypeScript) client for a Pictionary demo.
Uses SVG for drawing (crisp, responsive) and talks to the Socket.IO server via VITE_SERVER_URL.
Intentionally minimal so the reviewer can run it quickly.

## Quick start
``` bash
cd web
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173 as default
```

> If testing with a phone on the same Wi-Fi, set VITE_SERVER_URL in .env to your machine’s LAN IP, e.g. http://192.168.1.20:3001.


## How to play (1 minute)

Open the app on your laptop → click Create Room (you’re the drawer). A secret word appears (drawer only).

Open the app on your phone (same URL) → enter the room code to Join.

Drawer draws; others type guesses. On a correct guess, the server announces it and starts the next word.

## What’s inside

Stack: Vite (React + TS + SWC) + socket.io-client

Drawing: SVG paths (simple, responsive, undo-friendly)

State: All game state lives in memory on the server (no DB/auth)


## Troubleshooting

CORS / connection errors: Ensure the server allows your web origin (default http://localhost:5173) and that VITE_SERVER_URL points to the server.

Phone can’t connect: Use your LAN IP in VITE_SERVER_URL and keep both devices on the same network.

Socket.IO mismatch: Both client and server use Socket.IO v4.
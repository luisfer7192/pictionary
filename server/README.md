
# Pictionary – Server (Simple Demo)

Tiny realtime backend for a Pictionary demo.
Built with Node.js + Express + Socket.IO v4. All state is in-memory (rooms, players, current word). This is intentionally minimal so reviewers can run it quickly.

I dont use typescript because is just an example for the react app.

## Quick start
``` bash
cd server
cp .env.example .env        # optional
npm install
npm start     
```

Health check: open http://localhost:3001/ → returns ok.


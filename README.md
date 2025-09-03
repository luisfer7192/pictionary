## Pictionary

Please read the README of server and web folders.

> [!NOTE]
> Web have this same information

## How to play (1 minute)

Open the app on your laptop → click Create Room (you’re the drawer). A secret word appears (drawer only).

Open the app on your phone (same URL) → enter the room code to Join.

Drawer draws; others type guesses. On a correct guess, the server announces it and starts the next word.

## Troubleshooting

CORS / connection errors: Ensure the server allows your web origin (default http://localhost:5173) and that VITE_SERVER_URL points to the server.

Phone can’t connect: Use your LAN IP in VITE_SERVER_URL and keep both devices on the same network.

Socket.IO mismatch: Both client and server use Socket.IO v4.
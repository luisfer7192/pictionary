require('dotenv').config()
const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN || true }))

// simple health check
app.get('/', (_req, res) => res.send('ok'))

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || true }
})

const WORDS = ['apple','car','house','cat','tree','phone','pizza','dog','book','sun']
const rooms = {} // { CODE: { word, drawerId, players: { [socketId]: nickname } } }
const code = () => Math.random().toString(36).slice(2, 6).toUpperCase()
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

io.on('connection', (socket) => {
  // create a room (becomes the drawer)
  socket.on('room:create', ({ nickname }) => {
    const roomCode = code()
    const word = pick(WORDS)
    rooms[roomCode] = { word, drawerId: socket.id, players: { [socket.id]: nickname || 'Drawer' } }
    socket.join(roomCode)
    socket.emit('room:created', { roomCode })
    io.to(socket.id).emit('round:start', { roomCode, word }) // secret only to drawer
    io.to(roomCode).emit('room:players', { players: Object.values(rooms[roomCode].players) })
  })

  // join an existing room (guesser)
  socket.on('room:join', ({ roomCode, nickname }) => {
    const room = rooms[roomCode]
    if (!room) return socket.emit('room:error', { message: 'Room not found' })
    room.players[socket.id] = nickname || 'Player'
    socket.join(roomCode)
    io.to(roomCode).emit('room:players', { players: Object.values(room.players) })
  })

  // drawer sends points; server broadcasts to others (not echoing back)
  socket.on('stroke:point', ({ roomCode, id, x, y, t, color, width }) => {
    socket.to(roomCode).emit('stroke:point', { id, x, y, t, color, width })
  })

  // guessers send guesses
  socket.on('guess:new', ({ roomCode, text, nickname }) => {
    const room = rooms[roomCode]
    if (!room) return
    const guess = (text || '').trim()
    io.to(roomCode).emit('guess:broadcast', { nickname, text: guess })
    if (guess.toLowerCase() === room.word.toLowerCase()) {
      io.to(roomCode).emit('round:correct', { nickname, word: room.word })
      // next round: keep same drawer for simplicity
      room.word = pick(WORDS)
      io.to(room.drawerId).emit('round:start', { roomCode, word: room.word })
      // players list stays the same
    }
  })

  socket.on('disconnect', () => {
    for (const [roomCode, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id]
        io.to(roomCode).emit('room:players', { players: Object.values(room.players) })
        if (Object.keys(room.players).length === 0) delete rooms[roomCode]
      }
    }
  })
})

const port = Number(process.env.PORT || 3001)
server.listen(port, () => console.log(`server listening on :${port}`))

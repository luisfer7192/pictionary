import React, { useEffect, useMemo, useState } from 'react'
import { socket } from './libs/socket'
import SvgBoard from './components/SvgBoard'
import type { Stroke, StrokeMsg } from './types/games';

export default function App() {
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [myRoom, setMyRoom] = useState<string | null>(null)
  const [secretWord, setSecretWord] = useState<string | null>(null) // only drawer receives this
  const [players, setPlayers] = useState<string[]>([])
  const [guesses, setGuesses] = useState<string[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [color, setColor] = useState('#111')
  const [width, setWidth] = useState(3)

  const isDrawer = useMemo(() => !!secretWord && !!myRoom, [secretWord, myRoom])
  const effectiveRoom = (myRoom || roomCode.trim().toUpperCase())

  // socket listeners
  useEffect(() => {
    socket.on('room:created', ({ roomCode }) => setMyRoom(roomCode))
    socket.on('room:players', ({ players }) => setPlayers(players))
    socket.on('round:start', ({ word }) => setSecretWord(word))
    socket.on('round:correct', ({ nickname, word }) => {
      setGuesses(g => [...g, `✅ ${nickname} guessed "${word}"`])
      setSecretWord(null) // will receive next secret for drawer
      setStrokes([])      // clear board for next round
    })
    socket.on('guess:broadcast', ({ nickname, text }) => setGuesses(g => [...g.slice(-30), `${nickname}: ${text}`]))
    socket.on('stroke:point', (m: StrokeMsg) => {
      setStrokes(curr => {
        const i = curr.findIndex(s => s.id === m.id)
        if (i === -1) return [...curr, { id: m.id, color: m.color, width: m.width, points: [{ x: m.x, y: m.y, t: m.t }] }]
        const next = curr.slice()
        next[i] = { ...next[i], points: [...next[i].points, { x: m.x, y: m.y, t: m.t }] }
        return next
      })
    })
    return () => {
      socket.off()
    }
  }, [])

  // actions
  const createRoom = () => socket.emit('room:create', { nickname: nickname || 'Drawer' })
  const joinRoom = () => socket.emit('room:join', { roomCode: effectiveRoom, nickname: nickname || 'Player' })
  const sendGuess = (text: string) => {
    if (!effectiveRoom || !text) return
    socket.emit('guess:new', { roomCode: effectiveRoom, text, nickname: nickname || 'Player' })
  }
  const sendPoint = (p: StrokeMsg) => {
    // local immediate update (for the drawer)...
    setStrokes(curr => {
      const i = curr.findIndex(s => s.id === p.id)
      if (i === -1) return [...curr, { id: p.id, color: p.color, width: p.width, points: [{ x: p.x, y: p.y, t: p.t }] }]
      const next = curr.slice()
      next[i] = { ...next[i], points: [...next[i].points, { x: p.x, y: p.y, t: p.t }] }
      return next
    })
    // ...then broadcast to others
    socket.emit('stroke:point', { roomCode: effectiveRoom, ...p })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h2>Pictionary (Vite + Express + Socket.IO)</h2>

      <div style={{ display: 'grid', gap: 10 }}>
        <input placeholder="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} />

        {!myRoom && (
          <>
            <button onClick={createRoom}>Create Room (Drawer)</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Room code (e.g. ABCD)" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} />
              <button onClick={joinRoom}>Join</button>
            </div>
          </>
        )}

        {myRoom && (
          <div style={{ padding: 8, border: '1px solid #eee', borderRadius: 8 }}>
            <div><b>Room:</b> {myRoom}</div>
            <div><b>Secret word (drawer only):</b> {secretWord ?? '...'}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>Color:</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          <label>Width:</label>
          <input type="range" min={1} max={12} value={width} onChange={e => setWidth(parseInt(e.target.value))} />
        </div>

        <SvgBoard
          strokes={strokes}
          canDraw={isDrawer}
          onPoint={(p) => sendPoint({ ...p })}
          color={color}
          width={width}
        />

        <GuessBox onSend={sendGuess} disabled={!effectiveRoom || isDrawer} />
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, maxHeight: 160, overflow: 'auto' }}>
          {guesses.map((g, i) => <div key={i}>{g}</div>)}
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>Players: {players.join(', ') || '—'}</div>
        <p style={{ fontSize: 12, color: '#666' }}>
          Open on your laptop (create) and phone (join). Drawer sees the secret and can draw.
        </p>
      </div>
    </div>
  )
}

function GuessBox({ onSend, disabled }: { onSend: (t: string) => void; disabled: boolean }) {
  const [t, setT] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (t) { onSend(t); setT('') } }} style={{ display: 'flex', gap: 8 }}>
      <input placeholder="Type your guess…" value={t} onChange={e => setT(e.target.value)} style={{ flex: 1 }} disabled={disabled} />
      <button type="submit" disabled={!t || disabled}>Send</button>
    </form>
  )
}

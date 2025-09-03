import React, { useEffect, useMemo, useState } from 'react'
import { socket } from './libs/socket'
import SvgBoard from './components/SvgBoard'
import type { Stroke, StrokeMsg } from './types/games'
import { useSoundBank } from './hooks/useSoundBank'

export default function App() {
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [myRoom, setMyRoom] = useState<string | null>(null)         // you created (drawer)
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null) // you joined (guesser)
  const [secretWord, setSecretWord] = useState<string | null>(null) // drawer only
  const [players, setPlayers] = useState<string[]>([])
  const [guesses, setGuesses] = useState<string[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [color, setColor] = useState('#111')
  const [width, setWidth] = useState(3)

  const { play, muted, toggleMute } = useSoundBank()

  const effectiveRoom = useMemo(
    () => (myRoom ?? joinedRoom ?? roomCode.trim().toUpperCase()),
    [myRoom, joinedRoom, roomCode]
  )
  const isDrawer = useMemo(() => !!secretWord && !!myRoom, [secretWord, myRoom])

  // socket listeners
  useEffect(() => {
    const onRoomCreated = ({ roomCode }: { roomCode: string }) => setMyRoom(roomCode)
    const onRoomPlayers = ({ players }: { players: string[] }) => setPlayers(players)

    const onRoundStart = ({ word }: { word: string }) => {
      setSecretWord(word)
      play('newRound')                      // 🔊 new round
    }

    const onRoundCorrect = ({ nickname, word }: { nickname: string; word: string }) => {
      setGuesses(g => [...g, `✅ ${nickname} guessed "${word}"`])
      setSecretWord(null)                   // drawer will receive next secret via 'round:start'
      setStrokes([])                        // clear board
      play('correct')                       // 🔊 correct guess
    }

    const onGuess = ({ nickname, text }: { nickname: string; text: string }) =>
      setGuesses(g => [...g.slice(-30), `${nickname}: ${text}`])

    const onStroke = (m: StrokeMsg) => {
      setStrokes(curr => {
        const i = curr.findIndex(s => s.id === m.id)
        if (i === -1) return [...curr, { id: m.id, color: m.color, width: m.width, points: [{ x: m.x, y: m.y, t: m.t }] }]
        const next = curr.slice()
        next[i] = { ...next[i], points: [...next[i].points, { x: m.x, y: m.y, t: m.t }] }
        return next
      })
    }

    const onGameReset = () => {
      setGuesses([])
      setStrokes([])
      setSecretWord(null)
      play('newGame')                        // 🔊 reset/new game
    }

    const onRoomError = ({ message }: { message: string }) => {
      // revert optimistic join if server rejected
      setJoinedRoom(null)
      console.warn('room:error', message)
    }

    socket.on('room:created', onRoomCreated)
    socket.on('room:players', onRoomPlayers)
    socket.on('round:start', onRoundStart)
    socket.on('round:correct', onRoundCorrect)
    socket.on('guess:broadcast', onGuess)
    socket.on('stroke:point', onStroke)
    socket.on('game:reset', onGameReset)
    socket.on('room:error', onRoomError)

    return () => {
      socket.off('room:created', onRoomCreated)
      socket.off('room:players', onRoomPlayers)
      socket.off('round:start', onRoundStart)
      socket.off('round:correct', onRoundCorrect)
      socket.off('guess:broadcast', onGuess)
      socket.off('stroke:point', onStroke)
      socket.off('game:reset', onGameReset)
      socket.off('room:error', onRoomError)
    }
  }, [play]) // include play so sounds stay fresh

  // actions
  const createRoom = () => socket.emit('room:create', { nickname: nickname || 'Drawer' })

  const joinRoom = () => {
    const code = roomCode.trim().toUpperCase()
    if (!code) return
    socket.emit('room:join', { roomCode: code, nickname: nickname || 'Player' })
    setJoinedRoom(code) // optimistic; will revert on 'room:error'
  }

  const leaveRoom = () => {
    if (joinedRoom) {
      // optional: only if your server handles it
      socket.emit('room:leave', { roomCode: joinedRoom, nickname })
    }
    setJoinedRoom(null)
    setPlayers([])
    setGuesses([])
    setStrokes([])
    setSecretWord(null)
    setRoomCode('') // show join UI again
  }

  const sendGuess = (text: string) => {
    if (!effectiveRoom || !text) return
    socket.emit('guess:new', { roomCode: effectiveRoom, text, nickname: nickname || 'Player' })
  }

  const sendPoint = (p: StrokeMsg) => {
    // local immediate update (for the drawer)
    setStrokes(curr => {
      const i = curr.findIndex(s => s.id === p.id)
      if (i === -1) return [...curr, { id: p.id, color: p.color, width: p.width, points: [{ x: p.x, y: p.y, t: p.t }] }]
      const next = curr.slice()
      next[i] = { ...next[i], points: [...next[i].points, { x: p.x, y: p.y, t: p.t }] }
      return next
    })
    // then broadcast to others
    socket.emit('stroke:point', { roomCode: effectiveRoom, ...p })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h2>Pictionary (Vite + Express + Socket.IO)</h2>

      {/* sound toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={toggleMute}>{muted ? '🔇 Enable sound' : '🔊 Mute'}</button>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <input placeholder="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} />

        {/* Show create/join only if not drawer and not joined */}
        {!myRoom && !joinedRoom && (
          <>
            <button onClick={createRoom}>Create Room (Drawer)</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Room code (e.g. ABCD)"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
              />
              <button onClick={joinRoom}>Join</button>
            </div>
          </>
        )}

        {/* Room info card (for drawer or guesser) */}
        {(myRoom || joinedRoom) && (
          <div style={{ padding: 8, border: '1px solid #eee', borderRadius: 8 }}>
            <div><b>Room:</b> {myRoom ?? joinedRoom}</div>
            {isDrawer && <div><b>Secret word:</b> {secretWord ?? '...'}</div>}
            {/* Exit only for guesser */}
            {joinedRoom && (
              <div style={{ marginTop: 8 }}>
                <button onClick={leaveRoom}>Exit Room</button>
              </div>
            )}
          </div>
        )}

        {/* Reset only for drawer */}
        {myRoom && isDrawer && effectiveRoom && (
          <button onClick={() => socket.emit('game:reset', { roomCode: effectiveRoom })}>
            Reset Game
          </button>
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

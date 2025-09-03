import { useMemo, useRef, useState } from 'react'
import correctGuess from '../assets/sounds/correct-guess.mp3'
import newGame from '../assets/sounds/new-game.mp3'
import newRound from '../assets/sounds/new-round.mp3'
// You also have new-round.wav if you want to swap formats:
import winner from '../assets/sounds/winner.mp3'

export type SoundKey = 'correct' | 'newRound' | 'newGame' | 'winner'

export function useSoundBank(poolSize = 2) {
  // Mobile requires user gesture before audio can play
  const [interacted, setInteracted] = useState(false)
  const [muted, setMuted] = useState(true) // start muted; user enables

  const sources = useMemo<Record<SoundKey, string>>(
    () => ({
      correct: correctGuess,
      newRound,
      newGame,
      winner,
    }),
    []
  )

  // Simple audio pooling so quick back-to-back sounds don’t cut off
  const poolsRef = useRef<Record<SoundKey, HTMLAudioElement[]> | null>(null)

  if (!poolsRef.current) {
    poolsRef.current = Object.fromEntries(
      (Object.keys(sources) as SoundKey[]).map((k) => [
        k,
        Array.from({ length: poolSize }).map(() => {
          const a = new Audio(sources[k])
          a.preload = 'auto'
          a.volume = 1
          return a
        }),
      ])
    ) as Record<SoundKey, HTMLAudioElement[]>
  }

  const ensureInteracted = () => {
    if (!interacted) setInteracted(true)
  }

  const toggleMute = () => {
    ensureInteracted()
    setMuted((m) => !m)
  }

  const play = (key: SoundKey) => {
    if (!interacted || muted) return
    const pool = poolsRef.current![key]
    const inst =
      pool.find((a) => a.paused) || (pool[0].cloneNode(true) as HTMLAudioElement)
    inst.currentTime = 0
    inst.play().catch(() => {
      /* ignore autoplay rejections */
    })
  }

  return { play, muted, toggleMute, interacted, enable: ensureInteracted }
}

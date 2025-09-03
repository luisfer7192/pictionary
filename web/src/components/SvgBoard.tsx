import React, { useRef, useState } from 'react'
import { pointsToPath } from '../libs/utils';
import type { Stroke } from '../types/games';

export default function SvgBoard({
  strokes, canDraw, onPoint, color = '#111', width = 3,
  vw = 900, vh = 500
}: {
  strokes: Stroke[]
  canDraw: boolean
  onPoint: (p: { id: string; x: number; y: number; t: number; color: string; width: number }) => void
  color?: string; width?: number; vw?: number; vh?: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const getXY = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const start = (e: React.PointerEvent) => {
    if (!canDraw) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const id = crypto.randomUUID()
    setActiveId(id)
    const { x, y } = getXY(e)
    onPoint({ id, x, y, t: performance.now(), color, width })
  }
  const move = (e: React.PointerEvent) => {
    if (!activeId || !canDraw || e.buttons !== 1) return
    const { x, y } = getXY(e)
    onPoint({ id: activeId, x, y, t: performance.now(), color, width })
  }
  const end = () => setActiveId(null)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vw} ${vh}`}
      style={{ width: '100%', height: 'auto', background: '#fff', border: '1px solid #eee', borderRadius: 12, touchAction: 'none' }}
      onPointerDown={start} onPointerMove={move} onPointerUp={end}
      onPointerLeave={end} onPointerCancel={end}
    >
      {strokes.map(s => (
        <path key={s.id} d={pointsToPath(s.points)} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

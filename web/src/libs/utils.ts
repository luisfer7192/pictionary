import type { Point } from "../types/games"

export const pointsToPath = (pts: Point[]) => {
  if (!pts.length) return ''
  if (pts.length === 1) {
    const p = pts[0]
    return `M ${p.x} ${p.y} l 0.01 0.01`
  }
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1]
    const cx = (p0.x + p1.x) / 2, cy = (p0.y + p1.y) / 2
    d += ` Q ${p0.x} ${p0.y} ${cx} ${cy}`
  }
  const last = pts[pts.length - 1]
  d += ` T ${last.x} ${last.y}`
  return d
}
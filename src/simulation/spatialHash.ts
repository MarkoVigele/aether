import { wrapDelta } from '@/lib/utils'
import { MAX_NEIGHBOR_QUERY } from './clock'

/** Dense herds can put hundreds in one query. Cap so physics stays bounded. */
export const HASH_QUERY_CAP = MAX_NEIGHBOR_QUERY

export class SpatialHash {
  cellSize = 64
  cols = 1
  rows = 1
  width = 1
  height = 1
  wrap = true
  buckets: number[][] = [[]]
  private scratch: [number, number] = [0, 0]

  resize(width: number, height: number, cellSize: number, wrap: boolean) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.cellSize = Math.max(16, cellSize)
    this.wrap = wrap
    this.cols = Math.max(1, Math.ceil(this.width / this.cellSize))
    this.rows = Math.max(1, Math.ceil(this.height / this.cellSize))
    const count = this.cols * this.rows
    if (this.buckets.length !== count) {
      this.buckets = Array.from({ length: count }, () => [])
    }
  }

  clear() {
    for (let i = 0; i < this.buckets.length; i++) this.buckets[i].length = 0
  }

  insert(index: number, x: number, y: number) {
    const cx = this.cellX(x)
    const cy = this.cellY(y)
    this.buckets[cy * this.cols + cx].push(index)
  }

  query(x: number, y: number, radius: number, out: number[], maxResults = HASH_QUERY_CAP) {
    out.length = 0
    const reach = Math.ceil(radius / this.cellSize)
    const cx = this.cellX(x)
    const cy = this.cellY(y)
    this.collectCell(cx, cy, out, maxResults)
    if (out.length >= maxResults) return out
    for (let ring = 1; ring <= reach; ring++) {
      for (let ox = -ring; ox <= ring; ox++) {
        this.collectCell(cx + ox, cy - ring, out, maxResults)
        if (out.length >= maxResults) return out
        this.collectCell(cx + ox, cy + ring, out, maxResults)
        if (out.length >= maxResults) return out
      }
      for (let oy = -ring + 1; oy <= ring - 1; oy++) {
        this.collectCell(cx - ring, cy + oy, out, maxResults)
        if (out.length >= maxResults) return out
        this.collectCell(cx + ring, cy + oy, out, maxResults)
        if (out.length >= maxResults) return out
      }
    }
    return out
  }

  private collectCell(ix0: number, iy0: number, out: number[], maxResults: number) {
    const ix = this.wrap ? this.mod(ix0, this.cols) : ix0
    const iy = this.wrap ? this.mod(iy0, this.rows) : iy0
    if (ix < 0 || iy < 0 || ix >= this.cols || iy >= this.rows) return
    const bucket = this.buckets[iy * this.cols + ix]
    for (let i = 0; i < bucket.length && out.length < maxResults; i++) out.push(bucket[i])
  }

  delta(ax: number, ay: number, bx: number, by: number): [number, number] {
    let dx = bx - ax
    let dy = by - ay
    if (this.wrap) {
      dx = wrapDelta(dx, this.width)
      dy = wrapDelta(dy, this.height)
    }
    this.scratch[0] = dx
    this.scratch[1] = dy
    return this.scratch
  }

  private cellX(x: number) {
    return this.mod(Math.floor(x / this.cellSize), this.cols)
  }

  private cellY(y: number) {
    return this.mod(Math.floor(y / this.cellSize), this.rows)
  }

  private mod(value: number, n: number) {
    return ((value % n) + n) % n
  }
}

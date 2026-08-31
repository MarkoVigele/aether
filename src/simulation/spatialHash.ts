import { wrapDelta } from '@/lib/utils'

export class SpatialHash {
  cellSize = 64
  cols = 1
  rows = 1
  width = 1
  height = 1
  wrap = true
  buckets: number[][] = [[]]

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

  query(x: number, y: number, radius: number, out: number[]) {
    out.length = 0
    const reach = Math.ceil(radius / this.cellSize)
    const cx = this.cellX(x)
    const cy = this.cellY(y)
    for (let oy = -reach; oy <= reach; oy++) {
      for (let ox = -reach; ox <= reach; ox++) {
        const ix = this.wrap ? this.mod(cx + ox, this.cols) : cx + ox
        const iy = this.wrap ? this.mod(cy + oy, this.rows) : cy + oy
        if (ix < 0 || iy < 0 || ix >= this.cols || iy >= this.rows) continue
        const bucket = this.buckets[iy * this.cols + ix]
        for (let i = 0; i < bucket.length; i++) out.push(bucket[i])
      }
    }
    return out
  }

  delta(ax: number, ay: number, bx: number, by: number): [number, number] {
    let dx = bx - ax
    let dy = by - ay
    if (this.wrap) {
      dx = wrapDelta(dx, this.width)
      dy = wrapDelta(dy, this.height)
    }
    return [dx, dy]
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

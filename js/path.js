// Grid-based A* pathfinding with line-of-sight smoothing, used by the robot.

export class NavGrid {
  constructor(minX, minZ, maxX, maxZ, cell = 0.5) {
    this.minX = minX; this.minZ = minZ; this.cell = cell;
    this.w = Math.ceil((maxX - minX) / cell);
    this.h = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
  }

  toCell(x, z) {
    return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)];
  }
  toWorld(cx, cz) {
    return [this.minX + (cx + 0.5) * this.cell, this.minZ + (cz + 0.5) * this.cell];
  }
  inside(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.w && cz < this.h; }
  isBlocked(cx, cz) { return !this.inside(cx, cz) || this.blocked[cz * this.w + cx] === 1; }

  // Mark an axis-aligned rectangle (world units) as blocked, grown by `pad`.
  blockRect(x1, z1, x2, z2, pad = 0) {
    const [a, b] = this.toCell(Math.min(x1, x2) - pad, Math.min(z1, z2) - pad);
    const [c, d] = this.toCell(Math.max(x1, x2) + pad, Math.max(z1, z2) + pad);
    for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) if (this.inside(x, z)) this.blocked[z * this.w + x] = 1;
  }

  nearestFree(cx, cz) {
    if (!this.isBlocked(cx, cz)) return [cx, cz];
    for (let r = 1; r < 12; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (!this.isBlocked(cx + dx, cz + dz)) return [cx + dx, cz + dz];
      }
    }
    return [cx, cz];
  }

  findPath(sx, sz, tx, tz) {
    const start = this.nearestFree(...this.toCell(sx, sz));
    const goal = this.nearestFree(...this.toCell(tx, tz));
    const W = this.w;
    const key = (x, z) => z * W + x;
    const g = new Float32Array(W * this.h).fill(Infinity);
    const came = new Int32Array(W * this.h).fill(-1);
    const closed = new Uint8Array(W * this.h);
    const heap = new MinHeap();
    const hfn = (x, z) => {
      const dx = Math.abs(x - goal[0]), dz = Math.abs(z - goal[1]);
      return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
    };
    g[key(...start)] = 0;
    heap.push(key(...start), hfn(...start));
    const goalK = key(...goal);
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

    while (heap.size) {
      const k = heap.pop();
      if (k === goalK) break;
      if (closed[k]) continue;
      closed[k] = 1;
      const x = k % W, z = (k - x) / W;
      for (const [dx, dz, cost] of dirs) {
        const nx = x + dx, nz = z + dz;
        if (this.isBlocked(nx, nz)) continue;
        if (dx && dz && (this.isBlocked(x + dx, z) || this.isBlocked(x, z + dz))) continue; // no corner cutting
        const nk = key(nx, nz);
        const ng = g[k] + cost;
        if (ng < g[nk]) {
          g[nk] = ng; came[nk] = k;
          heap.push(nk, ng + hfn(nx, nz));
        }
      }
    }
    if (came[goalK] === -1 && goalK !== key(...start)) return [[tx, tz]];

    const cells = [];
    for (let k = goalK; k !== -1; k = came[k]) cells.push([k % W, Math.floor(k / W)]);
    cells.reverse();
    const smooth = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      while (j > i + 1 && !this.lineClear(cells[i], cells[j])) j--;
      smooth.push(cells[j]);
      i = j;
    }
    const pts = smooth.map(([x, z]) => this.toWorld(x, z));
    pts[pts.length - 1] = [tx, tz];
    return pts;
  }

  lineClear([x0, z0], [x1, z1]) {
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 3);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      // check the cell and its neighbours so the robot doesn't clip corners
      for (const [ox, oz] of [[0, 0], [0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]]) {
        if (this.isBlocked(Math.round(x + ox), Math.round(z + oz))) return false;
      }
    }
    return true;
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    const { k, p } = this;
    k.push(key); p.push(pri);
    let i = k.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (p[par] <= p[i]) break;
      [k[i], k[par]] = [k[par], k[i]]; [p[i], p[par]] = [p[par], p[i]];
      i = par;
    }
  }
  pop() {
    const { k, p } = this;
    const top = k[0];
    const lk = k.pop(), lp = p.pop();
    if (k.length) {
      k[0] = lk; p[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[i], k[m]] = [k[m], k[i]]; [p[i], p[m]] = [p[m], p[i]];
        i = m;
      }
    }
    return top;
  }
}

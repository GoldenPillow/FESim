/**
 * 이동/공격 범위 계산 — 순수 함수.
 * 통행 정본 = 地形コスト(이동타입별 진입 코스트, 255 = 불가). Prohibition은 통행성이 아니다.
 * FE 문법: 적군 = 통과 불가 · 아군 = 통과 가능/정지 불가 · 공격은 정지 가능한 타일에서만 뻗는다.
 */

/** 地形コスト 컬럼 순서가 정본 — Job.MoveType 정수가 이 순서를 가리킨다(1=foot, 3=fly 실측). */
export const MOVE_TYPES = ["none", "foot", "horse", "fly", "dragon", "pad"] as const;
export type MoveType = (typeof MOVE_TYPES)[number];

export const IMPASSABLE = 255;

export interface Tile {
  x: number;
  y: number;
}

export interface ReachableTile extends Tile {
  /** 도달에 쓴 이동력 — 경로 화살표·잔여 이동 계산의 입력. */
  cost: number;
}

export interface MoveQuery {
  width: number;
  height: number;
  movePoints: number;
  start: Tile;
  /** 유닛의 이동타입으로 이미 해석된 진입 코스트. IMPASSABLE = 진입 불가. */
  costAt(x: number, y: number): number;
  /** 통과 불가 점유(적군). */
  blocked?(x: number, y: number): boolean;
  /** 통과 가능·정지 불가 점유(아군). */
  occupied?(x: number, y: number): boolean;
}

const NEIGHBORS = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;

/** 시작 타일 포함, 정지 가능한 타일만 반환한다 (도달 코스트 오름차순 아님 — 좌표는 집합으로 쓰라). */
export function movementRange(query: MoveQuery): ReachableTile[] {
  const { width, height, movePoints, start } = query;
  const index = (x: number, y: number) => y * width + x;
  const best = new Map<number, number>();
  best.set(index(start.x, start.y), 0);
  // 맵이 작고(≤32×32) 코스트가 정수라 배열 프런티어로 충분 — 우선순위 큐 불요.
  let frontier: ReachableTile[] = [{ ...start, cost: 0 }];
  while (frontier.length > 0) {
    const next: ReachableTile[] = [];
    for (const tile of frontier) {
      if (best.get(index(tile.x, tile.y)) !== tile.cost) continue;
      for (const [dx, dy] of NEIGHBORS) {
        const x = tile.x + dx;
        const y = tile.y + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (query.blocked?.(x, y)) continue;
        const enter = query.costAt(x, y);
        if (enter >= IMPASSABLE) continue;
        const cost = tile.cost + enter;
        if (cost > movePoints) continue;
        const k = index(x, y);
        const known = best.get(k);
        if (known !== undefined && known <= cost) continue;
        best.set(k, cost);
        next.push({ x, y, cost });
      }
    }
    frontier = next;
  }
  const tiles: ReachableTile[] = [];
  for (const [k, cost] of best) {
    const x = k % width;
    const y = Math.floor(k / width);
    const isStart = x === start.x && y === start.y;
    if (!isStart && query.occupied?.(x, y)) continue;
    tiles.push({ x, y, cost });
  }
  return tiles;
}

interface PathState {
  x: number;
  y: number;
  /** NEIGHBORS 인덱스. -1 = 시작(첫걸음은 꺾임이 아니다). */
  dir: number;
  cost: number;
  turns: number;
}

/**
 * 시작 → dest 경로 (타일 열, 시작 포함). 도달 불가·정지 불가 목적지는 null.
 * 최소 코스트가 규칙이고, 동코스트면 꺾임 최소 — 인게임 화살표처럼 직선을 선호해야 오독이 없다.
 */
export function movementPath(query: MoveQuery, dest: Tile): Tile[] | null {
  const { width, height, movePoints, start } = query;
  if (dest.x < 0 || dest.y < 0 || dest.x >= width || dest.y >= height) return null;
  if (dest.x === start.x && dest.y === start.y) return [{ x: start.x, y: start.y }];
  if (query.blocked?.(dest.x, dest.y) || query.occupied?.(dest.x, dest.y)) return null;
  if (query.costAt(dest.x, dest.y) >= IMPASSABLE) return null;

  const stateKey = (x: number, y: number, dir: number) => (y * width + x) * 5 + dir + 1;
  const best = new Map<number, [number, number]>();
  const prev = new Map<number, number>();
  const heap: PathState[] = [];
  const less = (a: PathState, b: PathState) => a.cost < b.cost || (a.cost === b.cost && a.turns < b.turns);
  const push = (s: PathState) => {
    heap.push(s);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!less(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  };
  const pop = (): PathState => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        let smallest = i;
        for (const child of [i * 2 + 1, i * 2 + 2]) {
          if (child < heap.length && less(heap[child], heap[smallest])) smallest = child;
        }
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  };

  const startState: PathState = { x: start.x, y: start.y, dir: -1, cost: 0, turns: 0 };
  best.set(stateKey(start.x, start.y, -1), [0, 0]);
  push(startState);
  while (heap.length > 0) {
    const s = pop();
    const k = stateKey(s.x, s.y, s.dir);
    const record = best.get(k)!;
    if (record[0] !== s.cost || record[1] !== s.turns) continue;
    if (s.x === dest.x && s.y === dest.y) {
      const path: Tile[] = [];
      let cursor: number | undefined = k;
      while (cursor !== undefined) {
        const cell = Math.floor(cursor / 5);
        path.push({ x: cell % width, y: Math.floor(cell / width) });
        cursor = prev.get(cursor);
      }
      return path.reverse();
    }
    for (let i = 0; i < NEIGHBORS.length; i++) {
      const [dx, dy] = NEIGHBORS[i];
      const x = s.x + dx;
      const y = s.y + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (query.blocked?.(x, y)) continue;
      const enter = query.costAt(x, y);
      if (enter >= IMPASSABLE) continue;
      const cost = s.cost + enter;
      if (cost > movePoints) continue;
      const turns = s.turns + (s.dir !== -1 && s.dir !== i ? 1 : 0);
      const nk = stateKey(x, y, i);
      const known = best.get(nk);
      if (known && (known[0] < cost || (known[0] === cost && known[1] <= turns))) continue;
      best.set(nk, [cost, turns]);
      prev.set(nk, k);
      push({ x, y, dir: i, cost, turns });
    }
  }
  return null;
}

/** 정지 가능 타일들에서 맨해튼 사거리 [rangeMin, rangeMax] 링의 합집합. */
export function attackRange(
  standTiles: readonly Tile[],
  rangeMin: number,
  rangeMax: number,
  width: number,
  height: number,
): Tile[] {
  const seen = new Set<number>();
  const result: Tile[] = [];
  for (const tile of standTiles) {
    for (let dy = -rangeMax; dy <= rangeMax; dy++) {
      const rest = rangeMax - Math.abs(dy);
      for (let dx = -rest; dx <= rest; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance < rangeMin) continue;
        const x = tile.x + dx;
        const y = tile.y + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const k = y * width + x;
        if (seen.has(k)) continue;
        seen.add(k);
        result.push({ x, y });
      }
    }
  }
  return result;
}

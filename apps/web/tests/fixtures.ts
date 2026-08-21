import type { BoardProps, BoardUnitProp } from "../src/lib/fe17";
import type { StatBlock } from "@fesim/engine";

/** 테스트용 localStorage — 노드 환경엔 없다. throwOn으로 쿼터 초과·프라이빗 모드를 흉내낸다. */
export function memoryStorage(throwOn?: "setItem" | "getItem" | "removeItem"): Storage {
  const map = new Map<string, string>();
  const guard = (op: string) => {
    if (op === throwOn) throw new Error("QuotaExceededError");
  };
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => {
      guard("getItem");
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      guard("setItem");
      map.set(k, v);
    },
    removeItem: (k: string) => {
      guard("removeItem");
      map.delete(k);
    },
  } as Storage;
}

const stats = (over: Partial<StatBlock> = {}): StatBlock => ({
  hp: 25, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 6, res: 3, bld: 6, ...over,
});

const unit = (over: Partial<BoardUnitProp> & Pick<BoardUnitProp, "x" | "y" | "force">): BoardUnitProp => ({
  // 초기 배치 그룹은 CreateFirst가 부르는 것뿐 — 임의 이름을 쓰면 유닛이 판에 서지 않는다(boardStore INITIAL_GROUPS).
  group: over.force === 0 ? "Player" : "Enemy",
  pid: `PID_${over.x},${over.y}`,
  jid: "JID_test",
  abbr: "U",
  name: `unit-${over.x},${over.y}`,
  job: "job",
  ring: "#000",
  chip: "#111",
  movePoints: 4,
  moveType: "foot",
  rangeMin: 1,
  rangeMax: 1,
  stats: { n: stats(), h: stats(), l: stats() },
  weapons: [{
    name: "sword", might: 8, hit: 90, crit: 5, weight: 5, avoid: 0,
    magic: false, rangeMin: 1, rangeMax: 1, kind: 1,
  }],
  levels: { n: 5, h: 5, l: 5 },
  internalLevel: 0,
  growth: stats({ hp: 60, str: 50, mag: 10, dex: 50, spd: 50, lck: 40, def: 40, res: 20, bld: 10 }),
  cap: stats({ hp: 60, str: 30, mag: 20, dex: 30, spd: 30, lck: 30, def: 30, res: 30, bld: 20 }),
  maxLevel: 20,
  ...over,
});

const LABELS: BoardProps["labels"] = {
  board: "", forecast: "", hit: "", crit: "", damage: "", currentPosNote: "", difficulty: "",
  diffNames: { n: "n", h: "h", l: "l" },
  forceNames: ["player", "enemy", "ally"],
  endPhase: "", waitCmd: "", attackCmd: "", staffCmd: "", itemCmd: "", engageCmd: "", tradeCmd: "", closeCmd: "", turnPhase: "", turnWord: "",
  victory: "", defeat: "", reset: "", replayCmd: "", replayPrev: "", replayNext: "", replayPrevPhase: "", replayNextPhase: "", zoomIn: "", zoomOut: "", undoCmd: "", copyRecord: "", copied: "",
  editCmd: "", editExit: "", editHint: "", removeCmd: "", restoreCmd: "",
  saves: { save: "", list: "", empty: "", drop: "", copy: "", saved: "", joined: "", steps: "", hint: "" },
  itemStats: { atk: "물공", hit: "명중", crit: "필살", spd: "속도", avo: "회피", dodge: "필살 회피", rng: "사정" },
  commands: {
    engage: { label: "인게이지" }, engageArt: { label: "인게이지 기술" }, attack: { label: "공격" },
    staff: { label: "지팡이" }, dance: { label: "춤추기" }, guard: { label: "체인 가드" },
    destroy: { label: "파괴" }, visit: { label: "방문" }, item: { label: "소지품" },
    trade: { label: "소지품 교환" }, wait: { label: "대기" },
  },
  warpPick: "", guardCmd: "", destroyCmd: "", enemyAuto: "", enemyAutoBlocked: "", dangerAll: "",
  replayOn: "", replayOff: "", unitTurn: "", prevUnit: "", nextUnit: "", nextTurn: "",
  logTags: { chain: "", counter: "", follow: "", extra: "", miss: "", brk: "", kill: "", crit: "", refresh: "", engage: "", disengage: "", warp: "", guard: "", spawn: "", join: "", despawn: "" },
};

/** 6x6 평지, 자군 u0(1,1) · 적군 u1(2,1) 인접 — 이동·대기·공격·페이즈 종료가 전부 합법인 최소 판. */
export function boardFixture(mapId = "m999"): BoardProps {
  const size = 6;
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => 1));
  return {
    mapId,
    title: { prefix: "Chapter 999", name: "fixture", place: "nowhere" },
    width: size,
    height: size,
    palette: [{ tid: "TID_平地", color: "#000", name: "plain", blocked: false, avoid: 0, def: 0, cost: { foot: 1 } }],
    tiles: Array.from({ length: size }, () => Array.from({ length: size }, () => 0)),
    objects: [],
    crestName: "문장의 기운",
    units: [unit({ x: 1, y: 1, force: 0 }), unit({ x: 2, y: 1, force: 1 })],
    labels: LABELS,
  };
}

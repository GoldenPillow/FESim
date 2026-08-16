import type { StepAddress } from "@fesim/engine";
import type { Difficulty } from "@fesim/shared";

/**
 * URL 질의 ↔ 파라미터 박막 — 맵 페이지(?p 국면 · ?d 난이도)와 공유 열람(?t/p/a 주소)이 같은 코덱을 쓴다.
 * 같은 키 `p`가 두 라우트에서 다른 뜻(국면 id · 군 이름)인 것은 의도된 분리다 — 함수가 경계를 소유한다.
 */

const DIFFICULTIES: readonly string[] = ["n", "h", "l"];
const PHASE_NAMES: readonly string[] = ["player", "enemy", "ally"];

export interface MapQuery {
  /** 국면 id(phases.ts의 PhaseDef.id) */
  p?: string;
  d?: Difficulty;
}

const toParams = (search: string | URLSearchParams): URLSearchParams =>
  typeof search === "string" ? new URLSearchParams(search) : new URLSearchParams(search);

/** 값이 undefined면 키를 지운다 — 다른 질의(로케일 등)는 보존한다. */
function put(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value === undefined) params.delete(key);
  else params.set(key, value);
}

const format = (params: URLSearchParams): string => {
  const s = params.toString();
  return s === "" ? "" : `?${s}`;
};

export function readMapQuery(search: string | URLSearchParams): MapQuery {
  const params = toParams(search);
  const p = params.get("p") ?? undefined;
  const d = params.get("d") ?? undefined;
  return { p, d: d !== undefined && DIFFICULTIES.includes(d) ? (d as Difficulty) : undefined };
}

export function writeMapQuery(search: string | URLSearchParams, query: MapQuery): string {
  const params = toParams(search);
  put(params, "p", query.p);
  put(params, "d", query.d);
  return format(params);
}

/** t·p가 모두 유효할 때만 주소가 성립한다(a 생략 = 페이즈 개시). */
export function readAddress(search: string | URLSearchParams): StepAddress | undefined {
  const params = toParams(search);
  const t = Number(params.get("t"));
  const p = params.get("p") ?? "";
  if (!Number.isInteger(t) || t < 1 || !PHASE_NAMES.includes(p)) return undefined;
  const a = Number(params.get("a") ?? 0);
  return { t, p: p as StepAddress["p"], a: Number.isInteger(a) && a > 0 ? a : 0 };
}

export function writeAddress(search: string | URLSearchParams, address: StepAddress): string {
  const params = toParams(search);
  put(params, "t", String(address.t));
  put(params, "p", address.p);
  put(params, "a", address.a > 0 ? String(address.a) : undefined);
  return format(params);
}

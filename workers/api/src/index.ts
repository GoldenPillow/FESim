import { parseEphemeris, type EphemerisFile } from "@fesim/shared";

/**
 * 공유 링크(/s/{id})의 계약 — **타입이 정본**이다(산문 명세 이중화 금지).
 * 순수 로직만 담는다: 라우트(Astro)는 이 함수들을 배선하는 박막이고, 런타임 타입은
 * 구조적 최소 인터페이스로 받는다(@cloudflare/workers-types 의존 없이 워커·노드 테스트가 같은 코드를 돈다).
 */

/** base62 링크 id. **발급기는 M4** — M3는 검증·정규화만 한다(수동 등재 = ./dev link:put). */
const LINK_ID = /^[0-9A-Za-z]+$/;
export const LINK_ID_MIN = 5;
export const LINK_ID_MAX = 12;

export const isLinkId = (v: unknown): v is string =>
  typeof v === "string" && v.length >= LINK_ID_MIN && v.length <= LINK_ID_MAX && LINK_ID.test(v);

/**
 * 주소에서 온 문자열을 id로 좁힌다. 공백만 털고 그 외 교정은 하지 않는다 —
 * ☠오탈자를 조용히 성공시키면 남의 기보를 열어주는 셈이다(대소문자도 구별한다: base62).
 */
export function normalizeLinkId(raw: string | undefined | null): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const id = raw.trim();
  return isLinkId(id) ? id : undefined;
}

/** KV 키 = id 그대로(네임스페이스 자체가 링크 전용). ./dev link:put이 같은 규칙으로 쓴다. */
export const linkKey = (id: string): string => id;

/** KV 레코드 = serializeEphemeris 문자열 **그대로**. 파싱은 shared의 parseEphemeris 하나만 쓴다(신뢰 경계 단일화). */
export interface LinkStore {
  get(key: string): Promise<string | null>;
}

export type LinkFailure = "invalid-id" | "not-found" | "corrupt";

export type LinkLookup =
  | { ok: true; id: string; file: EphemerisFile }
  | { ok: false; reason: LinkFailure; message?: string };

/** id 검증 → KV 조회 → 파싱. 불량 id는 KV를 건드리지도 않는다(무료 읽기 한도가 곧 비용). */
export async function getReplay(store: LinkStore, rawId: string | undefined | null): Promise<LinkLookup> {
  const id = normalizeLinkId(rawId);
  if (id === undefined) return { ok: false, reason: "invalid-id" };
  const text = await store.get(linkKey(id));
  if (text === null || text === undefined) return { ok: false, reason: "not-found" };
  try {
    return { ok: true, id, file: parseEphemeris(text) };
  } catch (e) {
    return { ok: false, reason: "corrupt", message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 실패 사유 → HTTP 상태. 형식 불량 id도 "그런 링크는 없다"이므로 404,
 * 400은 레코드가 있는데 읽을 수 없을 때만 쓴다(우리 쪽 저장물이 깨진 상태 = 구분해서 보여야 고칠 수 있다).
 */
export const statusFor = (reason: LinkFailure): number => (reason === "corrupt" ? 400 : 404);

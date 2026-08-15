/**
 * ephemeris(.eph) 기보 포맷 헤더 — 타이틀 중립 원칙:
 * 게임ID(fe17 등)와 룰 버전이 네임스페이스라서, 엔진이 시리즈 확장돼도 기보가 충돌하지 않는다.
 * 스키마의 정본은 이 타입이다(산문 명세 이중화 금지). 본문 스키마는 M3(리플레이)에서 채운다.
 */
export interface EphemerisHeader {
  game: string;
  ruleVersion: string;
}

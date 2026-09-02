import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 클라이언트 아일랜드 ↔ lib/fe17 경계 관통 테스트.
 *
 * ☠왜 위험한가: fe17.ts는 모듈 최상단에서 import.meta.glob(eager)로 데이터 전량(약 12MB — persons·skills·
 * 전 챕터 맵·전 Lua 스크립트)을 인라인한다. 클라이언트 모듈이 거기서 **값 하나라도** 런타임 import하면
 * 트리셰이킹이 그 부수효과를 못 걷어내 아일랜드 청크에 통째로 실린다(2026-09-02 실측: rankValue 2줄
 * import 하나로 BuilderIsland 청크 10.7MB / 전송 688KB, 모바일 4G TTI 3.6~4.2s). 빌드 크기 게이트가
 * 없으니 오류도 경고도 없이 조용히 굳는다 — 여기서 잡는다.
 *
 * 규칙: src/features/** 와 src/components/*Island.tsx 에서 lib/fe17 import는 `import type`만 허용.
 */
const SRC = join(__dirname, "..", "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });

const clientModules = [
  ...walk(join(SRC, "features")),
  ...readdirSync(join(SRC, "components"))
    .filter((n) => /Island\.tsx$/.test(n))
    .map((n) => join(SRC, "components", n)),
];

const runtimeFe17Imports = (source: string): string[] =>
  // 본문에 from이 없어야 한다 — 앞선 import 문을 건너뛰어 붙는 오탐을 막는다.
  [...source.matchAll(/import\s+((?:(?!\bfrom\b)[\s\S])*?)\s+from\s+["'][^"']*\/lib\/fe17["']/g)]
    .map((m) => m[0])
    .filter((stmt) => !/^import\s+type\b/.test(stmt));

describe("client seam — lib/fe17 is type-only for islands", () => {
  it("scans real client modules", () => {
    expect(clientModules.length).toBeGreaterThan(0);
  });

  for (const file of clientModules) {
    it(`${file.slice(SRC.length + 1)} has no runtime import from lib/fe17`, () => {
      expect(runtimeFe17Imports(readFileSync(file, "utf8"))).toEqual([]);
    });
  }
});

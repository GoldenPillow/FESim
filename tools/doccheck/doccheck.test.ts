import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const DESIGN = join(ROOT, "design");

function designDocs(): string[] {
  if (!existsSync(DESIGN)) return [];
  return readdirSync(DESIGN).filter((f) => f.endsWith(".md"));
}

function frontmatterOf(file: string): Record<string, string> | null {
  const lines = readFileSync(join(DESIGN, file), "utf8").split("\n");
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.slice(1).findIndex((l) => l.trim() === "---");
  if (end < 0) return null;
  const fm: Record<string, string> = {};
  for (const line of lines.slice(1, end + 1)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}

describe("문서 수명 규칙 (design/)", () => {
  it("frontmatter 없는 design/ 문서 금지 — 수명 미상 문서는 레드", () => {
    const missing = designDocs().filter((f) => frontmatterOf(f) === null);
    expect(missing, `frontmatter(---) 블록이 없는 문서: ${missing.join(", ")}`).toEqual([]);
  });

  it("status는 draft|building|done 중 하나 — 그 외는 레드", () => {
    const invalid = designDocs().filter((f) => {
      const fm = frontmatterOf(f);
      return fm !== null && !["draft", "building", "done"].includes(fm.status ?? "");
    });
    expect(invalid, `status가 draft|building|done이 아닌 문서: ${invalid.join(", ")}`).toEqual([]);
  });

  it("status: done 문서가 design/에 남아 있으면 레드 — ./dev gc로 archive/ 이송", () => {
    const dead = designDocs().filter((f) => frontmatterOf(f)?.status === "done");
    expect(dead, `구현 완료(done)인데 design/에 방치된 문서: ${dead.join(", ")}`).toEqual([]);
  });
});

describe("워크스페이스 정의 단일성", () => {
  /**
   * 루트 외의 pnpm-workspace.yaml 금지 — astro add가 apps/web에 allowBuilds만 담긴
   * 파일을 생성하면, CF 빌드의 `pnpm -C apps/web`이 그걸 워크스페이스 루트로 오인해
   * "packages field missing or empty"로 배포가 전부 깨진다(2026-08-16 실제 장애).
   */
  it("pnpm-workspace.yaml은 저장소 루트에만 존재한다", () => {
    const nested: string[] = [];
    const scan = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) scan(p);
        else if (e.name === "pnpm-workspace.yaml" && p !== join(ROOT, "pnpm-workspace.yaml"))
          nested.push(p);
      }
    };
    scan(ROOT);
    expect(nested, `루트 밖 pnpm-workspace.yaml: ${nested.join(", ")} — 내용을 루트로 옮기고 삭제하라`).toEqual([]);
  });
});

describe("배선 정합", () => {
  const claudeMd = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");

  /** 죽은 포인터는 콜드스타트를 끊는다(2026-08-16 감사에서 islands/ 배선 깨짐 실증). */
  it("CLAUDE.md가 가리키는 저장소 경로는 실재한다 — 미래 예정(M3~) 표기만 예외", () => {
    const missing: string[] = [];
    for (const line of claudeMd.split("\n")) {
      for (const m of line.matchAll(/(?<![\w/~])(?:apps|packages|tools|data|design|rules|registers|workers)\/[\w./[\]-]*/g)) {
        const token = m[0].replace(/[.,]+$/, "");
        if (token.startsWith("workers/") && line.includes("M3~")) continue;
        if (!existsSync(join(ROOT, token))) missing.push(token);
      }
    }
    expect([...new Set(missing)], `실재하지 않는 경로: ${[...new Set(missing)].join(", ")}`).toEqual([]);
  });

  it("rules/*.md는 전부 CLAUDE.md에 배선된다 — 고아 규약 금지", () => {
    const orphans = readdirSync(join(ROOT, "rules"))
      .filter((f) => f.endsWith(".md") && !claudeMd.includes(`rules/${f}`));
    expect(orphans, `CLAUDE.md에 배선 안 된 규약: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("CLAUDE.md 비대화 차단", () => {
  it("CLAUDE.md는 100줄 이하 — 초과는 레드", () => {
    const lines = readFileSync(join(ROOT, "CLAUDE.md"), "utf8").trimEnd().split("\n").length;
    expect(lines, `CLAUDE.md가 ${lines}줄 — 상한 100줄`).toBeLessThanOrEqual(100);
  });
});

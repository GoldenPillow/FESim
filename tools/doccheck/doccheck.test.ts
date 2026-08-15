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

describe("CLAUDE.md 비대화 차단", () => {
  it("CLAUDE.md는 100줄 이하 — 초과는 레드", () => {
    const lines = readFileSync(join(ROOT, "CLAUDE.md"), "utf8").trimEnd().split("\n").length;
    expect(lines, `CLAUDE.md가 ${lines}줄 — 상한 100줄`).toBeLessThanOrEqual(100);
  });
});

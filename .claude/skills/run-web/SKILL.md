---
name: run-web
description: FESim apps/web을 헤드리스로 구동·조작·스크린샷하는 검증 절차. 보드 인터랙션(선택·호버 교전·힐)을 실브라우저로 실측할 때 사용. dev 서버 기동, playwright-core 드라이버, 타일 좌표 셀렉터, 함정(하이드레이션 404·dev 툴바) 포함.
---

# run-web — 헤드리스 실측 (2026-08-18 실증 절차)

## 1. dev 서버

```bash
cd apps/web && pnpm exec astro dev --background   # 실패 시 한 번 더 (첫 시도가 종종 죽는다)
timeout 40 bash -c 'until curl -sf http://localhost:4321/ko/fe17/maps/m002 >/dev/null; do sleep 1; done'
# 종료: pnpm exec astro dev stop
```

☠**함정: vite 의존성 최적화 404** — 엔진/스토어 코드를 고친 뒤 기존 서버가 살아 있으면
`/.vite/deps/zustand_*.js` 404로 **아일랜드 하이드레이션이 통째로 죽는다**(클릭 무반응, 에러 0).
증상이 보이면 서버 재기동이 정답.

## 2. 브라우저 — playwright-core + 캐시 브라우저 (다운로드 불요)

```bash
cd <스크래치> && npm i playwright-core --no-audit
# 실행 파일: ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell
```

드라이버 뼈대 (mjs):

```js
import { chromium } from "playwright-core";
const exe = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1300, height: 950 } })).newPage();
page.on("pageerror", (e) => console.log("ERR", String(e)));
await page.goto("http://localhost:4321/ko/fe17/maps/m002", { waitUntil: "networkidle" });
await page.evaluate(() => document.querySelector("astro-dev-toolbar")?.remove()); // ☠툴바가 하단 클릭 가로챔
```

## 3. 보드 조작 문법

- **타일 셀렉터 = 좌표 라벨**: `i.tile[title^="2,4 "]` — 타일 title이 `x,y 지형명`이다.
  ★표기 정본 = **인게임 (X, Z) 그대로**(2026-08-18 교체 — 종전 체스식 `C5`는 폐기).
  스크립트가 `pos(7,4)`로 말하는 그 수와 같다. 화면 방향은 그대로: 데이터 (0,0) = 좌하단.
  칸마다 흐린 회색으로 좌표가 찍혀 있으므로 스크린샷만으로도 자리를 읽을 수 있다.
  유닛 클릭도 그 좌표의 타일을 클릭한다(유닛 레이어는 클릭 불가).
- ☠**호버 선행 필수**: 교전·힐은 호버가 발판(engageAt)을 정한 뒤 클릭이 확정한다 —
  `page.click`만 하면 React 상태가 늦어 커밋이 안 된다. `hover → waitForTimeout(200) → click` 순서.
- **커밋은 플레이트 버튼**: 공격 = `.forecast .fc-go`, 힐 = `.forecast.heal .fc-go`
  (타일 재클릭은 오버레이에 가려질 수 있다).
- **난수 고정**: `await page.evaluate(() => { Math.random = () => 0.3; })` — 명중·비필살 결정화.
  0.3 = 쌍방 명중, 브레이크 회피는 상성 중립 유닛으로(검→도끼는 브레이크로 반격 몰수).
- 검증 포인트: `.battle-log` innerText · `.forecast.heal` innerText · `.ov.move/.ov.atk/.ov.sta` count.

## 4. m002 기준 좌표 (인게임 (X, Z))

뤼에르 3,3 · 반드레 2,3 · 클란 2,2 · 프랑 2,4(체술+ライブ) · 적 6,3 / 8,2 · 루미엘 10,3.
손상 만들기 = 반드레로 6,3 공격(반격 9 피해) → 프랑 2,4 선택 → 5,3(전진한 반드레) 호버 = 힐 예보.

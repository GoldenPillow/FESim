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

- **타일 셀렉터 = 인게임 좌표**: `i.tile[title*="(2,4) "]` — 타일 title이 `A1 · (x,y) 지형명`이다
  (2026-08-18 표기 변경: **화면 라벨은 세로 A·가로 1의 `A1`식**이고 인게임 (X, Z)는 툴팁에만 남는다).
  셀렉터는 괄호 좌표로 잡아라 — 스크립트가 `pos(7,4)`로 말하는 그 수와 같다.
  칸마다 흰 글씨로 `A1`이 찍혀 있으므로 스크린샷만으로도 자리를 읽을 수 있다(화면 (0,0) = 좌하단 = A1).
  유닛 클릭도 그 좌표의 타일을 클릭한다(유닛 레이어는 클릭 불가).
- ☠**맵 페이지는 기본이 재생 모드다**(기본 기보 자동 로드) — `REPLAY` 버튼을 누르면 **끄는** 것이다.
  스텝은 그냥 `›` 클릭부터 시작하면 된다. 버튼은 role 셀렉터 대신 텍스트 매칭으로 찾는 편이 안정적이다:
  `page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === "›")?.click())`.
- **전투 예보는 돌입 전에 뜬다**(재생) — 다음 스텝이 `attack`이면 `.forecast`가 서고, 스텝을 넘기면
  타격 표(`.board .strike`)로 바뀐다. 대미지 표는 **맞은 쪽에만** 선다(자군 왼편·적 오른편).
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

## 5. WebKit(사파리 엔진) 검증 — iOS 실기 버그 재현용 (2026-09-01 구축)

Chromium만 믿으면 못 보는 결함이 있다(실사고: WebKit은 tbody `position:relative`를 무시해
빌더 잠금 ::after가 페이지 전체를 덮었다). 모바일/사파리 의심 버그는 WebKit으로 재현하라.

```bash
cd <스크래치> && node node_modules/playwright-core/cli.js install webkit   # sudo 불필요
# 시스템 라이브러리 결손은 sudo 없이 로컬 추출로 채운다:
mkdir wklibs && cd wklibs && apt-get download libxslt1.1 libevent-2.1-7t64 \
  libgstreamer-plugins-base1.0-0 libgstreamer-plugins-bad1.0-0 libgstreamer-gl1.0-0 \
  libgstreamer1.0-0 libavif16 libharfbuzz-icu0 libwayland-server0 libmanette-0.2-0 \
  libenchant-2-2 libhyphen0 libsecret-1-0 libgraphene-1.0-0 liborc-0.4-0t64 \
  libgudev-1.0-0 libgav1-1 libyuv0 libabsl20220623t64
for d in *.deb; do dpkg -x "$d" ext/; done
# ☠래퍼(minibrowser-wpe/MiniBrowser)가 LD_LIBRARY_PATH를 덮어쓰므로 번들 sys/lib에 심링크:
D=~/.cache/ms-playwright/webkit-*/minibrowser-wpe/sys/lib; mkdir -p $D
for f in $PWD/ext/usr/lib/x86_64-linux-gnu/*.so*; do b=$(basename $f); [ -e $D/$b ] || ln -s $f $D/$b; done
# 남은 결손 확인: LD_LIBRARY_PATH=$WK/lib:$WK/sys/lib ldd $WK/bin/MiniBrowser | grep "not found"
```

실행은 `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` + `import { webkit } from "playwright-core"` —
`webkit.launch({ headless: true })` (WPE 빌드라 headless 전용, HTTPS 원격은 TLS 미탑재로 실패 → 로컬만).
터치 재현 = `newContext({ viewport, hasTouch: true })` + `page.touchscreen.tap(x, y)`.

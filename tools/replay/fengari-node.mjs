/**
 * `fengari-web` 헤드리스 대역 — 기보 생성기 전용 alias 타깃.
 *
 * 엔진은 브라우저 배포를 위해 `fengari-web`(webpack UMD 번들)을 임포트한다. Node에서는
 * (1) 그 번들이 named export로 안 열리고 (2) DOM 전제 코드가 섞여 있다.
 * 코어 `fengari`는 같은 Lua C API 표면을 CJS로 내보내므로 여기서 그대로 되쏜다 —
 * ☠표면이 갈리면 도구가 만든 기보와 브라우저 재생이 어긋나므로, 필요한 이름만 명시 재수출한다.
 */
import { createRequire } from "node:module";

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = createRequire(import.meta.url)("fengari");

export { lua, lauxlib, lualib, to_luastring, to_jsstring };

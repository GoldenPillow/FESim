/**
 * fengari-web 0.1.4 — 타입 미제공 패키지의 최소 선언. C API 미러라 시그니처가 방대해
 * 엔진이 실제로 만지는 표면만 좁게 선언한다(그 밖은 luaBridge가 감싼다 — 직접 소비 금지).
 */
declare module "fengari-web" {
  export type LuaState = unknown;
  export const lua: {
    LUA_REGISTRYINDEX: number;
    LUA_OK: number;
    LUA_YIELD: number;
    LUA_TNIL: number;
    LUA_TBOOLEAN: number;
    LUA_TNUMBER: number;
    LUA_TSTRING: number;
    LUA_TFUNCTION: number;
    lua_gettop(L: LuaState): number;
    lua_settop(L: LuaState, n: number): void;
    lua_pop(L: LuaState, n: number): void;
    lua_type(L: LuaState, idx: number): number;
    lua_tonumber(L: LuaState, idx: number): number;
    lua_tointeger(L: LuaState, idx: number): number;
    lua_toboolean(L: LuaState, idx: number): boolean;
    lua_tostring(L: LuaState, idx: number): unknown;
    lua_pushnil(L: LuaState): void;
    lua_pushinteger(L: LuaState, n: number): void;
    lua_pushnumber(L: LuaState, n: number): void;
    lua_pushboolean(L: LuaState, b: boolean): void;
    lua_pushstring(L: LuaState, s: unknown): void;
    lua_pushvalue(L: LuaState, idx: number): void;
    lua_pushjsfunction(L: LuaState, fn: (L: LuaState) => number): void;
    lua_setglobal(L: LuaState, name: unknown): void;
    lua_getglobal(L: LuaState, name: unknown): number;
    lua_rawgeti(L: LuaState, idx: number, n: number): number;
    lua_pcall(L: LuaState, nargs: number, nresults: number, msgh: number): number;
    lua_newthread(L: LuaState): LuaState;
    lua_resume(co: LuaState, from: LuaState | null, nargs: number): number;
    lua_status(co: LuaState): number;
    lua_xmove(from: LuaState, to: LuaState, n: number): void;
  };
  export const lauxlib: {
    luaL_newstate(): LuaState;
    luaL_loadstring(L: LuaState, s: unknown): number;
    luaL_ref(L: LuaState, t: number): number;
    luaL_unref(L: LuaState, t: number, ref: number): void;
    /** Lua 오류를 올린다(복귀 없음) — 네이티브가 정직 거부할 때. 반환형은 호출부 return용. */
    luaL_error(L: LuaState, msg: unknown): number;
  };
  export const lualib: {
    luaL_openlibs(L: LuaState): void;
  };
  export function to_luastring(s: string): unknown;
  export function to_jsstring(v: unknown): string;
}

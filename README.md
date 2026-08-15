# FESim

**FE Strategy Simulator** — a web platform for building, exploring, and sharing Fire Emblem
chapter strategies, turn by turn. Think lichess study/analysis board, translated to FE:
set up a position, craft a line, share it with a single link.

- **Interactive replays** — step through player/enemy phases, inspect any unit's stats at any point
- **Strategy sandbox** — build loadouts, place units, experiment with orders
- **Zero gate** — view, create, and share without an account; social login is an optional upgrade
- **Title-neutral core** — Engage (`fe17`) first, engine designed for the whole series

## Stack

Astro 5 (SSG) + React islands + Tailwind v4 + TypeScript strict + Zustand/Immer,
pnpm workspaces, Vitest. Rule engine is a pure-function TS library (`packages/engine`).

## Development

```bash
pnpm install
./dev check   # typecheck
./dev test    # all tests
./dev done    # release gate: typecheck + test + doccheck
./dev gc      # archive implemented design docs
```

## Disclaimer

FESim is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by
Nintendo or Intelligent Systems. Fire Emblem and all associated names are trademarks of their
respective owners. This project is non-commercial, ad-free, and does not redistribute original
game assets or ROM contents — only derived, transformed data.

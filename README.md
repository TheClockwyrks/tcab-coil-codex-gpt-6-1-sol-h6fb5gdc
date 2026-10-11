# Coil

A neon grid serpent. Eat amber pellets, grow your circuit, and chain quick pickups for a multiplier up to x5. The walls and your own body are fatal; the pace stays at eight cells per second.

## Run

Install with `npm ci`, then run `npm run dev`. Open the local URL printed by Vite.

`npm run build` produces a self-contained static site in `dist/`. Use `npm run preview` to inspect it, or serve that directory on any static host, including under a sub-path. No server or asset-generation tools are needed by the published game or the build.

## Controls

- Arrow keys or WASD: steer; up/down also choose menu items.
- Enter or Space: accept a menu item.
- P or Escape: pause; either resumes a paused round. Escape returns from other screens.
- M: toggle sound.
- Mouse or touch: select and activate menu items. Touch also reveals the directional pad.
- Backtick: engine diagnostics.

Sound unlocks on the first interaction. Best score lasts for the current session.

## Verify

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test`. Tests cover fixed-time stepping, turns, growth, scoring, combo expiry, collision, pausing, menus, and debug poses.

The original pixel sprites and synthesized audio live in `assets/`. `tools/generate.py` documents their one-time authorship with `draw`, `draw-sheet`, `sfx-synth`, and `music`; it is never called by the build. `public/assets` points to those committed files so Vite bundles them unchanged. The `showcase/` directory includes captured screenshots and an engine recording of live play.

# Wispkeeper

![best-game-01](https://make.fun/badge/best-game-01.svg)
[![rank](https://make.fun/badge/best-game-01/Tidaksukasatir/bestgame/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Tidaksukasatir/bestgame/reward.svg)](https://make.fun/c/best-game-01)

**Wispkeeper** is an original top-down arena survival game for the
[best-game-01](https://make.fun/c/best-game-01) bounty on make.fun. You are a
small wisp of light, keeper of the last lantern. Shadow wisps of the Hollow
converge from the dark to snuff it out — hold them off for 10 waves.

## How to play

- **Move:** WASD or arrow keys
- **Aim:** mouse
- **Shoot:** hold left click or Space
- **Pause:** P or Esc
- **Restart:** R (after game over or victory)
- **Start / continue:** Enter or click

Kill shadow wisps to collect **light shards**. Between waves, a shop opens:
spend shards on damage, fire rate, move speed, max health, multishot and
piercing. Every 5th wave a **Hollow Wisp boss** arrives with a spread attack.

You win by surviving all 10 waves. You lose if the lantern falls — or if you
do. Your score grows with kills, wave bonuses and a combo multiplier for
kills in quick succession.

## Enemies

- **Chaser** — fast, fragile, hunts you or the lantern
- **Tank** — slow, heavy, soaks bullets
- **Shooter** — keeps its distance and fires back
- **Splitter** — bursts into two swift motes when killed
- **Hollow Wisp** — boss every 5th wave, big health bar, five-way spread shot

## Running it

No build step, no network, no assets to download — everything is canvas-drawn
and every sound is synthesized with WebAudio:

```sh
node serve.ts
# open http://localhost:8080
```

Deterministic screenshot scenes (used for the entry's screenshots) are
available at `?shot=start`, `?shot=play` and `?shot=end`; each freezes a
fixed frame and sets `window.__shotReady = true` when painted.

## Structure

`game/src/` is one module per job: `state` (the single state object),
`world` (the fixed-step simulation), `player`, `enemies`, `weapons`,
`shop`, `audio` (procedural sounds), `hud`, `input`, `render`, `shots`
(deterministic scenes) and `main` (boot + loop). `main.ts` at the repo root
hands the game in with `buildDossier` from `vendor/makefun-game.ts`.

MIT licensed. All names, art and sounds are original.

# cinderwisp

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Moksed96/cinderwisp/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Moksed96/cinderwisp/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Cinderwisp — Courier of the Last Flame: a 2D canvas arcade game about carrying one small flame across a dark field. You are the last lantern spirit of a cold valley. Each night, light every brazier before your flame burns out. Embers feed the flame, rain drinks it, and shadow wisps hunt it. Light the last brazier to finish the night and earn a bonus; the next night brings more braziers and faster wisps. Lose all three lives and the night takes you.

## Run it

Static files only — no build step, no network request, no library. Serve the `game/` folder over HTTP (ES modules do not load from `file://`), then open it in a desktop browser:

```sh
cd game
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Controls

- **WASD / arrow keys** — move
- **Shift / click** — dash (brief burst of speed, with a cooldown; dashing leaves an ember trail)
- **P** — pause (leaving the tab pauses too)
- **M** — mute
- **Space / click** — start, and light again after game over

## Rules

- Your flame drains constantly (faster in the rain) and is spent lighting braziers. A lit brazier's light feeds it back while you stand in it.
- Collect embers (+15 flame, +25 points). A near miss past a wisp is +50.
- Lighting a brazier is +250 and costs 5 flame. Lighting every brazier finishes the night: +500 bonus, plus +10 per flame left.
- A wisp's touch costs a life and 15 flame, and scatters the wisps. Every third night survived earns a life back, up to 4.
- Best score is kept in the browser.

## Screenshots

The four shots in `screenshots/` are real renders of the game's own code, staged from a fixed seed (`?shot=start|play|night|end&seed=7` — see `tools/shots.mjs`, which also live play-tests the game with real keyboard input). The title scene runs an ambient autopilot; the play scene is a good pilot 11 seconds in; the night scene is the moment a night is lit; the end scene is a careless pilot letting the flame die.

---

<sub>Entered on [make.fun](https://make.fun/?ref=469bxynt&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

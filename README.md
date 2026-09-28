# Challenge Games

Plain JavaScript browser games — open the hub and play. No install, no build step.

## Play

Open [`index.html`](./index.html) in any browser for the game catalog, or open a game file directly.

```bash
git clone https://github.com/rfelsberg29-rgb/rfrepo26.git
open index.html
# or serve the folder:
python3 -m http.server 8000
```

## Games

### Rift Hockey
Knock hockey with a twist: **side rifts teleport the puck**, and a **center vortex** can yank it mid-rally. Play vs AI or local 2-player.

Open [`rifthockey.html`](./rifthockey.html).

**Controls**
- **You (bottom):** mouse / touch, or `A` `D` · charge smash with click / `Space`
- **Player 2 (top):** `←` `→` · smash with `Shift`
- First to **5** wins

### Night Sprint — Racing
Lane-dodge racer: weave through traffic, build speed, beat your best distance.

Open [`racing.html`](./racing.html).

**Controls**
- Desktop: `←` `→` or `A` `D`
- Mobile: on-screen pads
- Crash ends the run — score is distance driven

### Curveball — Hangman
Hangman with a sports twist. Guess letters across **Sports**, **Movies**, and **Fun Stuff** before you rack up six strikes.

Open [`hangman.html`](./hangman.html).

**How to play**
- Guess letters with the on-screen keyboard or your physical keyboard
- Six wrong guesses = strikeout
- **Throw Curveball** once per round to reveal a random hidden letter
- Categories rotate: stadium sports, movie titles, and fun stuff
- Track your streak and wins across rounds

## What’s inside

| File | What it is |
|------|------------|
| `index.html` | Challenge Games hub / catalog |
| `rifthockey.html` | Rift Hockey (HTML + CSS + JavaScript) |
| `racing.html` | Night Sprint racing (HTML + CSS + JavaScript) |
| `hangman.html` | Curveball Hangman (HTML + CSS + JavaScript) |
| `LICENSE` | MIT |

## Built with

- Plain HTML, CSS, and JavaScript
- No frameworks or dependencies

## License

MIT — see [LICENSE](./LICENSE).

# Exercise Program

A browser-based workout timer app designed to be used on a phone via VS Code Live Server. Supports multiple training programs with audio cues, speech synthesis, and session resumption.

## Features

- **Multiple training programs** — choose a program before starting; the active program is remembered via a cookie
- **Audio cues** — bell sounds and spoken exercise names using the Web Speech API
- **Session resumption** — progress is saved to cookies so you can close the browser and continue where you left off
- **Screen wake lock** — prevents the screen from sleeping during a workout
- **Upcoming exercises** — shows the next few exercises while the timer is running
- **Exercise list** — full list of exercises and durations shown on the start screen
- **Responsive layout** — media query adjustments for small viewports (e.g. iPhone 12 mini)

## Project Structure

| File | Purpose |
|---|---|
| `index.html` | App shell, all CSS styles |
| `app.js` | Timer logic, state management, audio, speech, cookies |
| `programs.js` | Master data — all training programs and their exercises |
| `eslint.config.js` | ESLint configuration |

## Adding a Program

Open `programs.js` and add a new object to the `programs` array:

```js
{
  id: 'my-program',        // unique string, stored in cookie
  title: 'My Program',     // displayed in the picker and workout header
  exercises: [
    { exercise: 'Get ready', duration: 15 },
    { exercise: 'Squat',     duration: 45 },
    // ...
  ],
}
```

`duration` is in seconds. The program will appear automatically on the selection screen.

## Running Locally

Open `index.html` with VS Code Live Server (default port 5500):

```
http://localhost:5500
```

To access from a phone on the same Wi-Fi network:

```
http://<your-local-ip>:5500
```

Find your local IP with:

```bash
ipconfig getifaddr en0
```

## GitHub Pages

The app is published at:

```
https://peterwake.github.io/exercise/
```

To publish your own fork:

1. Fork this repository on GitHub
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose `main` (or `master`) and `/ (root)`, then click **Save**
5. Your site will be available at `https://<your-username>.github.io/exercise/`

All file references in the app use relative paths, so it works on any GitHub Pages subdirectory without modification.

## Linting

```bash
npx eslint app.js programs.js
```

---

For AI agent instructions, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md).


# Copilot Instructions

## Architecture

- This is a **vanilla JS, no-build, no-framework** app. Do not introduce bundlers, npm runtime dependencies, or ES module imports between files — all scripts are loaded via `<script src="...">` tags in order: `programs.js` then `app.js`.
- All styles live in the `<style>` block inside `index.html`. There is no external stylesheet.
- `programs.js` declares a single global `const programs` array. `app.js` reads it at runtime.
- `app.js` uses `let exercises = []` which is populated at runtime from the selected program. Do not convert this back to a static top-level declaration.

## Data

- All exercise programs live in `programs.js`. Each program has `id` (string), `title` (string), and `exercises` (array of `{ exercise: string, duration: number }` where duration is **seconds as a number**, not a string).
- Do not use `.slice()` or string methods on `duration` — use `formatTime(duration)` to display it.

## Cookies

Three cookies are in use:

| Cookie | Purpose | Expiry |
|---|---|---|
| `activeProgram` | ID of the selected program | 1 year |
| `exerciseIndex` | Index of the current exercise (for resume) | 24 hours |
| `totalElapsed` | Total elapsed seconds (for resume) | 24 hours |

## State

Key state variables in `app.js`:

- `exercises` — active exercise array (set by `selectProgram`)
- `currentExerciseIndex` — zero-based index into `exercises`
- `isStarted` — true once Start has been clicked for this session
- `isPaused` — controls whether `tick()` advances the timer
- `intervalId` — the `setInterval` handle; always clear before reassigning

## UI Screens

There are two screens, toggled by `display` style:

- `#programPicker` — shown when no program cookie exists, or after clicking Change
- `#workoutContainer` — the main workout view

## Conventions

- Use `formatTime(seconds)` for all time display (returns `MM:SS`).
- The exercise list (`#exerciseList`) is visible on the start screen and hidden when a workout is active. Call `renderExerciseList()` whenever a program is loaded.
- The Change button (`#changeProgramBtn`) is hidden during an active workout and shown at rest.
- All bell/speech calls happen in `startExercise()` and `tick()` — do not add audio calls elsewhere.

# Aether

A living particle field. Thousands of glowing agents share a force matrix, collide with mass and restitution, and steer like a small ecosystem: they flock, hunt, flee, feed, age, mutate, and split.

**Play live:** [https://markovigele.github.io/aether/](https://markovigele.github.io/aether/)

## Run locally

On a Mac you can stay in the project folder and double-click:

- `Aether starten.command` — starts the sim and opens the browser
- `Aether stoppen.command` — stops it
- `Aether updaten.command` — pulls the latest version and installs packages

The first time, macOS may ask you to confirm: right-click the file → Open.

Or from a terminal:

```bash
npm install
npm run dev
```

Open [http://localhost:45217](http://localhost:45217).

## What you can do

- Drag to attract, repel, or spawn (set under Pointer).
- Tune physics: friction, gravity, viscosity, temperature, collisions, wrap/bounce/void.
- Edit the species force grid — green pulls, rose pushes.
- Turn on life: metabolism, photosynthesis, eating, reproduction, mutation, max age.
- Steer with boid-style AI: separation, alignment, cohesion, seek, flee, wander.
- Switch palettes, trails, glow, and constellation links.

Keyboard: `Esc` menu, `Space` pause, `R` reset, `N` new universe, `C` hide controls, `1–6` presets, `Shift+1–6` saved slots.

The pause menu has graphics quality, shortcuts, and six slots. Live settings and slots stay in the browser across restarts and updates. Use **Export** / **Import** for a JSON backup (you can keep `aether-saves.json` in this folder; Git ignores it). Always open [http://127.0.0.1:45217](http://127.0.0.1:45217) (not `localhost`) so the same save is used. A banner appears only if a future update must drop incompatible data.

## Presets

| Preset | Feel |
| --- | --- |
| Aurora herds | Peaceful tribes that graze and cluster |
| Predator garden | Three-tier food web |
| Mitosis | Sticky cells that swell and split |
| Orbital dance | Low drag, central gravity, looping paths |
| Primordial soup | High mutation, unstable species |
| Fireflies | Soft wanderers that pulse when they meet |

# STONEBOUND — The Sword That Hated Heroes

A retro 2D side-scrolling platformer combining action combat, environmental puzzles, and
the fantasy adventure *The Sword That Hated Heroes*. Runs in the browser; hosted on
GitHub Pages. Laptop keyboard + mobile touch (landscape) controls.

Full design document: [`design.md`](./design.md).

**Status: Milestone 1–2 (foundation + Stage 1 vertical slice). Pre-alpha.**
All sprites and sounds are code-generated placeholder assets (see `ASSET_LICENSES.md`).

## Quick start

```bash
npm install
npm run dev        # http://localhost:8080
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (`dist/`, base `/StoneBound/`) |
| `npm run typecheck` | TypeScript strict check, no emit |
| `npm test` | Unit tests (Vitest) |
| `npm run preview` | Serve the production build locally |

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or Arrow Left / Right | Left cluster buttons |
| Jump | Space | Jump button (right) |
| Attack | J | Attack button (right) |
| Dash | K | Dash button (small) |
| Equipped skill | L | Skill button (small) |
| Interact | E | Contextual button (appears in range) |
| Pause | Esc | Pause button (HUD) |

Mobile gameplay is landscape-only; portrait shows *Rotate your device to play* and pauses.

## Firebase (cloud saves) — required setup by the repository owner

The Firebase SDK is integrated, but cloud saves stay **inactive** until you provide a
real project. The game then automatically runs in Guest/Local mode (localStorage,
single-browser progress). Do the following to enable cross-device saves:

1. Create a project at <https://console.firebase.google.com> (Blaze plan not required
   for the free quotas used here, but check quotas/costs for yourself).
2. Register a **Web app** and copy its config values.
3. Enable **Authentication → Sign-in method → Google**, then add your GitHub Pages
   domain (`fatkhulb.github.io`) and `localhost` to **Authorized domains**.
4. Create a **Cloud Firestore** database.
5. Copy `.env.example` to `.env` and fill the `VITE_FIREBASE_*` values.
6. Deploy the security rules in [`firebase/firestore.rules`](./firebase/firestore.rules):
   `firebase deploy --only firestore:rules` (Firebase CLI).
7. For GitHub Pages builds, add the same `VITE_FIREBASE_*` values as repository
   **Actions secrets** so CI can bake them into the bundle.

Client config values are public identifiers; never commit admin/service-account keys.

## Deploying to GitHub Pages

Repository: <https://github.com/FatkhulB/StoneBound> → <https://fatkhulb.github.io/StoneBound/>

Pushing to `main` triggers `.github/workflows/deploy.yml`: install (frozen lockfile) →
typecheck → tests → build → publish `dist/` to Pages. First time: enable Pages with
Source **GitHub Actions** in repo Settings → Pages.

## Project layout

```
src/config/       gameplay constants (movement, combat, difficulty, economy, audio)
src/scenes/       Phaser scenes (Boot, Preload, Auth, Menu, ..., Game, UI, Result)
src/systems/      gameplay systems (input, controllers, combat, puzzle, checkpoint, ...)
src/services/     persistence (save model, local + cloud managers, progression)
src/entities/     player, enemies, bosses
src/data/         data-driven definitions (stories, stages, weapons, skills, dialogs)
src/ui/           HUD helpers, touch controls, theme
tests/            Vitest unit tests (pure logic + stage data validation)
firebase/         Firestore security rules + notes
public/assets/    currently empty — placeholder assets are generated in code
```

## Licenses

- Code: project's own (see repository license choice).
- Assets: all currently generated at runtime — see `ASSET_LICENSES.md`.
- Dependencies: Phaser (MIT), Firebase JS SDK (Apache-2.0), Vite/Vitest (MIT) — see each package.

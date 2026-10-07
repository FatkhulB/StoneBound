# Asset Licenses & Provenance

STONEBOUND currently ships **no binary asset files**. Everything visible and audible in
this milestone is generated at runtime by project code:

| Asset group | Source | License |
| --- | --- | --- |
| Sprites, tiles, UI textures | `src/utils/TextureFactory.ts` (Phaser Graphics drawing) | Project's own — original |
| Sound effects & music | `src/systems/AudioManager.ts` (WebAudio oscillators/noise) | Project's own — original |
| Typography | Browser font stack (`'Courier New', monospace`) | System fonts, not embedded |

All generated visuals are **temporary placeholders** for development and must be
replaced by original or properly licensed pixel art / music before any public release
beyond testing (design.md §11).

When real assets are added:

1. Put the files under `public/assets/` (`sprites/`, `tilesets/`, `maps/`, `audio/`, `fonts/`).
2. Add one row per file below with source, author, license, and a link to the license text.
3. Never ship assets copied from commercial games.

| File | Source / Author | License | Notes |
| --- | --- | --- | --- |
| _(none yet)_ | | | |

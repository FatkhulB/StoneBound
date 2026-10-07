# STONEBOUND — Game Design Document & PRD

Version: 0.2
Date: October 7, 2026
Status: Implementation-ready draft. Core requirements and story direction are approved; balancing values and implementation details are proposals for playtesting.
Document language: English
Game language: English

## 1. Product Overview

Stonebound is a retro 2D side-scrolling platformer combining action combat, environmental puzzles, and a fantasy adventure called The Sword That Hated Heroes.

The game runs in a browser, with the static frontend hosted on GitHub Pages. It supports laptop keyboard controls and mobile touch controls in landscape orientation. Signed-in players can continue the same progress on mobile and laptop through cloud saves.

The first release contains Story 1: The Buried Road, with exactly 10 sequential stages. Every stage requires finding its main key, defeating its boss, and opening its exit door. Future stories appear as non-playable Coming Soon cards; each released story will contain 10 stages.

Required features:
- Coins, a weapon shop, swords, and additional weapon types.
- Health bar and exactly three lives per stage attempt.
- Checkpoints, distinct enemy behaviors, and one boss per stage.
- Unlockable skills and equipment selection.
- Cross-device progress, music, sound effects, and text-only dialogue.
- Easy, Normal, and Hard difficulty settings.

Excluded from release one: multiplayer, online leaderboards, ads, purchases with real money, voice acting, procedural maps, and playable future stories.

## 2. Narrative and Characters

### 2.1 Premise

A sealed door without a handle stands outside Pip's village. Pip's older sister, Mara, disappeared through it three years ago. Nobody remembers opening it.

While scavenging an abandoned monument, Pip finds a legendary sword embedded in a stone bearing the same symbol as the door. Pip tries to draw the sword. The sword refuses.

Its name is Veyr. It will never serve another hero.

Pip digs up the entire stone instead.

Veyr reluctantly helps investigate the door, provided Pip does not call the journey a quest. Ten former guardians hold the keys to an abandoned passage network. Their accounts of Veyr's former owner contradict the statues and songs celebrating him.

The mystery concerns why a sword praised for opening gates chose to become immovable, and why Mara's footprints appear on roads that were supposedly abandoned decades ago.

### 2.2 Main Characters

Pip: A small scavenger who repairs things for a living. Practical, stubborn, curious, and uninterested in heroic titles. Visual identity: round teal body, two ivory eyes, oversized orange scarf. Pip is searching for Mara, not initially trying to save a kingdom.

Veyr: A talking sword embedded in a stone. Dry, impatient, and evasive about its former owner. Veyr's refusal is a deliberate choice, not a magical curse awaiting a chosen hero. It remains embedded after the ending.

Mara: Pip's older sister. She has been repairing the buried passage network and reopening supply routes while unable to release the village gate from inside. She has agency and a concrete task rather than existing only as a rescue objective.

The First Hero: Veyr's former wielder. He sealed settlements behind gates during his celebrated victory and keeps the network closed to conceal the consequences. He now controls the main gate from the underground gateworks.

### 2.3 Narrative Delivery

Use short English text exchanges, environmental clues, records, and visible repair work. Generally use 2–4 dialogue boxes per encounter. Dialogue pauses gameplay, advances manually, and can be skipped. Never require a player to read under attack.

Opening sample:
Pip: "You have the same mark as the door."
Veyr: "Then leave both of us alone."
Pip: "Can you open it?"
Veyr: "Not for a hero."
Pip: "Good. I repair gutters."

After excavating the stone:
Veyr: "You were supposed to pull the sword out."
Pip: "You said no."
Veyr: "So you stole the monument?"
Pip: "Only the useful part."

Final confrontation:
The First Hero: "They built statues of me."
Veyr: "They never saw what was behind the doors."
Pip: "Move. My sister is waiting."

Story 1 resolves the rescue: Pip reunites with Mara and reopens the buried road. Pip adds wheels to Veyr's carrying frame. Other sealed networks establish future stories without withholding Story 1's conclusion.

## 3. Core Loop and Progression

Main menu → story selection → unlocked stage → short dialogue → exploration and puzzles → main key → pre-boss checkpoint → boss fight → exit interaction → results → shop or next stage.

Stages unlock sequentially. Completed stages can be replayed. Future story cards cannot start gameplay and do not promise a release date.

Stage runtime states: exploration, bossIntro, bossFight, exitReady, complete. Track puzzle flags, key ownership, checkpoint state, and boss defeat separately.

The main key must be obtained before the boss can activate. The exit completes the stage only if hasMainKey AND bossDefeated are true and the player interacts with it. Display missing requirements instead of silently ignoring input.

Each fixed map includes a safe spawn, mandatory route, optional coin branches, puzzle room, midpoint checkpoint, pre-boss checkpoint, boss arena, and exit. Target first-play duration: 6–10 minutes per stage and 10–15 minutes for stage 10, subject to testing.

All mandatory routes and bosses must be completable with free starter equipment and automatically unlocked movement abilities. No purchased weapon, optional skill loadout, or coin total may gate progression.

## 4. Story 1 Stage Plan

| Stage | Location | Main-Key Puzzle | Platforming / Enemies | Boss and Combat Pattern | Narrative Reveal |
|---|---|---|---|---|---|
| 1 | The Fallen Monument | Move stone blocks onto pressure plates. | Short gaps; patrol creatures. | Bronze Caretaker: marked leap and slow hammer swing. | The caretaker recognizes Veyr as stolen property. |
| 2 | The Rootbound Mill | Redirect water to power lifts. | Vertical lifts; flying enemies. | Mill Warden: wheel charge and marked water bursts. | Mara passed through recently. |
| 3 | The Bell Quarry | Strike bells according to carved symbols. | Moving mine platforms; ranged enemies. | Hollow Bellkeeper: ground shockwaves and bell strikes. | Old routes were erased from official maps. |
| 4 | The Hanging Market | Balance suspended platforms using counterweights. | Suspended walkways; shield enemies. | Toll Collector: hook pulls and coin-shaped projectiles. | Hidden routes remain in use, for a price. |
| 5 | The Glass Furnace | Rotate cooled mirrors to expose the key chamber. | Conveyors and timed heat vents; patrol machines. | Furnace Marshal: furnace bursts and heavy ground slam. | A recording shows civilians sealed behind a gate. |
| 6 | The Drowned Archive | Drain rooms to assemble a route diagram. | Floating platforms; chasers. | Inkbound Archivist: marked ink pools and limited summons. | Mara used several false names in maintenance records. |
| 7 | The Winter Granary | Slide frozen crates to repair a supply lift. | Slippery floors; ice throwers. | White Quartermaster: sliding charge and falling crates. | The passages supplied abandoned settlements. |
| 8 | The Unfinished Bridge | Position bridge sections with winches. | Moving bridge segments; flyers. | Bridge Captain: cable sweep and short melee combo. | Veyr lodged itself in stone to prevent another sealing. |
| 9 | The Gateworks | Connect mechanical relays. | Combined previous hazards and enemy types. | Last Gatekeeper: shield stance, lunge, exposed recovery. | Mara is alive inside the network. |
| 10 | The Door Beneath Home | Combine plates, mirrors, and relays. | Final examination of established mechanics. | First Hero: three phases combining sword attacks, gate pulses, and marked projectiles. | Rescue, confrontation, reopened road, and epilogue. |

Bosses must differ mechanically, not just by palette. Flying bosses descend regularly within starter melee reach. Bosses 1–9 have at least two readable attack patterns. Stage 10 phase thresholds: 100–66%, 65–33%, and 32–0% HP.

Puzzle clues must be available locally. Every movable-object puzzle has a reset interaction. Optional branches never contain a mandatory upgrade. Avoid blind jumps and unrecoverable puzzle states.

## 5. Movement and Combat

Initial playtest parameters: movement 160 world units/second, gravity 900 units/second², jump velocity -360 units/second, coyote time 100 ms, jump buffer 120 ms. Releasing jump early produces a shorter jump. These values belong in configuration files.

Pip carries the stonebound sword using a short harness, allowing deliberate heavy swings without removing the sword from its stone. The starter equipment also activates marked weighted plates and breaks explicitly cracked barriers.

Proposed starter combat: 12 damage, 0.60-second attack interval, visible wind-up and recovery. One swing damages each target at most once. Keep facing direction when standing still. Do not implement stamina in release one.

Normal starting HP: 100. Display both a health bar and an HP number. On damage, apply light knockback and 800 ms temporary invulnerability. Hazards deal configured damage; falling into a pit returns Pip to the last safe position after damage. If that damage depletes HP, process a death instead. No ordinary fall damage.

Enemy archetypes:
- Patrol: moves between limits and avoids unintentional ledge falls.
- Chaser: follows within an alert radius, then returns home.
- Flyer: follows an aerial path and performs telegraphed dives.
- Ranged: aims at a visible player position before firing.
- Shield: blocks front attacks and exposes its rear or recovery window.
- Summoner: creates at most two active minions with a cooldown.

Use explicit AI states such as idle, move, telegraph, attack, recover, hurt, and dead. Boss attacks must provide visible warnings and avoid unavoidable spawn hits. Initial telegraph target: roughly 400–600 ms, adjusted by playtesting.

## 6. Skills and Equipment

Dash: available in stage 1. Short horizontal movement; 2-second cooldown. Does not pass through walls and does not grant damage immunity in this draft.

Light Burst: unlocked after completing stage 3. Proposed 20 area damage and 8-second cooldown.

Guard: unlocked after completing stage 6. Proposed 60% incoming damage reduction for 1.5 seconds and 10-second cooldown.

Equip one active combat skill in addition to dash to keep touch controls manageable. Choose the loadout before entering a stage. No puzzle requires a particular optional skill.

| Weapon | Proposed Price | Behavior |
|---|---:|---|
| Stonebound Sword | Free | 12 damage; heavy starter melee; puzzle interaction remains available. |
| Guardian Sword | 150 coins | 18 damage; 0.55-second interval; medium reach. |
| Light Bow | 250 coins | 10 damage; 0.7-second interval; ranged shots without consumable ammunition. |

Veyr remains carried and participates in dialogue even when another combat weapon is equipped. Its environmental interaction is a contextual action, not an extra permanent combat button. All bosses remain beatable with the Stonebound Sword.

## 7. Three Lives, Checkpoints, and Game Over

A stage attempt starts with exactly three lives and full HP. HP and lives are separate resources.

When HP reaches zero:
1. Subtract one life and persist the death outcome.
2. If lives remain, respawn at the latest checkpoint with full HP.
3. If no lives remain, show No Lives Remaining. Do not offer checkpoint continuation.
4. Restart Stage begins the SAME stage from its initial spawn with three new lives and full HP.

Do not restart Story 1 or revoke already unlocked stages. Purchased weapons, unlocked skills, completed stages, and permanent wallet balance survive game over. Stage-local puzzle states, main key, defeated boss, checkpoints, and attempt coins reset on a full stage restart.

Checkpoint activation records a safe position and restorable world state. Ordinary life-loss respawn restores that snapshot, while retaining any acquired main key, permanent run coin ledger, and defeated-boss flag. A boss not yet defeated resets to full HP. A defeated boss does not respawn after a subsequent ordinary death.

No checkpoints inside boss arenas. The pre-boss checkpoint must include the key. Puzzle reset restores only that puzzle's objects, not the entire attempt or its lives.

Reloading, logging out, or switching devices does not refill lives or undo a persisted death. Resuming uses the checkpoint and remaining lives from the saved attempt, with full checkpoint HP rather than an exact mid-air position.

If an active attempt is abandoned through Return to Stage Map, require confirmation. Discard stage-local progress and attempt coins, while preserving account-level progression. Re-entering starts a new attempt with three lives. This intentional reset is not a checkpoint continuation.

## 8. Coin Economy

Design proposal: coins earned during an attempt are provisional until stage completion. Clearly distinguish Attempt Coins from the permanent Wallet in UI.

Sources: fixed pickups, enemy rewards, and a first-clear bonus. Initial targets: 30–60 pickup coins per stage, 1–3 per regular enemy, and a 40-coin first-clear bonus.

A pickup or enemy reward has a stable unique ID within an attempt. Ordinary checkpoint respawns do not duplicate already recorded rewards. Losing all lives or abandoning the attempt discards provisional coins. Completing a stage commits them to the wallet exactly once and grants the first-clear bonus only if not previously claimed.

Replaying a completed stage creates a new attempt and permits ordinary coin collection again. First-clear bonuses never repeat. Purchases use permanent wallet coins and occur only in the stage-map shop, not during active combat.

Validate item ownership and available balance, charge exactly once, and persist purchase and wallet changes atomically. Disable buttons for insufficient funds or already owned equipment. Do not implement unlimited stat upgrades.

## 9. Difficulty

| Setting | Easy | Normal | Hard |
|---|---:|---:|---:|
| Player Max HP | 150 | 100 | 100 |
| Starting Lives | 3 | 3 | 3 |
| Enemy Damage Multiplier | 0.7 | 1.0 | 1.3 |
| Boss HP Multiplier | 0.8 | 1.0 | 1.2 |
| Telegraph Duration Multiplier | 1.25 | 1.0 | 0.85 |
| Checkpoints | All | All | All |

Difficulty does not change puzzles, unlock order, lives, or coin rewards. Apply changes at the start of a new attempt, not during a boss fight. Default: Normal. Preserve progression across difficulty changes.

## 10. Controls, UI, and Accessibility

Laptop controls: A/D or arrows move; Space jumps; J attacks; K dashes; L uses the equipped skill; E interacts; Esc pauses.

Mobile controls: left/right buttons on the lower left; jump/attack on the lower right; smaller dash/skill buttons nearby; contextual interaction appears only within range. Support simultaneous movement, jump, and attack touches. Release all held inputs on pointer cancel, blur, pause, and dialogue activation.

Mobile gameplay is landscape-only. Portrait displays Rotate your device to play and pauses gameplay. Do not depend on browser orientation-lock support. Target touch buttons at least 48 CSS pixels, with safe-area spacing around notches and screen edges.

Logical resolution proposal: 480×270, 16:9. Preserve aspect ratio and use letterboxing when necessary. Render pixel art without smoothing. Camera follows with dead zones, respects map boundaries, and locks appropriately for boss arenas.

Screens: loading, authentication, main menu, settings, story selection, stage selection, shop/equipment, gameplay, dialogue, pause, game over, stage results, and Story 1 ending.

HUD: HP, three-life indicator, provisional coins, key icon, skill cooldowns, and boss HP when active. Permanent wallet appears in menus/shop. Show cloud save status separately.

Required English strings include New Game, Continue, Stage Select, Shop & Equipment, Checkpoint Reached, Find the key first., Defeat the guardian first., No Lives Remaining, Restart Stage, Return to Stage Map, Coming Soon, Saving..., Saved to Cloud, Offline — Progress Not Synced, and Save Conflict.

New Game requires explicit confirmation before replacing the account's save. Dialogue is readable, manually advanced, skippable, and paused. Puzzle clues use symbols and shapes as well as color. Provide camera shake and flash reduction toggles.

## 11. Audio and Art

Create original or properly licensed assets; record provenance and licenses in ASSET_LICENSES.md. Do not ship assets copied from commercial games.

Pip's teal body and orange scarf must remain readable against every biome. Use limited palettes, clear silhouettes, high foreground/background contrast, and distinct hazard shapes. Do not interpret silhouette readability as an all-black visual style.

Player animations: idle, run, jump, fall, attack, hurt, death, interact, and skill. Enemies require movement, attack warning, attack, hurt, and death states. Placeholder geometry is acceptable during development but must be identified as temporary.

Music covers menus, exploration, bosses, results, and ending. SFX cover attacks, hits, damage, movement, coins, checkpoints, keys, doors, purchases, UI, and puzzle feedback. No voice acting.

Begin audio only after a user action. Provide independent music/SFX levels and global mute. Avoid duplicate tracks after retries and scene changes. Pause gameplay on tab blur; resume deliberately and clear held controls.

## 12. Cross-Device Cloud Saves

Proposed services: Firebase Authentication for identity and Cloud Firestore for persistent player data. The game frontend remains hosted on GitHub Pages. Cloud saving requires a configured external project; it is not provided by GitHub Pages itself.

Proposed sign-in: Google account, with an optional email/password alternative if required later. Use the same account on laptop and mobile. Guest play may use local saves but must clearly state that automatic cross-device continuation requires sign-in.

Scope cloud save reads/writes to the authenticated owner through deployed security rules. Deny unauthenticated access to account saves; validate allowed fields and data shapes. Never ship service-account credentials or admin secrets in the frontend. A client-controlled save is not an anti-cheat guarantee.

Save model:
- schemaVersion, revision, updatedAt, accountId.
- unlockedStage, completedStageIds, firstClearClaimedIds.
- walletCoins, ownedWeaponIds, equippedWeaponId.
- unlockedSkillIds, equippedSkillId, difficulty, settings.
- activeAttempt: attemptId, stageId, difficultyAtStart, livesRemaining, checkpointId, checkpointSnapshot, hasMainKey, bossDefeated, attemptCoins, collectedPickupIds, rewardedEnemyIds, and completionCommitted.

Save on checkpoint activation, death/life loss, key pickup, boss defeat, stage completion, purchases, attempt restart/abandonment, and relevant setting changes. Do not write every frame. Restore checkpoint state on resume, not an exact frame position.

Cloud mutations involving wallet, ownership, completion, and first-clear reward use validated atomic updates or transactions. Stage completion must be idempotent by attemptId so repeated requests cannot duplicate coins.

Use a revision field and transactional conflict checks. Never silently merge two active attempts or add conflicting coin balances together. On a conflict, pause gameplay and show both saves with stage, lives, coins, and timestamps before the user selects which to keep.

Maintain a local last-known-good snapshot and queued offline progress. Offline play must clearly show unsynced status. Require successful upload and a Saved to Cloud confirmation before promising that another device can resume the newest progress. Reconnecting reconciles against the cloud revision; conflicting data prompts a choice rather than overwriting automatically.

For simultaneous use, attempt a transactional per-account active-session lease while online. A second device offers an explicit takeover, after which the older session stops cloud writes. Lease enforcement is best-effort; offline divergence still uses conflict resolution. Do not claim perfect offline anti-cheat or guaranteed single-session enforcement.

A corrupt or unsupported save must not crash the game. Offer recovery from a valid backup or a confirmed reset. Handle authentication expiration, permission errors, storage limits, and network errors with actionable messages.

Deployment remains incomplete until Firebase project configuration, authorized login domains, security rules, and cloud save tests are completed. Track service quotas and costs rather than assuming unlimited free operation.

## 13. Technical Architecture and Deployment

Proposed stack: TypeScript, Phaser, Vite, Arcade Physics, and JSON tilemaps. Pin a compatible Phaser version during bootstrap and use its matching documentation consistently. React is not required for the gameplay runtime.

Scenes: BootScene, PreloadScene, AuthScene, MenuScene, StorySelectScene, StageSelectScene, ShopScene, GameScene, UIScene, and ResultScene. Dialogue/pause/settings may be overlays.

Systems: InputManager, PlayerController, CombatSystem, EnemyController, BossController, PuzzleSystem, CheckpointSystem, EconomySystem, ProgressionManager, AudioManager, LocalSaveManager, CloudSaveManager, and SessionManager.

Use data-driven definitions for stories, stages, enemies, bosses, weapons, skills, and dialogue. Gameplay UI must call domain services rather than directly changing wallet or progression fields.

Suggested structure:
- src/main.ts and src/config/
- src/scenes/ and src/ui/
- src/entities/player/, enemies/, bosses/
- src/systems/ and src/services/
- src/data/stories/, stages/, weapons/, skills/, dialogs/
- public/assets/sprites/, tilesets/, maps/, audio/, fonts/
- tests/ and e2e/
- firebase/firestore.rules and security-rule tests
- .github/workflows/deploy.yml
- design.md, README.md, ASSET_LICENSES.md, .env.example

GitHub Actions runs lockfile installation, type checking, tests, and Vite build, then publishes the static build to GitHub Pages. Configure Vite base for the actual repository path. Asset loading must honor that base. Do not hardcode the developer's repository name in reusable configuration.

Document Firebase setup separately; deploying static assets does not automatically deploy database rules. Deployment credentials belong in protected workflow secrets, never public bundles. Client Firebase configuration is distinct from admin credentials.

Performance goals, pending real measurement: 60 FPS on the chosen laptop test device; at least 30 FPS on the chosen mobile device, targeting 60. Record actual device/browser details. Limit particles, pool projectiles, and load stage assets selectively.

## 14. Implementation Plan for AI

1. Foundation: TypeScript/Phaser/Vite setup, loading, resize, keyboard/touch input, portrait overlay, GitHub Pages build.
2. Vertical slice: complete stage 1 with puzzle, key, enemy, boss, exit, three lives, checkpoint respawn, and same-stage restart.
3. Economy and progression: coin ledger, completion commit, shop, loadouts, unlocks, and difficulty.
4. Cloud persistence: authentication, rules, local backup, revision conflict handling, cross-device resume, and death persistence.
5. Full content: stages 2–10, distinct bosses, all enemy archetypes, skills, dialogue, ending, future-story cards.
6. Polish and validation: final assets/audio, accessibility, mobile optimization, browser tests, deployment instructions.

Finish and test the stage-1 vertical slice before producing nine more maps. At each milestone report changed files, run instructions, actual tests performed, and remaining issues. Never claim a device test or cloud sync test passed unless it was executed.

## 15. Acceptance Criteria

- Build passes type checking; the deployed GitHub Pages project loads without missing assets.
- All UI, tutorials, item descriptions, and dialogue are in English.
- Exactly 10 playable Story 1 stages exist, unlocked sequentially.
- Every stage has a main-key puzzle, a mechanically distinct boss, and a gated exit.
- An exit cannot complete a stage without both key and boss defeat.
- All required gameplay can be completed using starter equipment.
- Lives start at three; each death subtracts exactly one life.
- With lives remaining, checkpoint respawn works; at zero lives, only same-stage restart or return to map is available.
- Full stage restart resets puzzle/key/boss/checkpoints/attempt coins but preserves account-level progression and purchases.
- Reload and cross-device continuation preserve remaining lives and do not undo persisted deaths.
- Checkpoint retries do not duplicate pickup/enemy coin rewards.
- Stage completion commits coins once; first-clear bonuses cannot repeat.
- Purchases validate funds and persist ownership and deduction atomically.
- Mobile supports simultaneous movement/jump/attack, safe-area spacing, and landscape gameplay.
- Portrait, pause, blur, and dialogue halt combat and clear held controls.
- Puzzle reset prevents permanent softlocks.
- Signed-in user A cannot access user B's save; security-rule tests demonstrate this.
- Progress saved on mobile resumes on laptop under the same account, and vice versa.
- Offline status is visible; reconnect conflicts do not silently destroy progress.
- Authentication and storage failures display recoverable errors rather than crashing.
- Audio starts after user interaction and does not duplicate on retries.
- Story 1 ends with Pip and Mara reunited; future stories remain Coming Soon.

## 16. Decisions and Remaining Setup

Confirmed: The Sword That Hated Heroes concept; English game language; three lives; game over restarts only the current stage; landscape mobile; cross-device progression; 10 stages per story; key plus boss plus exit completion.

Working creative choices: Stonebound title; Pip, Veyr, Mara; stage names; detailed plot and dialogue.

Proposed implementation choices: Firebase, Google sign-in, provisional attempt coins, exact combat values, and equipment prices. Keep these configurable and document changes; do not present playtest values as approved final balance.

External setup required: repository name, GitHub Pages workflow permissions, Firebase project, authorized authentication domain, deployed rules, and selected test devices. Do not invent these identifiers or claim cloud infrastructure exists before setup.

## 17. Technical Sources

These references support hosting, deployment, audio, and access-control decisions. Narrative and balancing content are original design proposals.

- GitHub Pages: https://pages.github.com/
- Vite static deployment: https://vite.dev/guide/static-deploy
- Phaser audio: https://docs.phaser.io/phaser/concepts/audio
- Firebase authentication and security rules: https://firebase.google.com/docs/rules/rules-and-auth
- Firebase basic security rules: https://firebase.google.com/docs/rules/basics

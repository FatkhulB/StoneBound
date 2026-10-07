# Firebase setup notes (design.md §12)

The Firebase SDK is integrated in the client, but **cloud saves stay inactive until
the repository owner completes this setup**. Until then the game runs in Guest/Local
mode (localStorage) and shows `LOCAL SAVE` in the HUD.

## 1. Create the project

1. <https://console.firebase.google.com> → Add project.
2. Add a **Web app** (</>) and copy the `firebaseConfig` values.
3. Fill them into `.env` (copy from `.env.example`) — public client identifiers only.
   For CI, add the same keys as GitHub Actions repository secrets.

## 2. Authentication

1. Authentication → Sign-in method → enable **Google**.
2. Authentication → Settings → Authorized domains → add:
   - `localhost`
   - `fatkhulb.github.io`

## 3. Firestore

1. Firestore Database → Create database (production mode).
2. Deploy the rules in [`firestore.rules`](./firestore.rules):

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```

   (Add a minimal `firebase.json` if the CLI asks for one:
   `{ "firestore": { "rules": "firebase/firestore.rules" } }`.)

## 4. Data model

| Collection | Document | Purpose |
| --- | --- | --- |
| `saves/{uid}` | Player save (schema in `src/services/SaveModel.ts`) | Cross-device progress; revision-based conflict detection |
| `sessions/{uid}` | `{ deviceId, updatedAtClient }` | Best-effort active-session lease |

## 5. What is NOT done in this milestone

- Rules have **not** been deployed or tested against a live project
  (`tests/` covers client logic only). Milestone 4 covers auth/rules testing,
  conflict UI, and cross-device resume verification.
- Security-rule unit tests (`@firebase/rules-unit-testing`) are planned for that milestone.
- Conflict resolution UI is minimal: pushes that lose a revision race report
  `SAVE CONFLICT`; full both-saves comparison screen comes with cloud testing.

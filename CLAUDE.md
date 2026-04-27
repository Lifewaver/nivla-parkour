# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (HMR)
npm run build     # production build
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

There is no test suite in this project.

## Environment setup

Create `.env.local` with the following Firebase keys before running the app:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Architecture

This is a single-page React + Vite app with Tailwind CSS and Firebase as the only backend. There is **no routing library** — navigation is entirely tab-based via `activeTab` state in `MainApp`.

### File structure

All application logic lives in two files:

- `src/firebase.js` — Firebase initialization, exports `auth`, `db`, `googleProvider`, `ALLOWED_EMAILS`, `ADMIN_EMAILS`, and `isAdmin(email)`
- `src/App.jsx` — Every component, constant, and helper in one file (~1400 lines)

### Auth flow (`src/App.jsx`)

`ParkourApp` (default export) wraps the whole app and manages auth state via `onAuthStateChanged`. On sign-in it checks the user's email against `ALLOWED_EMAILS` (defined in `firebase.js`); unauthorized emails are immediately signed out. Admins are identified by `ADMIN_EMAILS`. On each sign-in, a profile document is written to the `userProfiles` Firestore collection.

### Data model (Firestore)

All per-user data is stored under `users/{uid}/data/{key}` as `{ value: <data>, updatedAt: timestamp }`. The keys are:

| Key | Shape |
|-----|-------|
| `tricks` | `TrickObject[]` |
| `trainingDays` | `string[]` (ISO dates) |
| `journal` | `JournalEntry[]` |
| `weeklyGoals` | `WeeklyGoal[]` |
| `completedWarmups` | `{ [id]: boolean }` |
| `completedConditioning` | `{ [id]: boolean }` |

`loadUserData(uid, key)` and `saveUserData(uid, key, value)` are the only Firestore helpers — every save is a full overwrite of that key's document.

Admin users can also read `userProfiles` (collection) and any user's `users/{uid}/data/*` directly.

### Trick data shape

```js
{ id, name, difficulty: 'Easy'|'Medium'|'Hard'|'Super', category, status, videos: string[], notes: string }
```

Status progression (ordered): `not_started → training_hard → trampoline_landing → soft_landing → training_like_hell → yes_i_can`

`yes_i_can` is the "mastered" state and triggers the celebration animation.

`INITIAL_TRICKS` (92 tricks) is the seed list written on first sign-in if no tricks exist in Firestore.

### Tab / component map

`MainApp` owns all state and renders one tab at a time:

| `activeTab` | Component | Notes |
|---|---|---|
| `home` | `HomeTab` | Streak card, stats, "Tricks of the Day", badges |
| `tricks` | `TricksTab` | Filterable/searchable trick list |
| `training` | `TrainingTab` | Sub-sections: goals, warmup, conditioning, journal |
| `progress` | `ProgressTab` | Badge grid, stats breakdown, training calendar |
| `add` | `AddTab` | Add a custom trick |
| `admin` | `AdminTab` | Visible only to admin emails; reads all user profiles and data |

`TrickDetailModal` is a full-screen modal (not a tab) opened by `setSelectedTrick` from any tab.

### Adding/editing tricks

To add a trick programmatically, call `addTrick(trick)` inside `MainApp` — it merges default fields and saves to Firestore. To change `INITIAL_TRICKS`, edit the array starting at line 36 in `App.jsx`; existing users won't see the change since their tricks are already seeded.

### Allowed users / admin

To add a user, append their Google email to `ALLOWED_EMAILS` in `src/firebase.js`. To grant admin access, also add them to `ADMIN_EMAILS`.

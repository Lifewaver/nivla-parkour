# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite HMR)
npm run build      # Production build
npm run preview    # Preview production build locally
npm run lint       # ESLint
```

There is no test framework configured.

Firebase credentials must be present in `.env.local` (not committed):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Architecture

**Stack:** React 19 + Vite, Tailwind CSS v3, Lucide React icons, Firebase (Auth + Firestore). No TypeScript, no router, no state management library.

**Single-file app:** Almost all code lives in `src/App.jsx`. All components, static data, and business logic are colocated there. `src/firebase.js` is the only other source file.

### Auth & Access Control (`src/firebase.js`)

- Google Sign-In only via Firebase Auth
- `ALLOWED_EMAILS` — whitelist of permitted users (family members)
- `ADMIN_EMAILS` — subset of allowed emails with admin privileges
- Both lists are hardcoded in `firebase.js` — add users there

### Component Tree (`src/App.jsx`)

```
ParkourApp          ← auth state wrapper, blocks non-allowed emails
└── MainApp         ← holds all app state, loads/saves to Firestore
    ├── HomeTab
    ├── TricksTab
    ├── TrainingTab (sections: goals, warmup, conditioning, journal)
    ├── ProgressTab
    ├── AddTab
    ├── AdminTab    ← only rendered for admin emails
    └── TrickDetailModal (overlay)
```

### Firestore Data Model

All user data is stored at `users/{uid}/data/{key}` as `{ value: <data>, updatedAt: <timestamp> }`.

Keys used: `tricks`, `trainingDays`, `journal`, `weeklyGoals`, `completedWarmups`, `completedConditioning`.

Admin can also read `userProfiles/{uid}` — written on every sign-in.

### Static Data

All defined as constants at the top of `App.jsx`:
- `INITIAL_TRICKS` — 92 parkour tricks with `id`, `name`, `difficulty` (Easy/Medium/Hard/Super), `category`
- `WARMUPS` / `CONDITIONING` — predefined exercise lists with timer durations
- `BADGES` — achievement definitions with check functions against a stats object
- `STATUS_LEVELS` — the 6-step trick progression: `not_started → training_hard → trampoline_landing → soft_landing → training_like_hell → yes_i_can`

### UI Conventions

- Dark mobile-first layout: `bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900`
- Difficulty colors: Easy=green, Medium=blue, Hard=orange, Super=purple
- Mastering a trick (`yes_i_can`) triggers a full-screen celebration overlay
- Bottom nav is fixed; admin tab only appears for admin users

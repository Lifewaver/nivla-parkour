# Product Requirements Document — Nivla Parkour

**Version:** 1.0  
**Date:** April 2026  
**Owner:** Fredrik Åsberg

---

## Overview

Nivla Parkour is a private mobile-first web app for the Åsberg family to track their parkour and gymnastics training. It replaces pen-and-paper tracking with a structured digital journal that covers trick progression, daily training routines, goal-setting, and achievement tracking.

The app is invite-only (four family members), deployed via Vercel, and backed by Firebase Auth + Firestore.

---

## Users

| User | Role |
|------|------|
| Fredrik Åsberg | Admin — full access including user management view |
| Alvin Åsberg | Member |
| Tilda Åsberg | Member |
| Charlotta Åsberg | Member |

Access is controlled by a hardcoded email allowlist in `src/firebase.js`. Non-listed emails are rejected at sign-in.

---

## Core Goals

1. **Trick progression tracking** — each family member independently tracks their own progress through 92 predefined tricks across a 6-step mastery scale.
2. **Daily training accountability** — log training days and maintain streaks to build consistent habits.
3. **Structured session planning** — guided warmup and strength routines with per-exercise timers.
4. **Goal-setting** — set weekly focus tricks with smart suggestions based on current progress.
5. **Motivation** — badges, celebrations, and visible progress charts to keep training fun.

---

## Feature Inventory

### Authentication

- Google Sign-In only (OAuth popup via Firebase Auth).
- On sign-in, email is checked against `ALLOWED_EMAILS`. Non-members are immediately signed out with an error message.
- User profiles are upserted to Firestore (`userProfiles/{uid}`) on every successful sign-in for admin visibility.
- Sign-out button in the top header.

---

### Home Tab

**Streak card**
- Displays current consecutive training-day streak.
- "Log training today" button — marks today's date in `trainingDays`. Disabled (with confirmation label) if already logged today.
- Motivational copy changes based on streak length (0, <3, <7, 7+).

**Stat cards**
- Mastered (count of `yes_i_can` tricks)
- Training (count of in-progress tricks, i.e. not `not_started` and not `yes_i_can`)
- Progress (mastered / total as %)

**This Week's Focus**
- Shows up to 3 tricks algorithmically selected from the user's in-progress pool (or easy not-started tricks if fewer than 3 in progress).
- Selection rotates by ISO week number so it changes weekly without manual intervention.
- Each trick is tappable and opens the Trick Detail Modal.

**Achievements preview**
- Shows the 5 most recently earned badges.
- "See all →" link navigates to the Progress tab.

**Quick links**
- Warm Up → opens Training tab on the Warmup section.
- Strength → opens Training tab on the Strength section.

---

### Tricks Tab

**Search and filters**
- Text search (name substring, case-insensitive).
- Filter by Category (all categories derived from trick data).
- Filter by Difficulty (Easy / Medium / Hard / Super).
- Filter by Status (all 6 status levels).
- Result count label updates live.

**Trick list**
- Grouped by category, sorted alphabetically with Gymnastics categories (Trampoline, Tumbling, Floor) pushed to the bottom and visually distinguished with a cyan "Gymnastics" badge.
- Each trick card shows: difficulty color strip, name, difficulty badge, video count, status emoji.
- Inline video quick-launch buttons (📹 reference, 🎓 tutorial) open the URL in a new tab without opening the modal.
- Tapping the name or status emoji opens the Trick Detail Modal.

**Trick library**
- 92 predefined tricks across 9 categories: Flips, Jump, Kicks, Leap, Swings, Vaults, Trampoline, Tumbling, Floor.
- Difficulties: Easy, Medium, Hard, Super.

---

### Trick Detail Modal

Opens as a bottom sheet (mobile) or centered overlay (tablet+).

**Progress section**
- All 6 status levels shown as selectable buttons.
- Selecting `yes_i_can` triggers a full-screen celebration overlay (2.5 s) only if the status was not already `yes_i_can`.

**Status levels (in order)**
1. Not started ⚪
2. Training hard 💪
3. Trampoline landing 🤾
4. Soft landing 🛬
5. Training like hell 🔥
6. Yes I can! ✅

**Videos**
- Separate sections for Reference Videos (📹) and Tutorial Videos (🎓).
- Add a video: toggle type (Tutorial / Reference), enter label and URL, submit.
- Remove any video with the ✕ button.

**Notes**
- Free-text textarea; saved on blur.

---

### Training Tab

Sub-navigation with five sections: Weekly Goals · Warm Up · Strength · Journal · History.

#### Weekly Goals

**Suggestions panel**
- Algorithmically generates up to 3 trick suggestions prioritised by:
  1. `training_like_hell` tricks (almost mastered)
  2. `soft_landing` tricks
  3. `trampoline_landing` tricks
  4. `training_hard` tricks
  5. Easy tricks in the weakest category by mastery %
  6. Medium tricks in a category where ≥2 easy tricks are mastered
  7. Fallback: any easy/medium not-started tricks
- Each suggestion shows the trick name, difficulty, and a one-line reason.
- "Add" button adds it to the goals list; button becomes "✓ Added" if already in goals.

**Goals list**
- Manually add any non-mastered trick via a dropdown.
- Remove goals with ✕.
- Tapping a trick opens the Trick Detail Modal.
- No hard cap enforced (UI guidance suggests 3–5).

#### Warm Up

- 14 predefined exercises (wrist circles → bear crawl).
- Each has a name, duration description, purpose note, and a countdown timer.
- Checkbox toggles completion for today. Done items show strikethrough and green highlight.
- "Reset" button clears today's completions.
- Progress label: `X/14 completed today`.

#### Strength

- 12 predefined conditioning exercises (push-ups → bridge hold).
- Same checklist + timer pattern as Warm Up.
- Reps label displayed alongside exercise name.

#### Exercise Timer (shared component)

- Countdown from configured duration.
- Play / Pause toggle.
- Reset button.
- Progress bar depletes in real time.
- On completion: shows "✅ Done!" and triggers device vibration (if supported).

#### Journal

- Free-text entry saved with today's date and a timestamp.
- Entries listed in reverse chronological order.
- Delete individual entries with ✕.

#### History

- Aggregated weekly view of past training activity.
- Expandable accordion per week showing: range label, training day count, warmup count badge, strength count badge, journal entry count badge.
- Expanded view shows each training day broken down with warmup names, strength exercise names+reps, and journal text.

---

### Progress Tab

**Summary stats**
- Total mastered (count / total)
- Total logged training days

**By Difficulty breakdown**
- Progress bars for Easy / Medium / Hard / Super (mastered / total in that tier).

**By Category breakdown**
- Progress bar per category (mastered / total).

**Achievements**
- 15 badges defined across: first trick, easy/medium/hard/super milestones, total mastery milestones, training streaks, vault mastery, flip mastery.
- Earned badges shown in full color; locked badges shown at 50% opacity with 🔒.
- Count label: `X/15`.

---

### Add Tab

- Form to add a custom trick: name (text), category (button grid), difficulty (button row).
- Saved with `id: Date.now()`, `status: 'not_started'`, empty videos and notes.
- Success feedback: button text changes to "✅ Added!" for 2 s.
- Navigation stays on the Add tab after submission (user can add more).

---

### Admin Tab (admin only)

- Visible in bottom nav only for `ADMIN_EMAILS`.
- Lists all users who have ever signed in (from `userProfiles` collection), sorted by most recent sign-in.
- Shows avatar, display name, email, last sign-in timestamp.
- "View" button loads the selected user's full data and renders a read-only summary:
  - Mastered / In Progress / Not Started counts
  - Tricks grouped by status
  - Training days count
  - Weekly goals
  - Journal entries
  - Recent warmup and conditioning completions

---

## Data Model

All per-user data lives at `users/{uid}/data/{key}` as `{ value: <data>, updatedAt: <ms timestamp> }`.

| Key | Type | Description |
|-----|------|-------------|
| `tricks` | `Trick[]` | Full trick list with per-user status, videos, notes |
| `trainingDays` | `string[]` | ISO date strings of logged training days |
| `journal` | `JournalEntry[]` | `{ date, text, timestamp }` |
| `weeklyGoals` | `Goal[]` | `{ trickId, addedAt }` |
| `completedWarmups` | `Record<date, id[]>` | Completed warmup IDs per day |
| `completedConditioning` | `Record<date, id[]>` | Completed conditioning IDs per day |

Admin-readable: `userProfiles/{uid}` — written on every sign-in with `uid`, `email`, `displayName`, `photoURL`, `lastSignIn`, `isAdmin`.

---

## Technical Stack

| Concern | Choice |
|---------|--------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| Auth | Firebase Auth (Google provider) |
| Database | Firebase Firestore |
| Hosting | Vercel (auto-deploy from GitHub `main`) |
| Language | JavaScript (no TypeScript) |
| Routing | None — single-page tab navigation via state |
| State management | React `useState` / `useEffect` only |

All code (components, constants, business logic) lives in `src/App.jsx`. `src/firebase.js` is the only other source file.

---

## Non-Goals (current version)

- No multi-device real-time sync (Firestore reads on load, no live listeners).
- No PWA / offline support.
- No push notifications.
- No social / sharing features between family members.
- No video hosting (links to external URLs only).
- No custom warmup/conditioning exercises (lists are hardcoded).
- No trick deletion (only status reset).
- No data export.

---

## Open Questions / Potential Future Work

- Real-time progress visibility across family members (leaderboard or shared view).
- Custom warmup and conditioning exercise lists per user.
- Photo/video uploads stored in Firebase Storage rather than external links.
- Trick deletion or archiving.
- Push notifications for streak reminders.
- PWA manifest for home-screen installation.

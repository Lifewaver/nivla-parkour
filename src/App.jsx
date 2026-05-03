// Nivla Parkour - Full app with Firebase auth + Firestore
// Replace ALL of src/App.jsx with this file.
//
// Requires: src/firebase.js, .env.local with Firebase keys, `firebase` package installed.

import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, Dumbbell, Calendar, Trophy, Plus, Flame, Search, X, ExternalLink,
  Check, Video, Target, TrendingUp, ChevronRight, ChevronDown, Play,
  LogOut, Shield, Eye, ArrowLeft, ScrollText, Star
} from 'lucide-react';
import { auth, db, googleProvider, ALLOWED_EMAILS, ADMIN_EMAILS, isAdmin } from './firebase';
import { GiAcrobatic, GiJumpAcross, GiHighKick, GiLeapfrog, GiMuscleUp, GiRunningNinja, GiContortionist, GiBodyBalance } from 'react-icons/gi';
import { MdSportsGymnastics } from 'react-icons/md';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';

const RELEASE_NOTES = [
  {
    version: '1.35',
    date: '2026-05-01',
    title: 'Bulk sync now actually moves videos to global',
    notes: [
      'Admin "📤 Push my entire trick library to community" used to copy personal videos into globalVideos but leave them in your personal library — so videos appeared twice on your own view after a sync.',
      'Now the button promotes personal videos to global AND clears them from your personal library in one step. Result count includes how many tricks had personal videos cleared.',
    ],
  },
  {
    version: '1.34',
    date: '2026-05-01',
    title: 'Trick Management: global-video sort + preview card',
    notes: [
      'New sort option "🌐 Videos" orders tricks by global video count (most first) — easy way to find tricks that still need a tutorial.',
      'Each row shows a small 🎥 N badge when the trick has global videos.',
      'Edit view now renders the live trick card below the Delete button so you can see exactly how the trick appears to users (with current name/category/difficulty edits + its global videos). Play buttons open the video in a new tab.',
    ],
  },
  {
    version: '1.33',
    date: '2026-05-01',
    title: 'Delete a trick from the edit view',
    notes: [
      'Admin → Trick Management edit view now has a clear "Delete this trick" button (red, with × icon) below Save/Cancel.',
      'Confirms with the same warning as the inline × button, and closes the edit view automatically on success.',
    ],
  },
  {
    version: '1.32',
    date: '2026-04-30',
    title: 'Use a session as a template',
    notes: [
      'Session detail modal gets a new 📋 Use as template action that opens a 3-step flow.',
      'Step 1: pick when — Tomorrow / Next open day / Same weekday next week / pick a custom date. The Tomorrow card flags REPLACES PLAN if a plan already exists.',
      'Step 2: tweak what carries — focus tricks (with × remove + add another), session character toggle (carry tags into the intent), duration hint toggle, plus a Why this session? note with a smart placeholder.',
      'Step 3: confirm — success state plus pattern detection: if you\'ve used the same trick set ≥3 times before, a prompt offers to save the shape as a named template.',
      'Templates persist via a new templates field; this commit adds saving (apply templates UI to come later).',
    ],
  },
  {
    version: '1.31',
    date: '2026-04-30',
    title: 'Sessions browser',
    notes: [
      'New Sessions screen reachable from the week strip footer (Sessions →), the Coming up card (View all →) or the Journal card (All sessions →).',
      'Search bar across trick names, focus tags and notes.',
      'Quick filter chips: All · 🔥 Hard · top 1–2 most-practiced tricks · top focus tag · 90+ min · ★ Milestones.',
      'Stats card: This month · Avg RPE (last 8) · Top focus tag.',
      'Sessions grouped by month with sticky headers, paginated 6 at a time per month.',
      'Tap a session card → full detail modal with RPE/Min/Tricks tiles, trick rows showing the new from → to status arrows when status was advanced in-session, focus tag chips, full note in a highlighted block, and a × Delete button.',
      'Mastered-this-session pill (★ Mastered) highlights milestone sessions with a soft green border.',
    ],
  },
  {
    version: '1.30',
    date: '2026-04-30',
    title: 'Today\'s session as five phases',
    notes: [
      'No more Warm up / Strength sub-tabs — everything sits on one scroll under a "Today\'s session" header.',
      'Five collapsible phase cards: Plan · Warm up · Strength · Train · Log. Each has a numbered circle that turns green ✓ when complete or amber when in progress, plus a one-line subtitle ("3/14 done", "1/2 touched"…).',
      'Five-segment progress bar above the cards mirrors phase state at a glance.',
      'New Train phase: per focus trick row with ▶ Tutorial shortcut and Same / → Next status buttons that advance the trick by one notch (not_started → want_to_learn → training → got_it).',
      'Trick advances captured during the session are saved onto the session record (trickStatusChanges) for future "from → to" arrows in the session detail modal.',
      'Today tab\'s Warm up / Strength / Log it buttons now scroll to and expand the matching phase card.',
    ],
  },
  {
    version: '1.29',
    date: '2026-04-30',
    title: 'One planning surface',
    notes: [
      'Removed the rich Upcoming sessions block from the Training log — the week strip + day sheets are now the only planning surface.',
      'Cleaner page: streak header → week strip → (selected day sheet) → 16-week heatmap → planning controls → log form → coming up → journal.',
    ],
  },
  {
    version: '1.28',
    date: '2026-04-30',
    title: 'Plan your week, in line',
    notes: [
      'New week strip at the top of the Training log: 7 day cells showing each day\'s state — done (green ✓), today (orange glow), planned (dashed purple + focus count), open (+ plan), or rest.',
      'Tap any day to expand a focused sheet right above the session: completed days show a recap (RPE / minutes / tricks / note + Open in journal); today links to the log form; planned/open days let you Suggest 3, add tricks, remove with ×, and write a "Why this session?" note.',
      'New per-day session intent saved as plannedSessionIntents — captures your reason for the session before it happens.',
      'Week navigation ‹ prev / next › with a one-line summary: "2 done · 1 today · 2 planned · 1 open".',
      'Coming up footer card surfaces the next 1–2 upcoming days as one-tap shortcuts back to the day sheet.',
    ],
  },
  {
    version: '1.27',
    date: '2026-04-30',
    title: 'Edges that draw themselves',
    notes: [
      'When you master a trick (✅ Got it), the connecting paths in the Skill Tree draw themselves with a glow over ~1.2s — the dopamine moment.',
      'Quest rewards now point at real achievement badges. Streak quests link to On Fire / Week Warrior, mastery quests link to First Steps / Getting Started / Leveling Up. The badge icon and name appear directly in the reward line.',
      '"Master 3 Medium" quest swapped to "Master 5 Medium" so it actually awards the Leveling Up badge.',
      'Daily / weekly quests stay standalone — finishing one is its own reward.',
    ],
  },
  {
    version: '1.26',
    date: '2026-04-30',
    title: 'Tree polish',
    notes: [
      'Path memory: the Tree tab remembers the last category you were viewing.',
      'New "🗝️ Newly unlocked" widget shows up to 3 tricks whose prerequisites you just met, ready to start.',
      'Newly unlocked nodes pulse with a yellow ring inside the graph itself.',
      'Tapping a node now opens a quick popover (name, difficulty, ▶ Reference / 🎓 Tutorial / 🎯 Focus / Open →) instead of jumping straight to the modal — keeps you in the climb-the-tree flow.',
      'Quest completion fires a celebration toast.',
      'Today suggestions now prioritize tricks you just unlocked over generic fallbacks.',
    ],
  },
  {
    version: '1.25',
    date: '2026-04-30',
    title: 'Quests in In Focus',
    notes: [
      'In Focus now opens with an Active quests panel. Daily, weekly, streak and milestone quests track live as you train.',
      'Quests: Train 3 focus tricks today · Log a session today · Train 3 sessions this week · 3-day streak · 7-day streak · First trick · Master 5 Easy · Master 3 Medium.',
      'Each quest shows a progress bar with the current count vs target and the reward. Completed quests collapse into a Completed (N) section.',
      'Phase 4 of the Skill Tree redesign — polish pass next.',
    ],
  },
  {
    version: '1.24',
    date: '2026-04-30',
    title: 'Pick your path',
    notes: [
      'Tree tab now opens to a world map: 7 category cards in a 2-column grid showing level, XP, mastered count and the boss for each category.',
      'In Focus has its own card at the top of the map.',
      'Tap a card to dive into that category\'s tree; a Back to map link returns you to the grid.',
      'Fully mastered categories get a gold border and a glow.',
      'Phase 3 of the Skill Tree redesign — quests still coming.',
    ],
  },
  {
    version: '1.23',
    date: '2026-04-30',
    title: 'XP, levels, and a boss to beat',
    notes: [
      'Each category now has its own XP and level. Easy = 10 XP, Medium = 25, Hard = 60, Super = 150. Partial XP for tricks in Training based on landing checkpoints.',
      'Levels go 1 → 6 as you fill the category: 0% = LVL 1, 10% = LVL 2, 25% = LVL 3, 50% = LVL 4, 75% = LVL 5, 100% = LVL 6.',
      'One Boss trick per category sits at the top of the tree with a flame border. Beat it (master it) to claim the category. Bosses: Double Backflip · Kong 180 Tac Tak · Atwist Gumbi · 360 Cat Leap · Swing gainer · Kong gainer · No-hand Cartwheel.',
      'Phase 2 of the Skill Tree redesign — world-select landing and quests still coming.',
    ],
  },
  {
    version: '1.22',
    date: '2026-04-30',
    title: 'Skill Tree, for real now',
    notes: [
      'Tree tab now shows an actual skill graph per category — nodes connected by glowing paths instead of a flat tier list.',
      'Tricks with prerequisites stay locked (🔒, faded) until the previous trick is mastered. Tap a node to open it; locked nodes are still readable so you can preview what\'s next.',
      'Edges light up green once both endpoints are mastered, purple once the prereq is done.',
      'Per-category mastered progress bar at the top, tinted by category color.',
      'Phase 1 of a bigger redesign — XP, boss tricks, world-select landing and quests still coming.',
    ],
  },
  {
    version: '1.21',
    date: '2026-04-30',
    title: 'One progress dot to rule them all',
    notes: [
      'Status pills on every trick card now show a single filled-circle indicator that fills as you progress: empty → quarter → half → three-quarters → full.',
      'The trick modal also uses the same dot — each status button shows the level it represents, so the four options read at a glance.',
      'Landing checkpoints in the modal swap 🤾 🛬 🪨 for plain numbered circles (1, 2, 3) with a check when complete. Labels Trampoline / Soft mat / Hard ground stay underneath.',
      'Color escalates with progress (slate → purple → yellow → green) so the state still pops at a glance.',
    ],
  },
  {
    version: '1.20',
    date: '2026-04-30',
    title: 'Not started is back',
    notes: [
      'Added a 4th status: ⚪ Not started — the new default for tricks you haven\'t engaged with yet.',
      'New users start with all tricks at Not started; the three picks they make in onboarding move to 👀 Want to learn.',
      'Existing tricks get a one-time cleanup: any Want to learn trick with no progress, notes, videos, coolness, goal or focus assignment moves back to Not started so you can curate your interest list properly.',
    ],
  },
  {
    version: '1.19',
    date: '2026-04-30',
    title: 'More wins, more color',
    notes: [
      'Smaller celebrations now fire when you hit a new landing checkpoint (trampoline, soft mat) — not just at full mastery.',
      'Streak milestones (3, 7, 14, 30, 50, 100 days) trigger a flame toast when you log a session.',
      'Logging a training session now actually bumps your streak (was a quiet bug).',
      'Category icons are tinted by category — orange means Flips, cyan means Jump, pink means Tricks, and so on.',
    ],
  },
  {
    version: '1.18',
    date: '2026-04-30',
    title: 'First-run onboarding',
    notes: [
      'Brand-new family members now get a 3-tap setup: pick 3 tricks to learn first, pick training weekdays, hit Let\'s go. Their picks land directly in Today.',
      'Existing users with any data are auto-marked as onboarded and skip the flow.',
      'Friendlier empty states across the app — clear nudges instead of dispiriting "no goals" placeholders.',
    ],
  },
  {
    version: '1.17',
    date: '2026-04-30',
    title: 'Today is the front door',
    notes: [
      'Home replaced with a single-purpose Today screen: tap to know what you\'re training, then go.',
      'One big card shows today\'s session — your locked focus tricks if planned, otherwise three smart suggestions with a Use these for today button.',
      'Three chunky buttons below: Warm up · Strength · Log it.',
      'Streak now lives as a small badge in the top-right; old stats / achievements / new-tricks blocks moved out of the front door (still in Progress and Tricks).',
    ],
  },
  {
    version: '1.16',
    date: '2026-04-30',
    title: 'Add-a-video: collapsed and multi-tag',
    notes: [
      'The Add a video box in the trick modal is collapsed by default — tap to expand.',
      'Reference and Tutorial are now multi-select tags: a single video can be tagged as either or both.',
      'Existing videos keep working unchanged; new "both"-tagged videos appear in both the Reference and Tutorial sections.',
    ],
  },
  {
    version: '1.15',
    date: '2026-04-30',
    title: 'Simpler status: just three',
    notes: [
      'Statuses collapsed to three: 👀 Want to learn, 💪 Training, ✅ Got it. Old statuses migrate automatically.',
      'Inside the trick modal, Training shows a horizontal progress bar with three checkpoints: trampoline → soft mat → hard ground.',
      'Tapping the Hard ground checkpoint flips status to ✅ Got it and checks the other two.',
      'Tapping ✅ Got it again reverts to 💪 Training, keeping landings as they are.',
    ],
  },
  {
    version: '1.14',
    date: '2026-04-30',
    title: 'Planing and Log',
    notes: [
      'New Planing and Log section under Training with a 16-week heatmap colored by session intensity.',
      'Plan which months, weeks-of-month and weekdays you train; future planned days get a purple ring on the heatmap.',
      'Up to 4 upcoming sessions show smart trick suggestions based on your focus, Training hard / Looking into status and mastered difficulty.',
      'Lock suggestions, dismiss those you don\'t want, or pick any trick from the dropdown — focus is saved per date.',
      'Copy last session shortcut pulls practiced tricks from your previous logged session.',
      'Log a session with date, duration, RPE slider, focus tag chips and practiced tricks (auto-prefilled from locked focus).',
      'Journal of every logged session embedded as a collapsible block at the bottom — each entry expands to show full details.',
      'Streak counter, total hours and milestone badges (10/25/50/100 sessions).',
    ],
  },
  {
    version: '1.13',
    date: '2026-04-30',
    title: 'Skill Tree expanded',
    notes: [
      'In Focus moved into the Skill Tree page as the first selectable category.',
      'Suggested for this week, locked focus and pools for Training hard / Looking into all live in one place.',
      'Every trick row in Flips, Tricks, Jump, Leap, Swings, Vaults and Gymnastics has a + Add button to push it into focus directly.',
      'Trick rows across Home, Skill Tree and Planing and Log share the same card layout: difficulty strip, category icon, name, badges, play buttons and status pill.',
    ],
  },
  {
    version: '1.12',
    date: '2026-04-30',
    title: 'Tricks tab filters',
    notes: [
      'All filters are now collapsed behind a Filters button with a badge that shows how many are active.',
      'New Video filter: All / No video / 📹 Reference / 🎓 Tutorial.',
      'New Stars filter: All / Unrated / 1+ / 2+ / 3+ / 4+ / 5★.',
      'Progress filter renamed and trimmed to landing-only options: No landing / Trampoline landing / Soft landing / Hard landing.',
      'Tricks are sorted alphabetically within each category.',
    ],
  },
  {
    version: '1.11',
    date: '2026-04-30',
    title: 'Status & Cool factor overhaul',
    notes: [
      'New Looking into status (👀) for tricks you\'re researching.',
      'Yes I can! is now Complete Master, with a celebration overlay when reached.',
      'Progress becomes a multi-select landing checklist (Trampoline / Soft / Hard) inside the trick modal — Complete Master unlocks once all three are checked.',
      'Clicking Hard landing auto-checks the others and triggers Complete Master.',
      'Cool factor: rate every trick 1–5 stars from the modal header.',
      'Kicks category renamed to Tricks — existing data migrates automatically.',
    ],
  },
  {
    version: '1.10',
    date: '2026-04-29',
    title: 'Global trick library',
    notes: [
      'Admins can promote videos to global so every family member sees them on a trick.',
      'Approved trick suggestions land in a shared community list available to everyone on next load.',
      'Bulk sync button in the Admin panel pushes the admin\'s entire trick library and personal videos to the community.',
      'Admins can remove tricks from the global list with one click — gone for everyone next sign-in.',
    ],
  },
  {
    version: '1.9',
    date: '2026-04-29',
    title: 'Videos & suggestions',
    notes: [
      'Trick modal now embeds YouTube / Vimeo videos inline with autoplay when launched from the trick card.',
      'Pick which video plays from the card by tapping the star next to a video — separate primary for reference and tutorial.',
      'Family members can submit trick suggestions from the Add tab; admins approve, deny or delete from a new section in the Admin panel.',
      'Improvement suggestions: a Suggest an improvement button in Release Notes opens a form. Admins respond Yes / No and the status updates on the user\'s submission.',
    ],
  },
  {
    version: '1.8',
    date: '2026-04-28',
    title: 'Trick management for admins',
    notes: ['Admins can now edit any trick\'s name, category, and difficulty directly from the Admin panel.', 'Changes apply globally — all family members see the updated values on next load.', 'Overridden tricks are highlighted with an edit indicator in the list.'],
  },
  {
    version: '1.7',
    date: '2026-04-28',
    title: 'Gymnastics category',
    notes: ['Merged Trampoline, Tumbling, and Floor into a single Gymnastics category.', 'Existing trick progress is preserved — all 24 tricks are migrated automatically on next load.'],
  },
  {
    version: '1.6',
    date: '2026-04-28',
    title: 'Parkour category icons',
    notes: ['Replaced emoji category labels with proper SVG icons from Game Icons and Material Design.', 'Each category now has a dedicated movement icon: acrobatic (Flips), jump across (Jump), high kick (Kicks), leapfrog (Leap), muscle-up (Swings), running ninja (Vaults), gymnastics (Trampoline), contortionist (Tumbling), body balance (Floor).'],
  },
  {
    version: '1.5',
    date: '2026-04-28',
    title: 'Access request flow',
    notes: ['New users can now request access directly from the login screen by signing in with Google.', 'Pending requests appear in the Admin panel where they can be approved or denied.', 'Approved users can sign in immediately without any code changes needed.'],
  },
  {
    version: '1.4',
    date: '2026-04-27',
    title: 'Home screen quick links updated',
    notes: ['Replaced the "Browse Tricks" quick link with a "Strength" shortcut that navigates directly to the Strength section of the Training tab.'],
  },
  {
    version: '1.3',
    date: '2026-04-27',
    title: 'Conditioning renamed to Strength',
    notes: ['The Training tab section previously labelled "Conditioning" is now called "Strength" throughout the app. Existing data is unaffected.'],
  },
  {
    version: '1.2',
    date: '2026-04-27',
    title: 'This Week\'s Focus',
    notes: ['Renamed "Tricks of the Day" to "This Week\'s Focus" on the home screen.', 'Suggested tricks now stay consistent for the entire week instead of changing daily.'],
  },
  {
    version: '1.1',
    date: '2026-04-27',
    title: 'Admin panel',
    notes: ['New Admin tab (visible to admins only) showing all family members who have signed in.', 'Admins can view a read-only summary of any user\'s tricks, training days, weekly goals, journal entries, and warmup/strength completions.'],
  },
  {
    version: '1.0',
    date: '2026-04-27',
    title: 'Initial release',
    notes: ['Google Sign-In with family allowlist.', '92 parkour tricks across 9 categories with 6-step mastery progression.', 'Training streak tracking and daily log.', 'Warmup and strength routines with countdown timers.', 'Weekly goal setting with smart suggestions.', 'Training journal and history view.', 'Progress tab with badges and category breakdowns.', 'Add custom tricks.'],
  },
];

const STATUS_LEVELS = [
  { id: 'not_started', label: 'Not started', color: 'bg-slate-700', textColor: 'text-slate-200', emoji: '⚪' },
  { id: 'want_to_learn', label: 'Want to learn', color: 'bg-purple-500', textColor: 'text-purple-100', emoji: '👀' },
  { id: 'training', label: 'Training', color: 'bg-yellow-500', textColor: 'text-yellow-100', emoji: '💪' },
  { id: 'got_it', label: 'Got it', color: 'bg-green-500', textColor: 'text-green-100', emoji: '✅' },
];

const LANDING_LEVELS = [
  { id: 'trampoline_landing', label: 'Trampoline', emoji: '🤾', color: 'bg-cyan-500', textColor: 'text-cyan-100' },
  { id: 'soft_landing', label: 'Soft mat', emoji: '🛬', color: 'bg-blue-500', textColor: 'text-blue-100' },
  { id: 'hard_landing', label: 'Hard ground', emoji: '🪨', color: 'bg-stone-500', textColor: 'text-stone-100' },
];

const LANDING_IDS = LANDING_LEVELS.map(l => l.id);

const isTutorialVideo = (v) => v?.type === 'tutorial' || v?.type === 'both';
const isReferenceVideo = (v) => v?.type !== 'tutorial';
const computeVideoType = (isReference, isTutorial) => {
  if (isReference && isTutorial) return 'both';
  if (isTutorial) return 'tutorial';
  return 'reference';
};

const migrateStatus = (s) => {
  if (s === 'got_it' || s === 'training' || s === 'want_to_learn' || s === 'not_started') return s;
  if (s === 'yes_i_can' || s === 'hard_landing') return 'got_it';
  if (s === 'training_hard' || s === 'trampoline_landing' || s === 'soft_landing' || s === 'training_like_hell') return 'training';
  if (s === 'looking_into') return 'want_to_learn';
  return 'not_started';
};

const DIFFICULTY_COLORS = {
  Easy: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', strip: 'bg-green-500' },
  Medium: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', strip: 'bg-blue-500' },
  Hard: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', strip: 'bg-orange-500' },
  Super: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', strip: 'bg-purple-500' },
};

const CATEGORY_ICONS = {
  Flips: '🤸', Jump: '🤾‍♂️', Tricks: '🥋', Leap: '🐆', Swings: '🦧',
  Vaults: '🧗', Gymnastics: '🤸',
};

const CATEGORY_ICON_COMPONENTS = {
  Flips: GiAcrobatic,
  Jump: GiJumpAcross,
  Tricks: GiHighKick,
  Leap: GiLeapfrog,
  Swings: GiMuscleUp,
  Vaults: GiRunningNinja,
  Gymnastics: MdSportsGymnastics,
};

const CATEGORY_COLORS = {
  Flips:      { hex: '#fb923c', text: 'text-orange-300',  border: 'border-orange-500/40',  bg: 'bg-orange-500/10'  },
  Jump:       { hex: '#22d3ee', text: 'text-cyan-300',    border: 'border-cyan-500/40',    bg: 'bg-cyan-500/10'    },
  Tricks:     { hex: '#f472b6', text: 'text-pink-300',    border: 'border-pink-500/40',    bg: 'bg-pink-500/10'    },
  Leap:       { hex: '#34d399', text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
  Swings:     { hex: '#fbbf24', text: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10'   },
  Vaults:     { hex: '#fb7185', text: 'text-rose-300',    border: 'border-rose-500/40',    bg: 'bg-rose-500/10'    },
  Gymnastics: { hex: '#7dd3fc', text: 'text-sky-300',     border: 'border-sky-500/40',     bg: 'bg-sky-500/10'     },
};

function CategoryIcon({ category, size = 22, className = '', tint = true }) {
  const Icon = CATEGORY_ICON_COMPONENTS[category];
  const color = tint ? CATEGORY_COLORS[category]?.hex : undefined;
  const style = color ? { color } : undefined;
  if (!Icon) return <span className={className} style={style}>{CATEGORY_ICONS[category]}</span>;
  return <Icon size={size} className={className} style={style} />;
}

// Maps status + landing progress to a 0..4 fill level for the progress dot.
// 0 = not_started · 1 = want_to_learn · 2 = training (<2 landings) · 3 = training (≥2 landings) · 4 = got_it
function progressLevelFor(trick) {
  if (!trick) return 0;
  if (trick.status === 'got_it') return 4;
  if (trick.status === 'training') {
    const checked = (Array.isArray(trick.progress) ? trick.progress : []).filter(p => LANDING_IDS.includes(p)).length;
    return checked >= 2 ? 3 : 2;
  }
  if (trick.status === 'want_to_learn') return 1;
  return 0;
}

const PROGRESS_TONES = [
  { fg: '#64748b', bg: 'bg-slate-700/60',  border: 'border-slate-600' },     // not_started
  { fg: '#a855f7', bg: 'bg-purple-500/20', border: 'border-purple-500/50' }, // want_to_learn
  { fg: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' }, // training
  { fg: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' }, // training + landings
  { fg: '#22c55e', bg: 'bg-green-500/20',  border: 'border-green-500/50' },  // got_it
];

function ProgressDot({ level = 0, size = 16, color }) {
  const lv = Math.max(0, Math.min(4, level));
  const fg = color || PROGRESS_TONES[lv].fg;
  const r = 6.4;
  const cx = 8;
  const cy = 8;
  const fillFraction = lv / 4;
  let fillPath = null;
  if (fillFraction >= 1) {
    fillPath = <circle cx={cx} cy={cy} r={r} fill={fg} />;
  } else if (fillFraction > 0) {
    const angle = fillFraction * 2 * Math.PI;
    const startX = cx;
    const startY = cy - r;
    const endX = cx + r * Math.sin(angle);
    const endY = cy - r * Math.cos(angle);
    const largeArc = fillFraction > 0.5 ? 1 : 0;
    fillPath = <path d={`M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`} fill={fg} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={fg} strokeWidth="1.4" />
      {fillPath}
    </svg>
  );
}

function StatusPill({ trick, onClick, title, size = 'md' }) {
  const level = progressLevelFor(trick);
  const tone = PROGRESS_TONES[level];
  const status = STATUS_LEVELS.find(s => s.id === trick?.status) || STATUS_LEVELS[0];
  const dotSize = size === 'sm' ? 14 : 18;
  const ringClass = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp onClick={onClick} title={title || status.label}
      className={`inline-flex flex-shrink-0 items-center justify-center ${ringClass} rounded-full border ${tone.bg} ${tone.border}`}>
      <ProgressDot level={level} size={dotSize} />
    </Comp>
  );
}

const LOADING_ICONS = [
  GiRunningNinja, GiAcrobatic, GiJumpAcross, GiLeapfrog,
  GiMuscleUp, GiHighKick, GiContortionist, GiBodyBalance,
];

function LoadingIcon({ size = 72, className = '' }) {
  const [Icon] = useState(() => LOADING_ICONS[Math.floor(Math.random() * LOADING_ICONS.length)]);
  return <Icon size={size} className={`animate-bounce text-purple-300 ${className}`} />;
}

const INITIAL_TRICKS = [
  { id: 1, name: 'Front Flip', difficulty: 'Easy', category: 'Flips' },
  { id: 2, name: 'Wallflip', difficulty: 'Medium', category: 'Flips' },
  { id: 3, name: 'Side Flips', difficulty: 'Medium', category: 'Flips' },
  { id: 4, name: 'Double sideflip', difficulty: 'Super', category: 'Flips' },
  { id: 5, name: 'Backflip', difficulty: 'Medium', category: 'Flips' },
  { id: 6, name: 'Double backflip', difficulty: 'Super', category: 'Flips' },
  { id: 7, name: 'Side Roll Back Flip', difficulty: 'Hard', category: 'Flips' },
  { id: 8, name: 'Gainer', difficulty: 'Medium', category: 'Flips' },
  { id: 9, name: 'Cork', difficulty: 'Medium', category: 'Flips' },
  { id: 10, name: 'Press', difficulty: 'Easy', category: 'Jump' },
  { id: 11, name: 'Tic Tac', difficulty: 'Easy', category: 'Jump' },
  { id: 12, name: 'Tic Tac Kong', difficulty: 'Medium', category: 'Jump' },
  { id: 13, name: 'Tic Tac Dash', difficulty: 'Medium', category: 'Jump' },
  { id: 14, name: '270 Tic Tak', difficulty: 'Medium', category: 'Jump' },
  { id: 15, name: '180 Tic Tak Handspring', difficulty: 'Hard', category: 'Jump' },
  { id: 16, name: '181 Tic Tac Cart', difficulty: 'Hard', category: 'Jump' },
  { id: 17, name: 'Kong 180 Tac Tak', difficulty: 'Hard', category: 'Jump' },
  { id: 18, name: 'Strikes', difficulty: 'Easy', category: 'Jump' },
  { id: 19, name: 'Jump Up', difficulty: 'Easy', category: 'Jump' },
  { id: 20, name: 'Climb up', difficulty: 'Medium', category: 'Jump' },
  { id: 21, name: 'Cork (Jump)', difficulty: 'Medium', category: 'Jump' },
  { id: 22, name: 'Cork Olley', difficulty: 'Medium', category: 'Jump' },
  { id: 23, name: 'Cork Swipe', difficulty: 'Hard', category: 'Jump' },
  { id: 24, name: 'Ballout (trampoline)', difficulty: 'Easy', category: 'Jump' },
  { id: 25, name: 'Cody (Trampoline)', difficulty: 'Easy', category: 'Jump' },
  { id: 26, name: 'Kabome (Trampoline)', difficulty: 'Easy', category: 'Jump' },
  { id: 27, name: 'Roll', difficulty: 'Easy', category: 'Jump' },
  { id: 28, name: 'Dive Roll', difficulty: 'Easy', category: 'Jump' },
  { id: 29, name: '360 Dive Roll', difficulty: 'Medium', category: 'Jump' },
  { id: 30, name: 'High Dive Roll', difficulty: 'Easy', category: 'Jump' },
  { id: 31, name: 'High Dive Roll Cart', difficulty: 'Hard', category: 'Jump' },
  { id: 32, name: 'Dive Roll Gap', difficulty: 'Medium', category: 'Jump' },
  { id: 33, name: 'Cartwheel in Roll out', difficulty: 'Medium', category: 'Jump' },
  { id: 34, name: 'Twist Cart', difficulty: 'Hard', category: 'Tricks' },
  { id: 35, name: 'Atwist Gumbi', difficulty: 'Hard', category: 'Tricks' },
  { id: 36, name: 'Kick the Moon', difficulty: 'Medium', category: 'Tricks' },
  { id: 37, name: 'Turtle walk', difficulty: 'Medium', category: 'Tricks' },
  { id: 38, name: 'Coin Drop', difficulty: 'Medium', category: 'Tricks' },
  { id: 39, name: 'Helicoptero', difficulty: 'Medium', category: 'Tricks' },
  { id: 40, name: 'Windmill', difficulty: 'Medium', category: 'Tricks' },
  { id: 41, name: 'Flare', difficulty: 'Medium', category: 'Tricks' },
  { id: 42, name: 'Butterfly', difficulty: 'Medium', category: 'Tricks' },
  { id: 43, name: '180 Cat to Cat', difficulty: 'Medium', category: 'Leap' },
  { id: 44, name: 'Kong to Cat Leap', difficulty: 'Medium', category: 'Leap' },
  { id: 45, name: '360 Cat Leap', difficulty: 'Medium', category: 'Leap' },
  { id: 46, name: 'Swing to cat leap', difficulty: 'Hard', category: 'Swings' },
  { id: 47, name: 'Lache Catch', difficulty: 'Easy', category: 'Swings' },
  { id: 48, name: 'Swing gainer', difficulty: 'Hard', category: 'Swings' },
  { id: 49, name: 'Swing press', difficulty: 'Medium', category: 'Swings' },
  { id: 50, name: 'Swing to Lazy Vault', difficulty: 'Medium', category: 'Swings' },
  { id: 51, name: 'Swing reverse', difficulty: 'Medium', category: 'Swings' },
  { id: 52, name: 'Reverse Vault', difficulty: 'Easy', category: 'Vaults' },
  { id: 53, name: 'Side/Back Roll', difficulty: 'Easy', category: 'Vaults' },
  { id: 54, name: 'Speed Vault', difficulty: 'Easy', category: 'Vaults' },
  { id: 55, name: 'Step Through', difficulty: 'Easy', category: 'Vaults' },
  { id: 56, name: 'Step Through reverse', difficulty: 'Medium', category: 'Vaults' },
  { id: 57, name: 'Kong Vaults', difficulty: 'Medium', category: 'Vaults' },
  { id: 58, name: 'Kong Press', difficulty: 'Medium', category: 'Vaults' },
  { id: 59, name: 'Kong gainer', difficulty: 'Hard', category: 'Vaults' },
  { id: 60, name: 'Dash Vaults', difficulty: 'Medium', category: 'Vaults' },
  { id: 61, name: 'Dash press', difficulty: 'Medium', category: 'Vaults' },
  { id: 62, name: 'Double Kong', difficulty: 'Medium', category: 'Vaults' },
  { id: 63, name: 'Kong Dive Roll', difficulty: 'Medium', category: 'Vaults' },
  { id: 64, name: 'Back Handspring', difficulty: 'Hard', category: 'Vaults' },
  { id: 65, name: 'Buttspin', difficulty: 'Easy', category: 'Vaults' },
  { id: 66, name: 'Gate Vault', difficulty: 'Medium', category: 'Vaults' },
  { id: 67, name: 'Palm Spin', difficulty: 'Easy', category: 'Vaults' },
  { id: 68, name: 'Wall Spin', difficulty: 'Medium', category: 'Vaults' },
  { id: 69, name: 'Tucked', difficulty: 'Easy', category: 'Gymnastics' },
  { id: 70, name: 'PIK (Pike)', difficulty: 'Medium', category: 'Gymnastics' },
  { id: 71, name: 'Straight', difficulty: 'Medium', category: 'Gymnastics' },
  { id: 72, name: 'Tucked 180', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 73, name: 'PIK 180', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 74, name: 'Straight 180', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 75, name: 'Tucked 360', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 76, name: 'PIK 360', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 77, name: 'Straight 360', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 78, name: 'Table to Stand', difficulty: 'Medium', category: 'Gymnastics' },
  { id: 79, name: 'Round-off', difficulty: 'Easy', category: 'Gymnastics' },
  { id: 80, name: 'Cartwheel', difficulty: 'Easy', category: 'Gymnastics' },
  { id: 81, name: 'One-hand Cartwheel', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 82, name: 'No-hand Cartwheel', difficulty: 'Super', category: 'Gymnastics' },
  { id: 83, name: 'Round-off Back Handspring', difficulty: 'Medium', category: 'Gymnastics' },
  { id: 84, name: 'Round-off Back Handspring x2', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 85, name: 'Round-off Handspring', difficulty: 'Medium', category: 'Gymnastics' },
  { id: 86, name: 'Round-off Salto', difficulty: 'Medium', category: 'Gymnastics' },
  { id: 87, name: 'Round-off Back Handspring - Salto', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 88, name: 'Round-off Front Salto', difficulty: 'Easy', category: 'Gymnastics' },
  { id: 89, name: 'Round-off Front Salto - Handspring', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 90, name: 'Handstand', difficulty: 'Medium', category: 'Gymnastics' },
  { id: 91, name: 'Pike Sit', difficulty: 'Hard', category: 'Gymnastics' },
  { id: 92, name: 'Spider', difficulty: 'Medium', category: 'Gymnastics' },
];

const BADGES = [
  { id: 'first_trick', name: 'First Steps', desc: 'Master your first trick', icon: '🌟', check: (s) => s.mastered >= 1 },
  { id: 'easy_5', name: 'Getting Started', desc: 'Master 5 Easy tricks', icon: '🎯', check: (s) => s.easyMastered >= 5 },
  { id: 'easy_10', name: 'Easy Rider', desc: 'Master 10 Easy tricks', icon: '⭐', check: (s) => s.easyMastered >= 10 },
  { id: 'medium_5', name: 'Leveling Up', desc: 'Master 5 Medium tricks', icon: '🔥', check: (s) => s.mediumMastered >= 5 },
  { id: 'medium_10', name: 'Mid-Tier Beast', desc: 'Master 10 Medium tricks', icon: '💪', check: (s) => s.mediumMastered >= 10 },
  { id: 'hard_1', name: 'Brave Heart', desc: 'Master your first Hard trick', icon: '⚡', check: (s) => s.hardMastered >= 1 },
  { id: 'hard_5', name: 'Hardcore', desc: 'Master 5 Hard tricks', icon: '🏆', check: (s) => s.hardMastered >= 5 },
  { id: 'super_1', name: 'Superhuman', desc: 'Master a Super trick!', icon: '👑', check: (s) => s.superMastered >= 1 },
  { id: 'mastered_25', name: 'Quarter Master', desc: 'Master 25 tricks total', icon: '🎖️', check: (s) => s.mastered >= 25 },
  { id: 'mastered_50', name: 'Half Century', desc: 'Master 50 tricks total', icon: '🏅', check: (s) => s.mastered >= 50 },
  { id: 'streak_3', name: 'On Fire', desc: '3 day training streak', icon: '🔥', check: (s) => s.streak >= 3 },
  { id: 'streak_7', name: 'Week Warrior', desc: '7 day training streak', icon: '🚀', check: (s) => s.streak >= 7 },
  { id: 'streak_30', name: 'Unstoppable', desc: '30 day training streak', icon: '💎', check: (s) => s.streak >= 30 },
  { id: 'vault_master', name: 'Vault Master', desc: 'Master 5 Vaults', icon: '🏃', check: (s) => s.vaultMastered >= 5 },
  { id: 'flip_master', name: 'Flip Master', desc: 'Master 5 Flips', icon: '🤸', check: (s) => s.flipMastered >= 5 },
];

// Format a Date in LOCAL time as YYYY-MM-DD. Avoids the UTC shift you get from
// .toISOString() which made e.g. Saturday-after-local-midnight render as Friday
// in any timezone east of UTC.
const formatLocalDate = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};
const todayLocal = () => formatLocalDate(new Date());

// =================================================================
// FIRESTORE HELPERS
// =================================================================
async function loadUserData(uid, key) {
  try {
    const ref = doc(db, 'users', uid, 'data', key);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data().value;
    return null;
  } catch (e) { console.error('Load error', key, e); return null; }
}

async function saveUserData(uid, key, value) {
  try {
    const ref = doc(db, 'users', uid, 'data', key);
    await setDoc(ref, { value, updatedAt: Date.now() });
  } catch (e) { console.error('Save error', key, e); }
}

// =================================================================
// LOGIN SCREEN
// =================================================================
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LoginScreen({ error, requestStatus }) {
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Sign in error', e);
      alert('Could not sign in: ' + e.message);
    }
  };

  const bg = 'min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4';

  if (requestStatus === 'submitted') {
    return (
      <div className={bg}>
        <div className="max-w-sm w-full text-center">
          <div className="text-7xl mb-6">📬</div>
          <h1 className="text-3xl font-black text-white mb-3">Request submitted!</h1>
          <p className="text-slate-400 mb-8">An admin will review your request. Sign in again once you've been approved.</p>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-sm text-red-300 text-left">
              {error}
            </div>
          )}
          <button onClick={handleSignIn} className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-xl">
            <GoogleIcon /> Check if approved
          </button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'pending') {
    return (
      <div className={bg}>
        <div className="max-w-sm w-full text-center">
          <div className="text-7xl mb-6">⏳</div>
          <h1 className="text-3xl font-black text-white mb-3">Request pending</h1>
          <p className="text-slate-400 mb-8">Your request is waiting for admin approval. Check back soon!</p>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-sm text-red-300 text-left">
              {error}
            </div>
          )}
          <button onClick={handleSignIn} className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-xl">
            <GoogleIcon /> Check if approved
          </button>
        </div>
      </div>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <div className={bg}>
        <div className="max-w-sm w-full text-center">
          <div className="text-7xl mb-6">🚫</div>
          <h1 className="text-3xl font-black text-white mb-3">Access not approved</h1>
          <p className="text-slate-400 mb-8">Your request was not approved. Contact a family admin if you think this is a mistake.</p>
          <button onClick={handleSignIn}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-xl">
            <GoogleIcon /> Try a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={bg}>
      <div className="max-w-sm w-full text-center">
        <div className="text-7xl mb-6">🤸</div>
        <h1 className="text-4xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
          NIVLA PARKOUR
        </h1>
        <p className="text-slate-400 mb-8">Your personal training journal</p>
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-sm text-red-300">
            {error}
          </div>
        )}
        <button
          onClick={handleSignIn}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-xl"
        >
          <GoogleIcon /> Sign in with Google
        </button>
        <div className="mt-6 border-t border-slate-700 pt-6">
          <p className="text-sm text-slate-400 mb-3">Don't have access yet?</p>
          <button
            onClick={handleSignIn}
            className="w-full border border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-purple-200 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition"
          >
            <GoogleIcon /> Request access
          </button>
          <p className="text-xs text-slate-500 mt-3">Sign in with Google to submit a request. An admin will approve it.</p>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// ERROR BOUNDARY
// =================================================================
// React errors during render kill the whole tree to a blank screen with no
// recovery. iOS Safari users would see this as "the app crashed" — Reload /
// Sign out lets them recover without us needing to push a fix.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error?.message || this.state.error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4 text-white">
        <div className="max-w-sm w-full text-center">
          <div className="text-7xl mb-6">😬</div>
          <h1 className="text-2xl font-black mb-3">Something went wrong</h1>
          <p className="text-slate-400 mb-5 text-sm">The app hit an unexpected error. Try Reload first; if that doesn't help, Sign out and back in.</p>
          <div className="bg-slate-800/50 border border-red-500/30 rounded-xl p-3 mb-5 text-[11px] text-red-300 text-left font-mono break-all max-h-40 overflow-auto">
            {msg}
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()}
              className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 px-4 rounded-xl transition">
              Reload
            </button>
            <button onClick={async () => {
              try { await signOut(auth); } catch (e) { console.error('Sign out error', e); }
              window.location.reload();
            }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl transition">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// =================================================================
// AUTH WRAPPER
// =================================================================
export default function ParkourApp() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null); // null | 'pending' | 'submitted' | 'rejected'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fast path: hardcoded family emails and admins
        if (ALLOWED_EMAILS.includes(firebaseUser.email)) {
          setAuthError(null);
          setRequestStatus(null);
          setUser(firebaseUser);
          try {
            await setDoc(doc(db, 'userProfiles', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              lastSignIn: Date.now(),
            }, { merge: true });
          } catch (e) {
            console.error('Profile save error', e);
          }
          setAuthChecking(false);
          return;
        }

        // Check if dynamically approved by admin
        let approvedReadError = null;
        try {
          const approvedDoc = await getDoc(doc(db, 'approvedUsers', firebaseUser.uid));
          if (approvedDoc.exists()) {
            setAuthError(null);
            setRequestStatus(null);
            setUser(firebaseUser);
            try {
              await setDoc(doc(db, 'userProfiles', firebaseUser.uid), {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                lastSignIn: Date.now(),
              }, { merge: true });
            } catch (e) {}
            setAuthChecking(false);
            return;
          }
        } catch (e) {
          console.error('Approved check error', e);
          approvedReadError = e;
        }

        // Not approved — check or create an access request
        try {
          const requestRef = doc(db, 'accessRequests', firebaseUser.uid);
          const requestDoc = await getDoc(requestRef);
          if (requestDoc.exists()) {
            const status = requestDoc.data().status;
            if (status === 'rejected') {
              setRequestStatus('rejected');
            } else if (status === 'approved') {
              // Admin approved but we couldn't verify approvedUsers — surface the rule issue.
              setRequestStatus('pending');
              setAuthError(
                approvedReadError
                  ? `You were approved, but reading approvedUsers failed (${approvedReadError.code || approvedReadError.message}). Firestore rules need to allow users to read their own approvedUsers/{uid} doc.`
                  : 'You were approved, but the approval record is missing. Ask the admin to re-approve.'
              );
            } else {
              setRequestStatus('pending');
            }
          } else {
            await setDoc(requestRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              requestedAt: Date.now(),
              status: 'pending',
            });
            setRequestStatus('submitted');
          }
        } catch (e) {
          console.error('Request error', e);
          setRequestStatus('submitted'); // show submitted screen so they know to try again
          setAuthError(`Request may not have saved (${e.code || e.message}). Please try again.`);
        }
        await signOut(auth);
      } else {
        setUser(null);
      }
      setAuthChecking(false);
    });
    return unsub;
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center"><LoadingIcon size={72} /></div>
          <div className="text-white text-xl font-bold">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen error={authError} requestStatus={requestStatus} />;

  return (
    <ErrorBoundary>
      <MainApp user={user} key={user.uid} />
    </ErrorBoundary>
  );
}

// =================================================================
// ONBOARDING
// =================================================================
function OnboardingFlow({ tricks, userName, onFinish, onSkip }) {
  const [step, setStep] = useState(1);
  const [pickedTrickIds, setPickedTrickIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [pickedDifficulty, setPickedDifficulty] = useState('Easy');

  const filteredTricks = useMemo(() => {
    const base = pickedDifficulty === 'All'
      ? tricks
      : tricks.filter(t => t.difficulty === pickedDifficulty);
    return base.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [tricks, pickedDifficulty]);
  const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Super', 'All'];

  const toggleTrick = (id) => {
    setPickedTrickIds(curr => {
      if (curr.includes(id)) return curr.filter(x => x !== id);
      if (curr.length >= 3) return curr;
      return [...curr, id];
    });
  };

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onFinish({ trickIds: pickedTrickIds });
    } finally {
      setSubmitting(false);
    }
  };

  const StepDots = () => (
    <div className="flex items-center gap-1.5">
      {[1, 2].map(n => (
        <span key={n}
          className={`w-2 h-2 rounded-full transition ${n === step ? 'bg-purple-400 w-6' : n < step ? 'bg-purple-600' : 'bg-slate-700'}`} />
      ))}
    </div>
  );

  const firstName = (userName || '').split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-purple-500/20 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <StepDots />
          <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-200">Skip</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-purple-300 mb-1">Welcome, {firstName} 👋</div>
              <h1 className="text-3xl font-black leading-tight">Pick up to 3 tricks you want to learn first</h1>
              <p className="text-sm text-slate-400 mt-2">Already a flyer? Bump the difficulty up. You can always change your mind later.</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Difficulty</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {difficultyOptions.map(d => {
                  const on = pickedDifficulty === d;
                  const col = d !== 'All' ? DIFFICULTY_COLORS[d] : null;
                  return (
                    <button key={d} onClick={() => setPickedDifficulty(d)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition border ${on ? (col ? `${col.strip} text-white border-transparent` : 'bg-slate-100 text-slate-900 border-slate-100') : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-xs text-slate-400">{pickedTrickIds.length} / 3 picked · {filteredTricks.length} {filteredTricks.length === 1 ? 'trick' : 'tricks'} at this level</div>
            {filteredTricks.length === 0 ? (
              <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-400">No tricks at this difficulty.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredTricks.map(t => {
                  const picked = pickedTrickIds.includes(t.id);
                  const diff = DIFFICULTY_COLORS[t.difficulty];
                  const disabled = !picked && pickedTrickIds.length >= 3;
                  return (
                    <button key={t.id} onClick={() => toggleTrick(t.id)} disabled={disabled}
                      className={`relative text-left rounded-xl p-3 border transition ${picked ? 'bg-purple-500/30 border-purple-400 ring-2 ring-purple-400' : disabled ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800/70 border-slate-700 hover:bg-slate-800'}`}>
                      {picked && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-400 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <CategoryIcon category={t.category} size={32} className="text-slate-200 mb-2" />
                      <div className="font-bold text-sm leading-tight pr-8">{t.name}</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
                        <span className="text-[10px] text-slate-500">{t.category}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-purple-300 mb-1">All set</div>
              <h1 className="text-3xl font-black leading-tight">Let's go 🚀</h1>
              <p className="text-sm text-slate-400 mt-2">Your picks are locked in. Tap Today to start.</p>
            </div>
            <div className="bg-slate-800/70 border border-purple-500/30 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-purple-300">Locked in for today</div>
              {pickedTrickIds.length === 0 ? (
                <div className="text-sm text-slate-400 italic">No tricks picked — tap back to pick some.</div>
              ) : (
                pickedTrickIds.map(id => {
                  const t = tricks.find(x => x.id === id);
                  if (!t) return null;
                  const diff = DIFFICULTY_COLORS[t.difficulty];
                  return (
                    <div key={id} className="flex items-center gap-3 bg-slate-900/60 border border-slate-700 rounded-xl p-2.5">
                      <div className={`w-1 h-10 ${diff?.strip} rounded-full flex-shrink-0`} />
                      <CategoryIcon category={t.category} size={18} className="text-slate-300 flex-shrink-0" />
                      <span className="font-bold text-sm flex-1 truncate">{t.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-purple-500/20 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm">
              Back
            </button>
          )}
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)}
              disabled={pickedTrickIds.length === 0}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition">
              {pickedTrickIds.length === 0 ? 'Pick at least 1 to continue' : 'Continue →'}
            </button>
          ) : (
            <button onClick={handleFinish} disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold disabled:opacity-50 transition">
              {submitting ? 'Setting up…' : "Let's go 🚀"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =================================================================
// MAIN APP
// =================================================================
function MainApp({ user }) {
  const [activeTab, setActiveTab] = useState('home');
  const [trainingSection, setTrainingSection] = useState(null);
  const [profileIsAdmin, setProfileIsAdmin] = useState(false);
  const userIsAdmin = isAdmin(user.email) || profileIsAdmin;
  const [tricks, setTricks] = useState([]);
  const [trainingDays, setTrainingDays] = useState([]);
  const [journal, setJournal] = useState([]);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [plannedDays, setPlannedDays] = useState([]);
  const [plannedMonths, setPlannedMonths] = useState([]);
  const [plannedWeeks, setPlannedWeeks] = useState([]);
  const [plannedSessionFocus, setPlannedSessionFocus] = useState({});
  const [plannedSessionIntents, setPlannedSessionIntents] = useState({});
  const [templates, setTemplates] = useState([]);
  const [globalVideos, setGlobalVideos] = useState({});
  const [communityTricks, setCommunityTricks] = useState([]);
  const [viewedTricks, setViewedTricks] = useState([]);
  const [selectedTrick, setSelectedTrick] = useState(null);
  const [autoplayVideoUrl, setAutoplayVideoUrl] = useState(null);
  const openTrick = (trick, videoUrl = null) => {
    setSelectedTrick(trick);
    setAutoplayVideoUrl(videoUrl);
    if (trick && trick.id != null && !viewedTricks.includes(trick.id)) {
      const next = [...viewedTricks, trick.id];
      setViewedTricks(next);
      saveUserData(user.uid, 'viewedTricks', next).catch(e => console.error('Save viewed error', e));
    }
  };
  const closeTrick = () => { setSelectedTrick(null); setAutoplayVideoUrl(null); };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterDifficulty, setFilterDifficulty] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterTracker, setFilterTracker] = useState([]);
  const [filterVideo, setFilterVideo] = useState([]);
  const [filterVideoLabel, setFilterVideoLabel] = useState([]);
  const [filterStars, setFilterStars] = useState([]);
  const [filterUnseen, setFilterUnseen] = useState([]);
  const [celebrationTrick, setCelebrationTrick] = useState(null);
  const [celebrationToast, setCelebrationToast] = useState(null);

  const fireCelebration = (toast) => {
    setCelebrationToast(toast);
    setTimeout(() => setCelebrationToast(t => (t && t._id === toast._id ? null : t)), 1800);
  };
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        // Force-refresh the ID token before reading Firestore. iOS Safari can
        // clear the refresh token from IndexedDB while keeping the cached
        // currentUser, so onAuthStateChanged fires "logged in" but Firestore
        // calls then fail silently with permission-denied. Catching it here
        // surfaces a clean re-auth instead of leaving the app empty.
        try {
          await user.getIdToken(true);
        } catch (e) {
          const code = e?.code || '';
          console.error('Token refresh failed', code, e);
          if (code.startsWith('auth/') && !code.includes('network')) {
            try { await signOut(auth); } catch (_) {}
            return;
          }
          // Network errors: continue and let Firestore calls fail / retry.
        }

        const [tricksData, daysData, journalData, goalsData, sessionsData, plannedData, plannedMonthsData, plannedWeeksData, plannedFocusData, plannedIntentsData, templatesData, viewedData, onboardingData, tricksReclassifiedV1] =
          await Promise.all([
            loadUserData(user.uid, 'tricks'),
            loadUserData(user.uid, 'trainingDays'),
            loadUserData(user.uid, 'journal'),
            loadUserData(user.uid, 'weeklyGoals'),
            loadUserData(user.uid, 'trainingSessions'),
            loadUserData(user.uid, 'plannedDays'),
            loadUserData(user.uid, 'plannedMonths'),
            loadUserData(user.uid, 'plannedWeeks'),
            loadUserData(user.uid, 'plannedSessionFocus'),
            loadUserData(user.uid, 'plannedSessionIntents'),
            loadUserData(user.uid, 'templates'),
            loadUserData(user.uid, 'viewedTricks'),
            loadUserData(user.uid, 'onboardingComplete'),
            loadUserData(user.uid, 'tricksReclassifiedV1'),
          ]);

        // Load global trick overrides set by admin
        let globalOverrides = {};
        let loadedCommunity = [];
        let deletedSet = new Set();
        try {
          const overridesSnap = await getDoc(doc(db, 'globalConfig', 'tricks'));
          if (overridesSnap.exists()) {
            const data = overridesSnap.data();
            globalOverrides = data.overrides || {};
            setGlobalVideos(data.globalVideos || {});
            loadedCommunity = Array.isArray(data.communityTricks) ? data.communityTricks : [];
            setCommunityTricks(loadedCommunity);
            deletedSet = new Set(Array.isArray(data.deletedTricks) ? data.deletedTricks : []);
          }
        } catch (e) { console.error('Global overrides load error', e); }

        // Load own profile to pick up any dynamic admin grant
        try {
          const profileSnap = await getDoc(doc(db, 'userProfiles', user.uid));
          if (profileSnap.exists() && profileSnap.data().isAdmin === true) setProfileIsAdmin(true);
        } catch (e) { console.error('Profile load error', e); }

        const applyOverrides = (t) => {
          const OLD_GYM = ['Trampoline', 'Tumbling', 'Floor'];
          let base = OLD_GYM.includes(t.category) ? { ...t, category: 'Gymnastics' } : t;
          if (base.category === 'Kicks') base = { ...base, category: 'Tricks' };
          const override = globalOverrides[String(base.id)];
          return override ? { ...base, ...override } : base;
        };

        const migrateTrickStatus = (t) => {
          const oldStatus = t.status;
          const newStatus = migrateStatus(oldStatus);
          let progress = Array.isArray(t.progress) ? t.progress.slice() : [];
          if (oldStatus === 'hard_landing' || oldStatus === 'yes_i_can') {
            progress = LANDING_IDS.slice();
          } else if (oldStatus === 'soft_landing') {
            if (!progress.includes('trampoline_landing')) progress.unshift('trampoline_landing');
            if (!progress.includes('soft_landing')) progress.push('soft_landing');
          } else if (oldStatus === 'trampoline_landing') {
            if (!progress.includes('trampoline_landing')) progress.push('trampoline_landing');
          }
          if (oldStatus === newStatus && Array.isArray(t.progress) && progress.length === t.progress.length && progress.every((p, i) => p === t.progress[i])) {
            return t;
          }
          return { ...t, status: newStatus, progress };
        };

        const mergeCommunity = (existing) => {
          const existingIds = new Set(existing.map(t => t.id));
          const additions = loadedCommunity
            .filter(ct => ct && ct.id != null && !existingIds.has(ct.id) && !deletedSet.has(ct.id))
            .map(ct => applyOverrides({ ...ct, status: 'not_started', videos: [], notes: '', progress: [], coolness: Number(ct.coolness) || 0 }));
          return additions.length > 0 ? [...existing, ...additions] : existing;
        };

        if (tricksData) {
          const filtered = tricksData.filter(t => !deletedSet.has(t.id));
          const migrated = filtered.map(applyOverrides).map(migrateTrickStatus);

          // One-time reclassification: untouched want_to_learn → not_started.
          // Gated by tricksReclassifiedV1 flag so it only runs once per user.
          // Without the gate, a user who later marks a trick as want_to_learn
          // and then clears all engagement signals would have it silently
          // demoted back to not_started on next load.
          let reclassified = migrated;
          if (!tricksReclassifiedV1) {
            const goalIds = new Set((Array.isArray(goalsData) ? goalsData : []).map(g => g.trickId));
            const focusIds = new Set();
            if (plannedFocusData && typeof plannedFocusData === 'object') {
              Object.values(plannedFocusData).forEach(arr => {
                if (Array.isArray(arr)) arr.forEach(id => focusIds.add(id));
              });
            }
            reclassified = migrated.map(t => {
              if (t.status !== 'want_to_learn') return t;
              const hasProgress = Array.isArray(t.progress) && t.progress.length > 0;
              const hasNotes = typeof t.notes === 'string' && t.notes.trim().length > 0;
              const hasUserVideos = Array.isArray(t.videos) && t.videos.length > 0;
              const hasCoolness = (t.coolness || 0) > 0;
              if (hasProgress || hasNotes || hasUserVideos || hasCoolness) return t;
              if (goalIds.has(t.id) || focusIds.has(t.id)) return t;
              return { ...t, status: 'not_started' };
            });
          }

          const merged = mergeCommunity(reclassified);
          const changed = merged.length !== tricksData.length
            || merged.some((t, i) => i < tricksData.length && (t.category !== tricksData[i].category || t.status !== tricksData[i].status));
          setTricks(merged);
          if (changed) await saveUserData(user.uid, 'tricks', merged);
          if (!tricksReclassifiedV1) {
            try { await saveUserData(user.uid, 'tricksReclassifiedV1', true); }
            catch (e) { console.error('Save tricksReclassifiedV1 error', e); }
          }
        } else {
          const seed = INITIAL_TRICKS
            .filter(t => !deletedSet.has(t.id))
            .map(t => applyOverrides({ ...t, status: 'not_started', videos: [], notes: '', progress: [] }));
          const initial = mergeCommunity(seed);
          setTricks(initial);
          await saveUserData(user.uid, 'tricks', initial);
          // New users start at not_started; mark migration flag so the
          // reclassification path can never fire on later loads.
          try { await saveUserData(user.uid, 'tricksReclassifiedV1', true); }
          catch (e) { console.error('Save tricksReclassifiedV1 error', e); }
        }
        if (daysData) setTrainingDays(daysData);
        if (journalData) setJournal(journalData);
        if (goalsData) setWeeklyGoals(goalsData);
        if (sessionsData) setTrainingSessions(sessionsData);
        if (plannedData) setPlannedDays(plannedData);
        if (plannedMonthsData) setPlannedMonths(plannedMonthsData);
        if (plannedWeeksData) setPlannedWeeks(plannedWeeksData);
        if (plannedFocusData) setPlannedSessionFocus(plannedFocusData);
        if (plannedIntentsData) setPlannedSessionIntents(plannedIntentsData);
        if (Array.isArray(templatesData)) setTemplates(templatesData);
        if (viewedData) setViewedTricks(viewedData);

        if (onboardingData === true) {
          setOnboardingComplete(true);
        } else {
          const hasData = (Array.isArray(goalsData) && goalsData.length > 0)
            || (Array.isArray(daysData) && daysData.length > 0)
            || (Array.isArray(sessionsData) && sessionsData.length > 0)
            || (Array.isArray(plannedData) && plannedData.length > 0)
            || (Array.isArray(plannedMonthsData) && plannedMonthsData.length > 0)
            || (Array.isArray(plannedWeeksData) && plannedWeeksData.length > 0);
          if (hasData) {
            setOnboardingComplete(true);
            try {
              await saveUserData(user.uid, 'onboardingComplete', true);
            } catch (e) {
              console.error('Onboarding flag save error', e);
            }
          } else {
            setOnboardingComplete(false);
          }
        }
      } catch (e) {
        console.error('Load error', e);
      }
      setLoading(false);
    };
    loadAll();
  }, [user.uid]);

  const saveTricks = async (newTricks) => { setTricks(newTricks); await saveUserData(user.uid, 'tricks', newTricks); };
  const saveTrainingDays = async (days) => { setTrainingDays(days); await saveUserData(user.uid, 'trainingDays', days); };
  const saveGoals = async (g) => { setWeeklyGoals(g); await saveUserData(user.uid, 'weeklyGoals', g); };
  const saveTrainingSessions = async (s) => { setTrainingSessions(s); await saveUserData(user.uid, 'trainingSessions', s); };
  const savePlannedSessionFocus = async (f) => { setPlannedSessionFocus(f); await saveUserData(user.uid, 'plannedSessionFocus', f); };
  const savePlannedSessionIntents = async (i) => { setPlannedSessionIntents(i); await saveUserData(user.uid, 'plannedSessionIntents', i); };
  const saveTemplates = async (t) => { setTemplates(t); await saveUserData(user.uid, 'templates', t); };

  const celebrateLanding = (oldProgress, newProgress, trick) => {
    const oldSet = new Set(Array.isArray(oldProgress) ? oldProgress : []);
    const newSet = new Set(Array.isArray(newProgress) ? newProgress : []);
    if (!oldSet.has('trampoline_landing') && newSet.has('trampoline_landing')) {
      fireCelebration({ _id: Date.now(), kind: 'small', icon: '🤾', title: 'Trampoline landing!', subtitle: trick ? `${trick.name} · soft mat next` : 'Soft mat next', tone: 'cyan' });
    } else if (!oldSet.has('soft_landing') && newSet.has('soft_landing')) {
      fireCelebration({ _id: Date.now(), kind: 'small', icon: '🛬', title: 'Soft mat — almost there!', subtitle: trick ? `${trick.name} · hard ground left` : 'Hard ground left', tone: 'blue' });
    }
  };

  // Race-safe update via functional setter. Guards capture against StrictMode's
  // double-invocation so oldTrick reflects the *first* prev (the original).
  const mutateTrick = (id, mutator) => {
    let oldTrick = null;
    let nextArr = null;
    setTricks(prev => {
      if (oldTrick === null) oldTrick = prev.find(t => t.id === id) || null;
      const next = prev.map(t => t.id === id ? mutator(t) : t);
      nextArr = next;
      return next;
    });
    if (nextArr) saveUserData(user.uid, 'tricks', nextArr).catch(e => console.error('Save tricks error', e));
    return oldTrick;
  };

  const updateTrickStatus = (id, status) => {
    const oldTrick = mutateTrick(id, t => ({ ...t, status }));
    if (status === 'got_it' && oldTrick?.status !== 'got_it') {
      setCelebrationTrick(oldTrick);
      setTimeout(() => setCelebrationTrick(null), 2500);
    }
  };

  const updateTrickProgress = (id, progress) => {
    const oldTrick = mutateTrick(id, t => ({ ...t, progress }));
    celebrateLanding(oldTrick?.progress, progress, oldTrick);
  };
  const updateTrickCoolness = (id, coolness) => mutateTrick(id, t => ({ ...t, coolness }));
  const updateTrickStatusAndProgress = (id, status, progress) => {
    const oldTrick = mutateTrick(id, t => ({ ...t, status, progress }));
    if (status === 'got_it' && oldTrick?.status !== 'got_it') {
      setCelebrationTrick(oldTrick);
      setTimeout(() => setCelebrationTrick(null), 2500);
    } else {
      celebrateLanding(oldTrick?.progress, progress, oldTrick);
    }
  };
  const updateTrickVideos = (id, videos) => { mutateTrick(id, t => ({ ...t, videos })); };
  const updateTrickNotes = (id, notes) => { mutateTrick(id, t => ({ ...t, notes })); };
  const updateGlobalVideos = async (id, videos) => {
    const next = { ...globalVideos, [String(id)]: videos };
    setGlobalVideos(next);
    try {
      await setDoc(doc(db, 'globalConfig', 'tricks'), { globalVideos: next, updatedAt: Date.now() }, { merge: true });
    } catch (e) {
      console.error('Save global videos error', e);
    }
  };
  const displayTricks = useMemo(() => {
    const viewedSet = new Set(viewedTricks);
    return tricks.map(t => {
      const personals = (t.videos || []).map(v => ({ ...v, _global: false }));
      const globals = (globalVideos[String(t.id)] || []).map(v => ({ ...v, _global: true }));
      let progress;
      if (Array.isArray(t.progress)) progress = t.progress;
      else if (typeof t.progress === 'string' && t.progress !== 'not_started') progress = [t.progress];
      else progress = [];
      return { ...t, videos: [...personals, ...globals], progress, _unread: !viewedSet.has(t.id) };
    });
  }, [tricks, globalVideos, viewedTricks]);

  const addTrick = (trick, globalVideoList = []) => {
    const newTrick = { status: 'not_started', videos: [], notes: '', progress: [], coolness: 0, ...trick, id: Date.now() };
    let nextArr = null;
    setTricks(prev => {
      const next = [...prev, newTrick];
      nextArr = next;
      return next;
    });
    if (nextArr) saveUserData(user.uid, 'tricks', nextArr).catch(e => console.error('Save tricks error', e));
    if (globalVideoList.length > 0) updateGlobalVideos(newTrick.id, globalVideoList);
  };

  const computeStreakFor = (days) => {
    if (!Array.isArray(days) || days.length === 0) return 0;
    const sorted = [...days].sort().reverse();
    const today = todayLocal();
    const yesterday = formatLocalDate(new Date(Date.now() - 86400000));
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 1;
    let prev = new Date(sorted[0]);
    for (let i = 1; i < sorted.length; i++) {
      const curr = new Date(sorted[i]);
      const diff = Math.round((prev - curr) / 86400000);
      if (diff === 1) { streak++; prev = curr; } else break;
    }
    return streak;
  };

  const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

  const markDayTrained = async (dateStr) => {
    if (!dateStr) return;
    let nextDays = null;
    let oldStreak = 0;
    let newStreak = 0;
    setTrainingDays(prev => {
      if (prev.includes(dateStr)) return prev;
      const next = [...prev, dateStr];
      if (nextDays === null) {
        oldStreak = computeStreakFor(prev);
        newStreak = computeStreakFor(next);
        nextDays = next;
      }
      return next;
    });
    if (!nextDays) return;
    await saveUserData(user.uid, 'trainingDays', nextDays);
    const crossed = STREAK_MILESTONES.find(m => oldStreak < m && newStreak >= m);
    if (crossed) {
      const subtitle = crossed >= 30 ? 'Unstoppable!' : crossed >= 7 ? 'On fire!' : 'Keep it going!';
      fireCelebration({ _id: Date.now(), kind: 'small', icon: '🔥', title: `${crossed}-day streak!`, subtitle, tone: 'orange' });
    }
  };

  const streak = computeStreakFor(trainingDays);
  const trickCounts = useMemo(() => {
    let mastered = 0, easy = 0, medium = 0, hard = 0, sup = 0, vault = 0, flip = 0;
    for (const t of tricks) {
      if (t.status !== 'got_it') continue;
      mastered += 1;
      if (t.difficulty === 'Easy') easy += 1;
      else if (t.difficulty === 'Medium') medium += 1;
      else if (t.difficulty === 'Hard') hard += 1;
      else if (t.difficulty === 'Super') sup += 1;
      if (t.category === 'Vaults') vault += 1;
      else if (t.category === 'Flips') flip += 1;
    }
    return { mastered, easyMastered: easy, mediumMastered: medium, hardMastered: hard, superMastered: sup, vaultMastered: vault, flipMastered: flip };
  }, [tricks]);
  const stats = useMemo(() => ({ ...trickCounts, streak }), [trickCounts, streak]);

  const earnedBadges = useMemo(() => BADGES.filter(b => b.check(stats)), [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center"><LoadingIcon size={72} /></div>
          <div className="text-white text-xl font-bold">Loading your training...</div>
        </div>
      </div>
    );
  }

  const finishOnboarding = async ({ trickIds }) => {
    const today = todayLocal();
    if (Array.isArray(trickIds) && trickIds.length > 0) {
      const idSet = new Set(trickIds);
      await saveTricks(tricks.map(t => idSet.has(t.id) && t.status === 'not_started' ? { ...t, status: 'want_to_learn' } : t));
      const goals = trickIds.map(id => ({ trickId: id, addedAt: Date.now() }));
      await saveGoals(goals);
      await savePlannedSessionFocus({ ...plannedSessionFocus, [today]: trickIds });
    }
    await saveUserData(user.uid, 'onboardingComplete', true);
    setOnboardingComplete(true);
    setActiveTab('home');
  };

  const skipOnboarding = async () => {
    await saveUserData(user.uid, 'onboardingComplete', true);
    setOnboardingComplete(true);
  };

  if (!onboardingComplete) {
    return (
      <OnboardingFlow tricks={displayTricks} userName={user.displayName} onFinish={finishOnboarding} onSkip={skipOnboarding} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white pb-24">
      {celebrationTrick && (
        <div className="fixed inset-x-0 top-0 bottom-20 z-40 flex items-center justify-center bg-black/70 pointer-events-none animate-pulse">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">🏆</div>
            <div className="text-4xl font-black text-yellow-400 mb-2">LEVEL UP!</div>
            <div className="text-2xl text-white font-bold">{celebrationTrick.name}</div>
            <div className="text-xl text-green-400 mt-2">Got it ✅</div>
          </div>
        </div>
      )}

      {celebrationToast && (() => {
        const TONE = {
          cyan:   { ring: 'border-cyan-400',   from: 'from-cyan-500/30',   to: 'to-cyan-700/30',   accent: 'text-cyan-100' },
          blue:   { ring: 'border-blue-400',   from: 'from-blue-500/30',   to: 'to-blue-700/30',   accent: 'text-blue-100' },
          orange: { ring: 'border-orange-400', from: 'from-orange-500/40', to: 'to-red-600/40',    accent: 'text-orange-100' },
        };
        const tone = TONE[celebrationToast.tone] || TONE.cyan;
        return (
          <div className="fixed top-3 inset-x-0 z-[60] flex justify-center pointer-events-none px-4">
            <div className={`pointer-events-auto bg-gradient-to-br ${tone.from} ${tone.to} backdrop-blur-md border-2 ${tone.ring} rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-sm w-full animate-bounce`} style={{ animationDuration: '0.6s', animationIterationCount: 1 }}>
              <div className="text-3xl flex-shrink-0">{celebrationToast.icon}</div>
              <div className="min-w-0 flex-1">
                <div className={`font-black text-base leading-tight ${tone.accent}`}>{celebrationToast.title}</div>
                {celebrationToast.subtitle && <div className="text-xs text-white/80 truncate mt-0.5">{celebrationToast.subtitle}</div>}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-purple-500/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              NIVLA PARKOUR
            </h1>
            <div className="text-xs text-slate-400">Hi {user.displayName?.split(' ')[0] || 'there'}!</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-orange-300">{streak}</span>
            </div>
            <button
              onClick={() => setShowReleaseNotes(true)}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
              aria-label="Release notes"
              title="Release notes"
            >
              <ScrollText className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={() => signOut(auth)}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'home' && (
          <TodayTab streak={streak} weeklyGoals={weeklyGoals} tricks={displayTricks} onOpenTrick={openTrick}
            hasTrainedToday={trainingDays.includes(todayLocal())}
            goToLog={() => { setTrainingSection('log'); setActiveTab('training'); }}
            goToTricks={() => setActiveTab('tricks')}
            goToUnseenTricks={() => { setFilterUnseen(['new']); setActiveTab('tricks'); }} />
        )}
        {activeTab === 'tricks' && (
          <TricksTab tricks={displayTricks} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterDifficulty={filterDifficulty} setFilterDifficulty={setFilterDifficulty}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterTracker={filterTracker} setFilterTracker={setFilterTracker}
            filterVideo={filterVideo} setFilterVideo={setFilterVideo}
            filterVideoLabel={filterVideoLabel} setFilterVideoLabel={setFilterVideoLabel}
            filterStars={filterStars} setFilterStars={setFilterStars}
            filterUnseen={filterUnseen} setFilterUnseen={setFilterUnseen}
            weeklyGoals={weeklyGoals}
            onOpenTrick={openTrick}
            onAddNew={() => setActiveTab('add')} />
        )}
        {activeTab === 'training' && (
          <TrainingTab tricks={tricks}
            journal={journal} onOpenTrick={openTrick}
            trainingDays={trainingDays} trainingSessions={trainingSessions} saveTrainingSessions={saveTrainingSessions}
            markDayTrained={markDayTrained}
            plannedDays={plannedDays}
            plannedMonths={plannedMonths}
            plannedWeeks={plannedWeeks}
            plannedSessionFocus={plannedSessionFocus} savePlannedSessionFocus={savePlannedSessionFocus}
            plannedSessionIntents={plannedSessionIntents} savePlannedSessionIntents={savePlannedSessionIntents}
            templates={templates} saveTemplates={saveTemplates}
            streak={streak} weeklyGoals={weeklyGoals}
            section={trainingSection} setSection={setTrainingSection} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab stats={stats} tricks={tricks} earnedBadges={earnedBadges} trainingDays={trainingDays} />
        )}

        {activeTab === 'add' && (
          <AddTab user={user} tricks={tricks} />
        )}
        {activeTab === 'admin' && userIsAdmin && (
         <AdminTab currentUserUid={user.uid} myTricks={tricks} saveTricks={saveTricks} />
        )}
      </div>

      {showReleaseNotes && <ReleaseNotesModal onClose={() => setShowReleaseNotes(false)} onOpenImprovement={() => { setShowReleaseNotes(false); setShowImprovementModal(true); }} />}
      {showImprovementModal && <ImprovementSuggestionsModal user={user} onClose={() => setShowImprovementModal(false)} />}

      {selectedTrick && (
        <TrickDetailModal trick={displayTricks.find(t => t.id === selectedTrick.id) || selectedTrick}
          autoplayUrl={autoplayVideoUrl}
          isAdmin={userIsAdmin}
          inFocus={weeklyGoals.some(g => g.trickId === selectedTrick.id)}
          onToggleFocus={(id) => {
            const exists = weeklyGoals.some(g => g.trickId === id);
            saveGoals(exists
              ? weeklyGoals.filter(g => g.trickId !== id)
              : [...weeklyGoals, { trickId: id, addedAt: Date.now() }]);
          }}
          onClose={closeTrick} onUpdateStatus={updateTrickStatus} onUpdateProgress={updateTrickProgress}
          onUpdateStatusAndProgress={updateTrickStatusAndProgress} onUpdateCoolness={updateTrickCoolness}
          onUpdateVideos={updateTrickVideos} onUpdateGlobalVideos={updateGlobalVideos}
          onUpdateNotes={updateTrickNotes} />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-purple-500/20 z-50">
        <div className="flex justify-around items-center py-2 px-2 max-w-2xl mx-auto">
          <NavButton icon={Home} label="Today" active={activeTab === 'home'} onClick={() => { closeTrick(); setActiveTab('home'); }} />
          <NavButton icon={Dumbbell} label="Tricks" active={activeTab === 'tricks'} onClick={() => { closeTrick(); setActiveTab('tricks'); }} />

         <NavButton icon={Calendar} label="Training" active={activeTab === 'training'} onClick={() => { closeTrick(); setTrainingSection(null); setActiveTab('training'); if (typeof window !== 'undefined') requestAnimationFrame(() => window.scrollTo({ top: 0 })); }} />
          <NavButton icon={Trophy} label="Progress" active={activeTab === 'progress'} onClick={() => { closeTrick(); setActiveTab('progress'); }} />
         {userIsAdmin && (
         <NavButton icon={Shield} label="Admin" active={activeTab === 'admin'} onClick={() => { closeTrick(); setActiveTab('admin'); }} />
         )}
        </div>
      </div>
    </div>
  );
}

function ReleaseNotesModal({ onClose, onOpenImprovement }) {
  return (
    <div className="fixed inset-x-0 top-0 bottom-20 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-t sm:border border-purple-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-full sm:max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-purple-400" />
            <h2 className="font-black text-lg">Release Notes</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700"><X className="w-5 h-5" /></button>
        </div>
        {onOpenImprovement && (
          <div className="px-5 pt-4">
            <button onClick={onOpenImprovement}
              className="w-full py-2.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/40 rounded-xl text-sm font-bold text-yellow-200 transition flex items-center justify-center gap-2">
              <span className="text-base">💡</span> Suggest an improvement
            </button>
          </div>
        )}
        <div className="p-5 space-y-5">
          {RELEASE_NOTES.map((r) => (
            <div key={r.version} className="border-l-2 border-purple-500/50 pl-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">v{r.version}</span>
                <span className="text-xs text-slate-400">{r.date}</span>
              </div>
              <div className="font-bold text-white mb-2">{r.title}</div>
              <ul className="space-y-1">
                {r.notes.map((n, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-purple-400 flex-shrink-0">·</span>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImprovementSuggestionsModal({ user, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [mySuggestions, setMySuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const q = query(collection(db, 'improvementSuggestions'), where('requestedByUid', '==', user.uid));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setMySuggestions(items);
    } catch (e) {
      console.error('Load suggestions error', e);
    }
    setLoading(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user.uid]);

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'improvementSuggestions'), {
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
        requestedByUid: user.uid,
        requestedByEmail: user.email || '',
        requestedByName: user.displayName || user.email || 'Unknown',
        createdAt: Date.now(),
      });
      setTitle('');
      setDescription('');
      setSent(true);
      setTimeout(() => setSent(false), 2500);
      reload();
    } catch (e) {
      console.error('Submit improvement error', e);
      setError(`${e.code || 'error'}: ${e.message || 'Could not send'}`);
    }
    setSubmitting(false);
  };

  const statusBadge = (s) => {
    if (s === 'approved') return { className: 'bg-green-500/20 text-green-300 border-green-500/40', label: '✓ Approved' };
    if (s === 'denied') return { className: 'bg-red-500/20 text-red-300 border-red-500/40', label: '✕ Denied' };
    return { className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', label: 'Pending' };
  };

  // iOS Safari hides inputs behind the on-screen keyboard. Scroll the focused
  // field into view after the keyboard animation settles.
  const scrollIntoViewOnFocus = (e) => {
    const el = e.target;
    setTimeout(() => {
      if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-20 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose} style={{ height: '100dvh' }}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-t sm:border border-yellow-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-full sm:max-h-[85dvh] overflow-y-auto" style={{ scrollPaddingBottom: '30vh' }}>
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h2 className="font-black text-lg">Suggest an improvement</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="text-xs text-slate-400">Submit ideas for new features or improvements. An admin will review and respond.</div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Title</div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                onFocus={scrollIntoViewOnFocus}
                placeholder="Short summary of your idea"
                style={{ scrollMarginBottom: '40vh' }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Description</div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                onFocus={scrollIntoViewOnFocus}
                placeholder="Explain what you'd like and why"
                rows={4}
                style={{ scrollMarginBottom: '40vh' }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none" />
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-xs text-red-200 break-words">
                <div className="font-bold mb-1">Could not send</div>
                <div className="font-mono">{error}</div>
              </div>
            )}
            <button onClick={submit} disabled={!title.trim() || submitting}
              className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 rounded-xl font-bold text-slate-900 transition">
              {sent ? '✅ Sent for review!' : submitting ? 'Sending…' : 'Send suggestion'}
            </button>
          </div>

          <div>
            <div className="font-bold mb-2 text-sm">Your suggestions ({mySuggestions.length})</div>
            {loading ? (
              <div className="text-sm text-slate-500 text-center py-4">Loading…</div>
            ) : mySuggestions.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4">No suggestions yet.</div>
            ) : (
              <div className="space-y-2">
                {mySuggestions.map(s => {
                  const badge = statusBadge(s.status);
                  return (
                    <div key={s._id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold">{s.title}</div>
                          {s.description && <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{s.description}</div>}
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${badge.className}`}>{badge.label}</span>
                      </div>
                      {s.adminNote && (
                        <div className="mt-2 text-xs text-slate-400 italic border-l-2 border-slate-600 pl-2">Admin: {s.adminNote}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-1 py-2 rounded-xl transition-all ${active ? 'text-orange-400 scale-110' : 'text-slate-400 hover:text-white'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-[10px] font-semibold truncate max-w-full">{label}</span>
    </button>
  );
}

function TodayTab({ streak, weeklyGoals = [], tricks = [], onOpenTrick, hasTrainedToday, goToLog, goToTricks, goToUnseenTricks }) {
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const focusTricks = weeklyGoals.map(g => tricks.find(t => t.id === g.trickId)).filter(Boolean);

  const unseenCount = tricks.filter(t => t._unread).length;

  const inspirationTrick = useMemo(() => {
    const focusIds = new Set(weeklyGoals.map(g => g.trickId));
    const hasPlayableVideo = (t) => Array.isArray(t.videos) && t.videos.some(v => getVideoEmbed(normalizeUrl(v.url)));
    const primary = tricks.filter(t => t.status !== 'got_it' && !focusIds.has(t.id) && hasPlayableVideo(t));
    const pool = primary.length > 0 ? primary : tricks.filter(t => t.status !== 'got_it' && hasPlayableVideo(t));
    if (pool.length === 0) return null;
    const seed = todayLocal();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return pool[Math.abs(hash) % pool.length];
  }, [tricks, weeklyGoals]);
  const inspirationVideo = inspirationTrick
    ? (inspirationTrick.videos.find(v => v.type !== 'tutorial' && v.primary && getVideoEmbed(normalizeUrl(v.url)))
      || inspirationTrick.videos.find(v => v.type !== 'tutorial' && getVideoEmbed(normalizeUrl(v.url)))
      || inspirationTrick.videos.find(v => getVideoEmbed(normalizeUrl(v.url))))
    : null;
  const inspirationEmbed = inspirationVideo ? getVideoEmbed(normalizeUrl(inspirationVideo.url)) : null;

  const renderTrickRow = (t) => {
    const diff = DIFFICULTY_COLORS[t.difficulty];
    const tutorialVideo = t.videos?.find(v => isTutorialVideo(v) && v.primary) || t.videos?.find(v => isTutorialVideo(v));
    const referenceVideo = t.videos?.find(v => v.type !== 'tutorial' && v.primary) || t.videos?.find(v => v.type !== 'tutorial');
    const playVideo = (e, video) => { e.stopPropagation(); if (video?.url) onOpenTrick(t, normalizeUrl(video.url)); };
    return (
      <div key={t.id} className="w-full bg-gradient-to-r from-purple-900/40 to-orange-900/20 hover:from-purple-900/60 hover:to-orange-900/30 border border-orange-500/40 rounded-xl p-3 flex items-center gap-2 transition" style={{ boxShadow: '0 0 14px rgba(168,85,247,0.3), 0 0 8px rgba(249,115,22,0.2), 0 6px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
        <button onClick={() => onOpenTrick(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
          <CategoryIcon category={t.category} size={20} className="text-slate-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{t.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">Focus</span>
              {t.videos?.length > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><Video className="w-3 h-3" /> {t.videos.length}</span>}
            </div>
          </div>
        </button>
        {referenceVideo && (
          <button onClick={(e) => playVideo(e, referenceVideo)} className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 flex items-center justify-center transition" title={referenceVideo.label}>
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}
        {tutorialVideo && (
          <button onClick={(e) => playVideo(e, tutorialVideo)} className="flex-shrink-0 w-9 h-9 rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 flex items-center justify-center transition" title={`🎓 ${tutorialVideo.label}`}>
            <span className="text-base">🎓</span>
          </button>
        )}
        <StatusPill trick={t} onClick={() => onOpenTrick(t)} />
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-black">Today</div>
          <div className="text-xs text-slate-400 mt-0.5">{todayLabel}</div>
        </div>
        <div className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/40 rounded-full px-3 py-1.5">
          <span className="text-base">🔥</span>
          <span className="text-sm font-black text-orange-200">{streak}</span>
          <span className="text-[10px] font-semibold text-orange-300 uppercase">day{streak === 1 ? '' : 's'}</span>
        </div>
      </div>

      <button onClick={goToLog}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base shadow-lg transition active:scale-[0.99] ${hasTrainedToday ? 'bg-gradient-to-r from-emerald-500/25 to-green-500/25 border-2 border-emerald-500/50 text-emerald-100 hover:from-emerald-500/35 hover:to-green-500/35' : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white'}`}>
        <ScrollText className="w-6 h-6" />
        <span>{hasTrainedToday ? 'Log Session · edit' : 'Log Session'}</span>
      </button>

      <div className="bg-gradient-to-br from-purple-600/20 via-slate-900 to-pink-600/20 border border-purple-500/40 rounded-3xl p-5 shadow-xl shadow-purple-500/10">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-purple-300" />
          <div className="font-black text-lg">Tricks in focus</div>
          {focusTricks.length > 0 && (
            <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">{focusTricks.length}</span>
          )}
        </div>
        {focusTricks.length === 0 ? (
          <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-sm font-bold text-slate-200 mb-1">No tricks in focus yet</div>
            <div className="text-xs text-slate-400 mb-3">Pick what you're working on this week from the Tree.</div>
            {goToTricks && (
              <button onClick={goToTricks}
                className="px-4 py-2 rounded-xl font-bold text-sm bg-purple-500 hover:bg-purple-400 text-white transition">
                Go to Tricks →
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {focusTricks.map(renderTrickRow)}
            </div>
            {goToTricks && (
              <button onClick={goToTricks}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition">
                <Target className="w-3.5 h-3.5" />
                Manage focus →
              </button>
            )}
          </>
        )}
      </div>

      {unseenCount > 0 && goToUnseenTricks && (
        <button onClick={goToUnseenTricks}
          className="w-full bg-slate-900/60 border border-cyan-500/40 hover:border-cyan-500/70 hover:bg-slate-800/60 rounded-2xl p-4 flex items-center gap-3 transition text-left active:scale-[0.99]">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-xl">✨</div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm text-cyan-200">New tricks to discover</div>
            <div className="text-xs text-slate-400 mt-0.5">{unseenCount} trick{unseenCount === 1 ? '' : 's'} you haven't seen yet</div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
        </button>
      )}

      {inspirationTrick && inspirationEmbed && (() => {
        const t = inspirationTrick;
        const diff = DIFFICULTY_COLORS[t.difficulty];
        const playUrl = inspirationVideo?.url ? normalizeUrl(inspirationVideo.url) : null;
        return (
          <div className="bg-slate-900/60 border border-slate-700 rounded-3xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <span className="text-base">✨</span>
              <div className="font-black text-sm uppercase tracking-wide text-cyan-300">Need inspiration?</div>
              <span className="ml-auto text-[10px] text-slate-500">Daily pick</span>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={inspirationEmbed.src}
                title={inspirationVideo?.label || t.name}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
            <button onClick={() => onOpenTrick(t, playUrl || undefined)}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/40 transition text-left">
              <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
              <CategoryIcon category={t.category} size={22} className="text-slate-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{t.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
                  <span className="text-xs text-slate-400 truncate">{t.category}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function TricksTab({ tricks, searchQuery, setSearchQuery, filterCategory, setFilterCategory, filterDifficulty, setFilterDifficulty, filterStatus, setFilterStatus, filterTracker, setFilterTracker, filterVideo, setFilterVideo, filterVideoLabel, setFilterVideoLabel, filterStars, setFilterStars, filterUnseen, setFilterUnseen, weeklyGoals, onOpenTrick, onAddNew }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState(() => new Set());
  const toggleCategory = (cat) => setCollapsedCategories(prev => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    return next;
  });
  const categories = ['all', ...new Set(tricks.map(t => t.category))];
  const difficulties = ['all', 'Easy', 'Medium', 'Hard', 'Super'];
  const trackerOptions = ['all', ...STATUS_LEVELS.map(s => s.id)];
  const progressOptions = ['all', 'none', ...LANDING_IDS];
  const allVideoLabels = useMemo(() => {
    const labels = new Set();
    tricks.forEach(t => (t.videos || []).forEach(v => { if (v.label) labels.add(v.label); }));
    return [...labels].sort();
  }, [tricks]);
  const progressLabel = (opt) => {
    if (opt === 'all') return 'All';
    if (opt === 'none') return 'No landing';
    return LANDING_LEVELS.find(l => l.id === opt)?.label || opt;
  };
  const filtered = tricks.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory.length > 0 && !filterCategory.includes(t.category)) return false;
    if (filterDifficulty.length > 0 && !filterDifficulty.includes(t.difficulty)) return false;
    if (filterTracker.length > 0 && !filterTracker.includes(t.status)) return false;
    if (filterStatus.length > 0) {
      const progressArr = Array.isArray(t.progress) ? t.progress : [];
      const hasNone = filterStatus.includes('none');
      const others = filterStatus.filter(s => s !== 'none');
      const matchesNone = hasNone && progressArr.length === 0;
      const matchesOther = others.length > 0 && others.some(fs => progressArr.includes(fs));
      if (!matchesNone && !matchesOther) return false;
    }
    if (filterVideo.length > 0) {
      const vids = Array.isArray(t.videos) ? t.videos : [];
      const matches = filterVideo.some(fv => {
        if (fv === 'none') return vids.length === 0;
        if (fv === 'video') return vids.length > 0;
        if (fv === 'starred') return vids.some(v => v.primary);
        if (fv === 'unstarred') return vids.length > 0 && !vids.some(v => v.primary);
        if (fv === 'global') return vids.some(v => v._global);
        if (fv === 'personal') return vids.some(v => !v._global);
        return false;
      });
      if (!matches) return false;
    }
    if (filterVideoLabel.length > 0) {
      const vids = Array.isArray(t.videos) ? t.videos : [];
      if (!vids.some(v => filterVideoLabel.includes(v.label))) return false;
    }
    if (filterStars.length > 0) {
      const stars = t.coolness || 0;
      const matches = filterStars.some(fs => fs === 'unrated' ? stars === 0 : stars === parseInt(fs, 10));
      if (!matches) return false;
    }
    if (filterUnseen.length > 0) {
      const wantNew = filterUnseen.includes('new');
      const wantSeen = filterUnseen.includes('seen');
      if (wantNew && !wantSeen && !t._unread) return false;
      if (wantSeen && !wantNew && t._unread) return false;
    }
    return true;
  });
  const grouped = filtered.reduce((acc, t) => { if (!acc[t.category]) acc[t.category] = []; acc[t.category].push(t); return acc; }, {});
  Object.keys(grouped).forEach(cat => grouped[cat].sort((a, b) => a.name.localeCompare(b.name)));
  const GYMNASTICS_CATEGORIES = ['Gymnastics'];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const aIsGym = GYMNASTICS_CATEGORIES.includes(a), bIsGym = GYMNASTICS_CATEGORIES.includes(b);
    if (aIsGym && !bIsGym) return 1; if (!aIsGym && bIsGym) return -1;
    return a.localeCompare(b);
  });
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tricks..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500" />
        </div>
        <button
          onClick={onAddNew}
          aria-label="Suggest a trick"
          title="Suggest a trick"
          className="shrink-0 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white rounded-xl p-3 flex items-center justify-center transition shadow-lg"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {(() => {
        const videoOptions = ['all', 'none', 'video', 'starred', 'unstarred', 'global', 'personal'];
        const videoLabel = (opt) => ({ all: 'All', none: 'No video', video: 'Video', starred: 'Video ★', unstarred: 'Video no ★', global: 'Global video', personal: 'My video' }[opt] || opt);
        const starsOptions = ['all', 'unrated', '1', '2', '3', '4', '5'];
        const starsLabel = (opt) => {
          if (opt === 'all') return 'All';
          if (opt === 'unrated') return 'Unrated';
          return '★'.repeat(parseInt(opt, 10));
        };
        const moreActive = [filterTracker, filterStatus, filterVideo, filterVideoLabel, filterStars, filterUnseen].filter(arr => arr.length > 0).length;
        const activeFilterCount = (filterCategory.length > 0 ? 1 : 0) + (filterDifficulty.length > 0 ? 1 : 0) + moreActive;
        return (
          <div className="space-y-2">
            <MultiFilterRow label="Category" options={categories} selected={filterCategory} onChange={setFilterCategory} />
            <MultiFilterRow label="Difficulty" options={difficulties} selected={filterDifficulty} onChange={setFilterDifficulty} />
            <button onClick={() => setFiltersOpen(o => !o)}
              className="w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 transition">
              <span className="font-semibold text-sm flex items-center gap-2">
                More filters
                {moreActive > 0 && (
                  <span className="text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-full">{moreActive} active</span>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            {filtersOpen && (
              <div className="space-y-2 pt-1">
                <MultiFilterRow label="Status" options={trackerOptions} selected={filterTracker} onChange={setFilterTracker} labelMap={(opt) => opt === 'all' ? 'All' : STATUS_LEVELS.find(s => s.id === opt)?.label || opt} />
                <MultiFilterRow label="Seen" options={['all', 'new', 'seen']} selected={filterUnseen} onChange={setFilterUnseen} labelMap={(opt) => ({ all: 'All', new: 'New ✨', seen: 'Seen' }[opt] || opt)} />
                <MultiFilterRow label="Progress" options={progressOptions} selected={filterStatus} onChange={setFilterStatus} labelMap={progressLabel} />
                <MultiFilterRow label="Video" options={videoOptions} selected={filterVideo} onChange={setFilterVideo} labelMap={videoLabel} />
                <MultiFilterRow label="Video label" options={['all', ...allVideoLabels]} selected={filterVideoLabel} onChange={setFilterVideoLabel} />
                <MultiFilterRow label="Stars" options={starsOptions} selected={filterStars} onChange={setFilterStars} labelMap={starsLabel} />
              </div>
            )}
            {activeFilterCount > 0 && (
              <button onClick={() => { setFilterCategory([]); setFilterDifficulty([]); setFilterTracker([]); setFilterStatus([]); setFilterVideo([]); setFilterVideoLabel([]); setFilterStars([]); setFilterUnseen([]); }}
                className="text-xs text-slate-400 hover:text-white underline">
                Clear all filters
              </button>
            )}
          </div>
        );
      })()}
      <div className="text-sm text-slate-400">{filtered.length} tricks</div>
      {sortedCategories.map(cat => {
        const isGymnastics = GYMNASTICS_CATEGORIES.includes(cat);
        const catColor = CATEGORY_COLORS[cat];
        const isCollapsed = collapsedCategories.has(cat);
        return (
          <div key={cat}>
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center gap-2 mb-2 mt-4 text-left"
            >
              <span className="w-1 h-7 rounded-full" style={catColor ? { backgroundColor: catColor.hex } : undefined} />
              <CategoryIcon category={cat} size={28} />
              <h3 className="font-black text-lg uppercase tracking-wide" style={catColor ? { color: catColor.hex } : undefined}>{cat}</h3>
              <span className="text-sm text-slate-500">({grouped[cat].length})</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            </button>
            {!isCollapsed && (
              <div className={`space-y-2 ${isGymnastics ? 'bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-2' : ''}`}>
                {grouped[cat].map(t => <TrickCard key={t.id} trick={t} onOpen={(url) => onOpenTrick(t, url)} isGymnastics={isGymnastics} inFocus={weeklyGoals?.some(g => g.trickId === t.id)} />)}
              </div>
            )}
          </div>
        );
      })}
      {filtered.length === 0 && <div className="text-center py-12 text-slate-400"><div className="text-5xl mb-2">🤷</div><div>No tricks match your filters</div></div>}
    </div>
  );
}

function FilterRow({ label, options, selected, onChange, labelMap }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition ${selected === opt ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            {labelMap ? labelMap(opt) : (opt === 'all' ? 'All' : opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiFilterRow({ label, options, selected, onChange, labelMap }) {
  const isAll = (opt) => opt === 'all';
  const isSelected = (opt) => isAll(opt) ? selected.length === 0 : selected.includes(opt);
  const toggle = (opt) => {
    if (isAll(opt)) { onChange([]); return; }
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map(opt => (
          <button key={opt} onClick={() => toggle(opt)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition ${isSelected(opt) ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            {labelMap ? labelMap(opt) : (opt === 'all' ? 'All' : opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

function normalizeUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function TrickCard({ trick, onOpen, isGymnastics, inFocus }) {
  const diff = DIFFICULTY_COLORS[trick.difficulty];
  const unread = !!trick._unread;
  const video = trick.videos?.find(v => v.primary) || trick.videos?.[0];
  const playVideo = (e, v) => { e.stopPropagation(); if (v?.url) onOpen(normalizeUrl(v.url)); };
  const openCard = () => onOpen();
  const focusStyle = inFocus ? { boxShadow: '0 0 14px rgba(168,85,247,0.3), 0 0 8px rgba(249,115,22,0.2), 0 6px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)' } : undefined;
  const baseClass = inFocus
    ? 'bg-gradient-to-r from-purple-900/40 to-orange-900/20 hover:from-purple-900/60 hover:to-orange-900/30 border-orange-500/40'
    : isGymnastics ? 'bg-cyan-900/30 hover:bg-cyan-900/50 border-cyan-500/30' : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700';
  return (
    <div className={`relative w-full border rounded-xl p-3 transition ${baseClass}`} style={focusStyle}>
      {unread && <span className="pointer-events-none absolute -top-1 -left-1 text-base animate-pulse">✨</span>}
      <div className="flex items-center gap-2 text-left">
        <button onClick={openCard} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={`w-1 h-12 ${diff.strip} rounded-full flex-shrink-0`} />
          <CategoryIcon category={trick.category} size={20} className="text-slate-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{trick.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff.bg} ${diff.text}`}>{trick.difficulty}</span>
              {inFocus && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">Focus</span>}
            </div>
          </div>
        </button>
        {video && (
          <button onClick={(e) => playVideo(e, video)} className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 flex items-center justify-center transition" title={video.label}>
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}
        <StatusPill trick={trick} onClick={openCard} />
      </div>
    </div>
  );
}

function getVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:(?:m\.|www\.)?youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return null;
}

function VideoCard({ video, onRemove, onTogglePrimary, autoplay, scrollRef, isGlobal, canEdit = true, flush = false }) {
  const safeUrl = normalizeUrl(video.url);
  const embed = getVideoEmbed(safeUrl);
  const embedSrc = embed && autoplay
    ? `${embed.src}${embed.src.includes('?') ? '&' : '?'}autoplay=1`
    : embed?.src;
  return (
    <div ref={scrollRef} className={`bg-purple-900/20 overflow-hidden ${flush ? '' : 'border rounded-lg'} ${autoplay ? (flush ? '' : 'border-purple-400/80 ring-2 ring-purple-400/40') : video.primary ? (flush ? '' : 'border-yellow-400/60') : isGlobal ? (flush ? '' : 'border-cyan-500/40') : (flush ? '' : 'border-purple-500/30')}`}>
      {embed && (
        <div className="aspect-video bg-black">
          <iframe
            src={embedSrc}
            title={video.label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      )}
      <div className="flex items-center gap-2 p-2">
        {canEdit ? (
          <button
            onClick={onTogglePrimary}
            title={video.primary ? 'Plays from the trick card. Tap to unset.' : 'Set as the video that plays from the trick card'}
            className="flex-shrink-0"
          >
            <Star className={`w-4 h-4 ${video.primary ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500 hover:text-yellow-300'}`} />
          </button>
        ) : (
          <Star className={`w-4 h-4 flex-shrink-0 ${video.primary ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />
        )}
        <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-2 text-sm hover:text-purple-300 truncate">
          <Play className="w-4 h-4 flex-shrink-0 text-purple-400" />
          <span className="truncate">{video.label}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 text-slate-500" />
        </a>
        {isGlobal && (
          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" title="Visible to everyone">🌐</span>
        )}
        {canEdit && (
          <button onClick={onRemove} className="text-slate-500 hover:text-red-400 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function TrickDetailModal({ trick, autoplayUrl, isAdmin, inFocus = false, onToggleFocus, onClose, onUpdateStatus, onUpdateProgress, onUpdateStatusAndProgress, onUpdateCoolness, onUpdateVideos, onUpdateGlobalVideos, onUpdateNotes }) {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoLabel, setNewVideoLabel] = useState('');
  const [newVideoGlobal, setNewVideoGlobal] = useState(false);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [notesInput, setNotesInput] = useState(trick.notes || '');
  const autoplayRef = React.useRef(null);
  const diff = DIFFICULTY_COLORS[trick.difficulty];
  const allVideos = trick.videos || [];
  const personalVideos = allVideos.filter(v => !v._global);
  const globalList = allVideos.filter(v => v._global).map(({ _global, ...rest }) => rest);
  const stripFlag = ({ _global, ...rest }) => rest;
  const isAutoplayVideo = (v) => autoplayUrl && normalizeUrl(v.url) === autoplayUrl;
  useEffect(() => {
    if (autoplayUrl && autoplayRef.current) {
      autoplayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoplayUrl]);
  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    const url = normalizeUrl(newVideoUrl.trim());
    const newEntry = { url, label: newVideoLabel.trim() || 'Video' };
    if (isAdmin && newVideoGlobal) {
      onUpdateGlobalVideos(trick.id, [...globalList, newEntry]);
    } else {
      onUpdateVideos(trick.id, [...personalVideos.map(stripFlag), newEntry]);
    }
    setNewVideoUrl(''); setNewVideoLabel('');
  };
  const removeVideo = (v) => {
    if (v._global) {
      onUpdateGlobalVideos(trick.id, globalList.filter(x => !(x.url === v.url && x.label === v.label && x.type === v.type)));
    } else {
      onUpdateVideos(trick.id, personalVideos.filter(x => x !== v).map(stripFlag));
    }
  };
  const togglePrimary = (v) => {
    // Defense in depth — VideoCard already hides this for non-admins via canEdit.
    if (v._global && !isAdmin) return;
    const willBePrimary = !v.primary;
    if (v._global) {
      const next = globalList.map(x => {
        if (x.url === v.url && x.label === v.label && x.type === v.type) return { ...x, primary: willBePrimary };
        if (willBePrimary) return { ...x, primary: false };
        return x;
      });
      onUpdateGlobalVideos(trick.id, next);
    } else {
      const next = personalVideos.map(stripFlag).map(x => {
        if (x.url === v.url && x.label === v.label && x.type === v.type) return { ...x, primary: willBePrimary };
        if (willBePrimary) return { ...x, primary: false };
        return x;
      });
      onUpdateVideos(trick.id, next);
    }
  };
  const saveNotes = () => onUpdateNotes(trick.id, notesInput);
  const swipeStartRef = React.useRef(null);
  const handleTouchStart = (e) => {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!swipeStartRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeStartRef.current.y;
    if (dx < -60 && Math.abs(dx) > Math.abs(dy)) onClose();
    swipeStartRef.current = null;
  };
  return (
    <div className="fixed inset-x-0 top-0 bottom-20 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="bg-slate-900 border-t sm:border border-purple-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-full sm:max-h-[85vh] overflow-y-auto">
        <div className={`relative ${diff.bg} p-6 border-b border-slate-700`}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center hover:bg-slate-700"><X className="w-5 h-5" /></button>
          <div className="mb-2"><CategoryIcon category={trick.category} size={36} className="text-white/90" /></div>
          <div className="flex items-start gap-3 pr-10">
            <div className="text-2xl font-black flex-1 min-w-0">{trick.name}</div>
            <div className="flex items-center gap-0.5 flex-shrink-0 mt-1" title={`Cool factor: ${trick.coolness || 0} / 5`}>
              {[1, 2, 3, 4, 5].map(n => {
                const filled = (trick.coolness || 0) >= n;
                return (
                  <button key={n}
                    onClick={() => onUpdateCoolness(trick.id, (trick.coolness || 0) === n ? 0 : n)}
                    className="transition hover:scale-110 p-0.5">
                    <Star className={`w-6 h-6 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-white/40 hover:text-yellow-300'}`} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${diff.bg} ${diff.text} border ${diff.border}`}>{trick.difficulty}</span>
            <span className="text-xs text-slate-300">{trick.category}</span>
          </div>
        </div>
        <div className="p-5 space-y-5">
          {allVideos.some(v => v.primary) && (
            <div className="-mx-5 -mt-5 space-y-2">
              {allVideos.filter(v => v.primary).map(v => (
                <VideoCard key={`${v._global ? 'g' : 'p'}-${v.url}-${v.type || ''}`} video={v} onRemove={() => removeVideo(v)} onTogglePrimary={() => togglePrimary(v)}
                  autoplay={isAutoplayVideo(v)} scrollRef={isAutoplayVideo(v) ? autoplayRef : null}
                  isGlobal={!!v._global} canEdit={!v._global || isAdmin} flush />
              ))}
            </div>
          )}
          {onToggleFocus && trick.status !== 'got_it' && (
            <button onClick={() => onToggleFocus(trick.id)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition ${inFocus
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 border-purple-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}>
              <Target className="w-4 h-4" />
              {inFocus ? 'In focus · tap to remove' : 'Add to focus'}
            </button>
          )}
          {(() => {
            const progressArr = Array.isArray(trick.progress) ? trick.progress : [];
            const showProgress = trick.status === 'training' || trick.status === 'got_it';

            const setStatus = (id) => {
              if (id === 'got_it') {
                if (trick.status === 'got_it') {
                  if (onUpdateStatus) onUpdateStatus(trick.id, 'training');
                  return;
                }
                if (onUpdateStatusAndProgress) onUpdateStatusAndProgress(trick.id, 'got_it', LANDING_IDS.slice());
                else {
                  if (onUpdateProgress) onUpdateProgress(trick.id, LANDING_IDS.slice());
                  if (onUpdateStatus) onUpdateStatus(trick.id, 'got_it');
                }
                return;
              }
              if (onUpdateStatus) onUpdateStatus(trick.id, id);
            };

            const toggleLanding = (id) => {
              const isAdding = !progressArr.includes(id);
              if (id === 'hard_landing' && isAdding) {
                if (onUpdateStatusAndProgress) onUpdateStatusAndProgress(trick.id, 'got_it', LANDING_IDS.slice());
                else {
                  if (onUpdateProgress) onUpdateProgress(trick.id, LANDING_IDS.slice());
                  if (onUpdateStatus) onUpdateStatus(trick.id, 'got_it');
                }
                return;
              }
              const next = isAdding ? [...progressArr, id] : progressArr.filter(p => p !== id);
              if (id === 'hard_landing' && !isAdding && trick.status === 'got_it') {
                if (onUpdateStatusAndProgress) onUpdateStatusAndProgress(trick.id, 'training', next);
                else {
                  if (onUpdateProgress) onUpdateProgress(trick.id, next);
                  if (onUpdateStatus) onUpdateStatus(trick.id, 'training');
                }
                return;
              }
              if (onUpdateProgress) onUpdateProgress(trick.id, next);
            };

            const STATUS_PREVIEW_LEVEL = { not_started: 0, want_to_learn: 1, training: 2, got_it: 4 };
            return (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Status</div>
                <div className="grid grid-cols-4 gap-2">
                  {STATUS_LEVELS.map(s => {
                    const active = trick.status === s.id;
                    const previewLevel = STATUS_PREVIEW_LEVEL[s.id] ?? 0;
                    return (
                      <button key={s.id} onClick={() => setStatus(s.id)}
                        title={s.id === 'got_it' && active ? 'Click to revert to Training' : undefined}
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition ${active ? `${s.color} border-white/40` : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                        <ProgressDot level={previewLevel} size={26} color={active ? '#ffffff' : undefined} />
                        <span className={`text-[11px] font-bold leading-tight text-center ${active ? 'text-white' : 'text-slate-300'}`}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                {showProgress && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="text-xs font-semibold text-yellow-300 uppercase mb-3">Landing progress</div>
                    <div className="relative flex items-start justify-between">
                      <div className="absolute top-5 left-[16.67%] right-[16.67%] h-1 bg-slate-700 rounded-full -z-0" />
                      <div
                        className="absolute top-5 left-[16.67%] h-1 bg-green-500 rounded-full -z-0 transition-all duration-300"
                        style={{
                          width: (() => {
                            const highest = LANDING_IDS.reduce((max, id, idx) => progressArr.includes(id) ? Math.max(max, idx) : max, -1);
                            if (highest < 1) return '0%';
                            if (highest === 1) return '33.33%';
                            return '66.67%';
                          })(),
                        }}
                      />
                      {LANDING_LEVELS.map((ls, idx) => {
                        const checked = progressArr.includes(ls.id);
                        return (
                          <button key={ls.id} onClick={() => toggleLanding(ls.id)}
                            className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
                            <span className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition ${checked ? 'bg-green-500 border-white' : 'bg-slate-800 border-slate-600 hover:border-slate-400'}`}>
                              {checked ? <Check className="w-5 h-5 text-white" /> : <span className="text-sm font-bold text-slate-400">{idx + 1}</span>}
                            </span>
                            <span className={`text-xs font-semibold ${checked ? 'text-white' : 'text-slate-400'}`}>{ls.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {trick.status !== 'got_it' && (
                      <div className="text-[11px] text-slate-400 mt-3 text-center">
                        Tap <span className="font-bold text-stone-200">Hard ground</span> when you've stuck the landing for real.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
            <button onClick={() => setAddVideoOpen(o => !o)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add a video
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${addVideoOpen ? 'rotate-180' : ''}`} />
            </button>
            {addVideoOpen && (
              <div className="px-3 pb-3 space-y-2">
                <input type="text" value={newVideoLabel} onChange={(e) => setNewVideoLabel(e.target.value)}
                  placeholder="Label (e.g. Sick line by Jason Paul)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <input type="url" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="YouTube or Vimeo URL"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addVideo} className="px-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-sm">Add</button>
                </div>
                {isAdmin && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={newVideoGlobal} onChange={(e) => setNewVideoGlobal(e.target.checked)} className="accent-purple-500" />
                    <span>🌐 Share with everyone (global)</span>
                  </label>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Notes</div>
            <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} onBlur={saveNotes} placeholder="Tips, things to remember, safety notes..." rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none" />
          </div>
          {allVideos.some(v => !v.primary) && (
            <div className="space-y-2">
              {allVideos.filter(v => !v.primary).map(v => (
                <VideoCard key={`${v._global ? 'g' : 'p'}-${v.url}-${v.type || ''}`} video={v} onRemove={() => removeVideo(v)} onTogglePrimary={() => togglePrimary(v)}
                  autoplay={isAutoplayVideo(v)} scrollRef={isAutoplayVideo(v) ? autoplayRef : null}
                  isGlobal={!!v._global} canEdit={!v._global || isAdmin} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrainingTab({ tricks = [], trainingDays = [], trainingSessions = [], saveTrainingSessions, markDayTrained, streak = 0, weeklyGoals = [], section, setSection, journal = [], plannedSessionFocus = {}, savePlannedSessionFocus, plannedSessionIntents = {}, savePlannedSessionIntents, plannedDays = [], plannedMonths = [], plannedWeeks = [], templates = [], saveTemplates, onOpenTrick }) {
  const today = todayLocal();
  const safeSessions = Array.isArray(trainingSessions) ? trainingSessions : [];
  const sessionsByDate = (ds) => safeSessions.filter(s => s.date === ds);
  const todaySessions = sessionsByDate(today);

  const [editingSession, setEditingSession] = useState(null);

  useEffect(() => {
    if (section === 'log' && setSection) setSection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monday = useMemo(() => {
    const m = new Date();
    m.setHours(0, 0, 0, 0);
    const day = m.getDay();
    const diff = m.getDate() - day + (day === 0 ? -6 : 1);
    m.setDate(diff);
    return m;
  }, []);
  const weekStartStr = formatLocalDate(monday);
  const weekEndStr = (() => {
    const end = new Date(monday); end.setDate(monday.getDate() + 6);
    return formatLocalDate(end);
  })();
  const safeDays = Array.isArray(trainingDays) ? trainingDays : [];
  const daysThisWeek = new Set(safeDays.filter(d => d >= weekStartStr && d <= weekEndStr)).size;
  const totalSessions = safeSessions.length;

  const HEATMAP_WEEKS = 14;
  const heatmapColumns = useMemo(() => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - 7 * (HEATMAP_WEEKS - 1));
    const cols = [];
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        col.push(formatLocalDate(date));
      }
      cols.push(col);
    }
    return cols;
  }, [monday]);

  const intensityLevel = (s) => {
    if (!s) return 0;
    const rpe = Number(s.rpe) || 0;
    const min = Number(s.durationMinutes) || 0;
    const score = (rpe * Math.max(min, 30)) / 60;
    if (score >= 12) return 4;
    if (score >= 7) return 3;
    if (score >= 3) return 2;
    return 1;
  };
  const intensityForDate = (ds) => {
    const all = sessionsByDate(ds);
    if (all.length === 0) return 0;
    const totalMin = all.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
    const maxRpe = Math.max(...all.map(s => Number(s.rpe) || 0));
    return intensityLevel({ rpe: maxRpe, durationMinutes: totalMin });
  };
  const cellTone = (level) => {
    if (level === 4) return 'bg-emerald-300';
    if (level === 3) return 'bg-emerald-500';
    if (level === 2) return 'bg-emerald-700';
    if (level === 1) return 'bg-emerald-900/70';
    return 'bg-slate-800/60';
  };

  const recentSessions = useMemo(() => {
    return [...safeSessions]
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 8);
  }, [safeSessions]);

  const rpePillClass = (rpe) => {
    if (rpe >= 9) return 'bg-red-500/25 text-red-200 border-red-500/40';
    if (rpe >= 7) return 'bg-orange-500/25 text-orange-200 border-orange-500/40';
    return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
  };

  const onSaveSession = async (entry) => {
    const exists = safeSessions.some(s => s.id === entry.id);
    const next = exists
      ? safeSessions.map(s => (s.id === entry.id ? entry : s))
      : [entry, ...safeSessions];
    await saveTrainingSessions(next);
    if (markDayTrained && entry.date) await markDayTrained(entry.date);
    setEditingSession(null);
  };

  const onDeleteSession = async (id) => {
    await saveTrainingSessions(safeSessions.filter(s => s.id !== id));
  };

  if (editingSession) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <button onClick={() => setEditingSession(null)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <LogSessionSheet
          key={editingSession.id}
          inline
          tricks={tricks}
          weeklyGoals={weeklyGoals}
          existing={editingSession}
          onCancel={() => setEditingSession(null)}
          onSave={onSaveSession}
          onDelete={() => {
            if (window.confirm('Delete this session?')) {
              onDeleteSession(editingSession.id);
              setEditingSession(null);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-orange-300 uppercase">Streak</div>
            <div className="flex items-baseline gap-2"><span className="text-4xl font-black">{streak}</span><span className="text-sm font-bold text-orange-200">days</span></div>
            <div className="text-[11px] font-bold mt-1 text-orange-200">
              {daysThisWeek > 0 ? `🔥 ${daysThisWeek} of 7 this week` : 'No days yet this week'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-orange-300 uppercase">Total</div>
            <div className="text-2xl font-black">{totalSessions} <span className="text-sm font-bold text-orange-200">sessions</span></div>
          </div>
        </div>
      </div>

      <LogSessionSheet
        inline
        tricks={tricks}
        weeklyGoals={weeklyGoals}
        onSave={onSaveSession}
      />



      <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold flex items-center gap-2 mb-3"><Flame className="w-5 h-5 text-purple-400" /> Recent sessions</div>
        {recentSessions.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-6">
            No sessions yet — tap above to log your first one.
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentSessions.map(s => {
              const d = new Date((s.date || today) + 'T00:00:00');
              const dLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const rpe = Number(s.rpe) || 0;
              const dur = Number(s.durationMinutes) || 0;
              const trickCount = (Array.isArray(s.practicedTricks) ? s.practicedTricks : []).length;
              return (
                <button key={s.id} onClick={() => setEditingSession(s)}
                  className="w-full flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-700 rounded-xl p-3 text-left transition">
                  <div className="text-xs font-bold text-slate-300 w-24 flex-shrink-0">{dLabel}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${rpePillClass(rpe)}`}>RPE {rpe || '—'}</span>
                  <span className="text-xs text-slate-400">{dur} min</span>
                  <span className="text-xs text-slate-400 ml-auto">{trickCount} {trickCount === 1 ? 'trick' : 'tricks'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

function LogSessionSheet({ tricks = [], weeklyGoals = [], existing = null, onCancel, onSave, onDelete, inline = false }) {
  const today = todayLocal();
  const [date, setDate] = useState(existing?.date || today);
  const [duration, setDuration] = useState(existing?.durationMinutes ? String(existing.durationMinutes) : '');
  const [rpe, setRpe] = useState(existing?.rpe ?? 6);
  const [practicedTricks, setPracticedTricks] = useState(
    Array.isArray(existing?.practicedTricks)
      ? existing.practicedTricks
      : weeklyGoals.map(g => g.trickId)
  );
  const [notes, setNotes] = useState(existing?.notes || '');
  const [trickQuery, setTrickQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredTricks = useMemo(() => {
    const q = trickQuery.trim().toLowerCase();
    const selectedSet = new Set(practicedTricks);
    return tricks
      .filter(t => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aSel = selectedSet.has(a.id) ? 0 : 1;
        const bSel = selectedSet.has(b.id) ? 0 : 1;
        if (aSel !== bSel) return aSel - bSel;
        return a.name.localeCompare(b.name);
      });
  }, [tricks, practicedTricks, trickQuery]);

  const togglePracticed = (id) => {
    setPracticedTricks(curr => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  };

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const entry = {
        id: existing?.id ?? Date.now(),
        date,
        practicedTricks,
        rpe: Number(rpe),
        durationMinutes: duration ? Math.max(0, parseInt(duration, 10) || 0) : 0,
        notes: notes.trim(),
        createdAt: existing?.createdAt ?? Date.now(),
      };
      if (existing?.focusTags !== undefined) entry.focusTags = existing.focusTags;
      if (existing?.trickStatusChanges !== undefined) entry.trickStatusChanges = existing.trickStatusChanges;
      await onSave(entry);
    } finally {
      setSubmitting(false);
    }
  };

  const rpeLabel = rpe >= 9 ? 'All-out' : rpe >= 7 ? 'Hard' : rpe >= 5 ? 'Moderate' : 'Easy';
  const rpeColor = rpe >= 9 ? 'text-red-300' : rpe >= 7 ? 'text-orange-300' : rpe >= 5 ? 'text-amber-300' : 'text-emerald-300';

  if (inline) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold flex items-center gap-2"><ScrollText className="w-5 h-5 text-purple-400" /> Log Session</div>
          {onCancel && <button onClick={onCancel} className="text-xs font-bold text-slate-400 hover:text-white">Cancel</button>}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Duration (min)</label>
            <input type="number" min="0" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">RPE</label>
            <span className={`text-xs font-bold ${rpeColor}`}>{rpe} · {rpeLabel}</span>
          </div>
          <input type="range" min="1" max="10" step="1" value={rpe}
            onChange={(e) => setRpe(parseInt(e.target.value, 10))}
            className="w-full accent-purple-500" />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>1</span><span>10</span></div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">Tricks practiced (optional)</label>
            {practicedTricks.length > 0 && (
              <span className="text-[10px] text-slate-400">{practicedTricks.length} selected</span>
            )}
          </div>
          <input type="text" value={trickQuery} onChange={(e) => setTrickQuery(e.target.value)}
            placeholder="Search tricks…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 mb-2 focus:outline-none focus:border-purple-500" />
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {filteredTricks.slice(0, 20).map(t => {
              const on = practicedTricks.includes(t.id);
              return (
                <button key={t.id} onClick={() => togglePracticed(t.id)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border transition ${on ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="How did it feel? What worked?"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none" />
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <button onClick={handleSave} disabled={submitting}
            className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white disabled:opacity-50 transition">
            {submitting ? 'Saving…' : (existing ? 'Save changes' : 'Save session')}
          </button>
          {onDelete && (
            <button onClick={onDelete} className="w-full py-2 rounded-lg text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30">
              × Delete session
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-t sm:border border-purple-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-full sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">{existing ? 'Edit session' : 'Log session'}</div>
            <div className="font-black text-base">{date}</div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Duration (min)</label>
            <input type="number" min="0" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">RPE</label>
              <span className={`text-xs font-bold ${rpeColor}`}>{rpe} · {rpeLabel}</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500" />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>1</span><span>10</span></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Tricks practiced (optional)</label>
              {practicedTricks.length > 0 && (
                <span className="text-[10px] text-slate-400">{practicedTricks.length} selected</span>
              )}
            </div>
            <input type="text" value={trickQuery} onChange={(e) => setTrickQuery(e.target.value)}
              placeholder="Search tricks…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 mb-2 focus:outline-none focus:border-purple-500" />
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {filteredTricks.slice(0, 20).map(t => {
                const on = practicedTricks.includes(t.id);
                return (
                  <button key={t.id} onClick={() => togglePracticed(t.id)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border transition ${on ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="How did it feel? What worked?"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none" />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button onClick={handleSave} disabled={submitting}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white disabled:opacity-50 transition">
              {submitting ? 'Saving…' : (existing ? 'Save changes' : 'Save session')}
            </button>
            {onDelete && (
              <button onClick={onDelete} className="w-full py-2 rounded-lg text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30">
                × Delete session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UseAsTemplateModal({ sourceSession, tricks = [], plannedDays = [], plannedMonths = [], plannedWeeks = [], plannedSessionFocus = {}, savePlannedSessionFocus, plannedSessionIntents = {}, savePlannedSessionIntents, trainingSessions = [], templates = [], saveTemplates, onClose }) {
  const [step, setStep] = useState(1);
  const [targetDate, setTargetDate] = useState(null);
  const [customDate, setCustomDate] = useState('');
  const initialTrickIds = Array.isArray(sourceSession?.practicedTricks) ? sourceSession.practicedTricks : [];
  const [carryTrickIds, setCarryTrickIds] = useState(initialTrickIds);
  const [carryTags, setCarryTags] = useState(true);
  const [carryDuration, setCarryDuration] = useState(false);
  const [intent, setIntent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState(null);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(today);
  const sourceDate = sourceSession?.date;

  const weekOfMonth = (date) => Math.ceil(date.getDate() / 7);
  const isPlannedDay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (Array.isArray(plannedDays) && plannedDays.length > 0 && !plannedDays.includes(d.getDay())) return false;
    if (Array.isArray(plannedMonths) && plannedMonths.length > 0 && !plannedMonths.includes(d.getMonth())) return false;
    if (Array.isArray(plannedWeeks) && plannedWeeks.length > 0 && !plannedWeeks.includes(weekOfMonth(d))) return false;
    const anySelected = (plannedDays?.length || 0) + (plannedMonths?.length || 0) + (plannedWeeks?.length || 0);
    return anySelected > 0;
  };

  const safeSessions = Array.isArray(trainingSessions) ? trainingSessions : [];
  const dateHasSession = (ds) => safeSessions.some(s => s.date === ds);

  const tomorrowD = new Date(today); tomorrowD.setDate(today.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrowD);
  const tomorrowTrainable = isPlannedDay(tomorrowStr);

  const findNextOpenDay = () => {
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const ds = formatLocalDate(d);
      if (!isPlannedDay(ds)) continue;
      if (dateHasSession(ds)) continue;
      const focus = plannedSessionFocus[ds];
      if (Array.isArray(focus) && focus.length > 0) continue;
      return ds;
    }
    return null;
  };
  const nextOpenStr = findNextOpenDay();

  let sameWeekdayStr = null;
  if (sourceDate) {
    const next = new Date(sourceDate + 'T00:00:00');
    next.setDate(next.getDate() + 7);
    if (next > today) sameWeekdayStr = formatLocalDate(next);
  }

  const fmtDateLabel = (ds) => {
    if (!ds) return '';
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };
  const fmtShortDate = (ds) => {
    if (!ds) return '';
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const sourceTricks = initialTrickIds.map(id => tricks.find(t => t.id === id)).filter(Boolean);
  const sourceTags = Array.isArray(sourceSession?.focusTags) ? sourceSession.focusTags : [];
  const sourceDuration = sourceSession?.durationMinutes || 0;

  const carryTricks = carryTrickIds.map(id => tricks.find(t => t.id === id)).filter(Boolean);
  const addable = tricks.filter(t => !carryTrickIds.includes(t.id) && t.status !== 'got_it')
    .sort((a, b) => a.name.localeCompare(b.name));

  // Pattern detection: count past sessions with the exact same trick set as the carry list
  const carrySetKey = [...carryTrickIds].sort().join(',');
  const matchingHistoryCount = safeSessions.filter(s => {
    const ids = Array.isArray(s.practicedTricks) ? [...s.practicedTricks].sort() : [];
    return ids.join(',') === carrySetKey;
  }).length;
  const suggestTemplateName = (() => {
    if (sourceTags[0]) return `${sourceTags[0]} session`;
    if (carryTricks.length > 0) {
      const cat = carryTricks[0].category;
      return `${cat} flow`;
    }
    return 'Saved session';
  })();
  const alreadyTemplated = templates.some(t => {
    const tIds = Array.isArray(t.trickIds) ? [...t.trickIds].sort().join(',') : '';
    return tIds === carrySetKey;
  });

  const applyPlan = async () => {
    if (!targetDate || submitting) return;
    setSubmitting(true);
    try {
      const nextFocus = { ...plannedSessionFocus, [targetDate]: carryTrickIds };
      await savePlannedSessionFocus(nextFocus);
      const nextIntents = { ...plannedSessionIntents };
      if (intent && intent.trim()) nextIntents[targetDate] = intent.trim();
      else if (carryTags && sourceTags.length > 0) {
        nextIntents[targetDate] = `Repeat what worked ${fmtShortDate(sourceDate)} (${sourceTags.map(t => '#' + t).join(' ')})`;
      } else if (sourceDate) {
        nextIntents[targetDate] = `Repeat what worked ${fmtShortDate(sourceDate)}`;
      }
      await savePlannedSessionIntents(nextIntents);
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!saveTemplates || alreadyTemplated) return;
    const newTemplate = {
      id: Date.now(),
      name: suggestTemplateName,
      sourceSessionId: sourceSession?.id || null,
      createdAt: Date.now(),
      useCount: 1,
      lastUsedAt: Date.now(),
      trickIds: [...carryTrickIds],
      carryTags,
      tags: carryTags ? sourceTags : [],
      carryDuration,
      durationMinutes: carryDuration ? sourceDuration : 0,
      defaultIntent: intent.trim(),
    };
    await saveTemplates([...templates, newTemplate]);
    setSavedTemplateId(newTemplate.id);
  };

  const dotFor = (n) => (
    <span className={`h-2 rounded-full transition ${step === n ? 'w-6 bg-purple-300' : step > n ? 'w-2 bg-purple-500' : 'w-2 bg-slate-700'}`} />
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-t sm:border border-purple-500/40 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-full sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">{dotFor(1)}{dotFor(2)}{dotFor(3)}</div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Step 1 of 3</div>
                <h2 className="font-black text-xl">Plan this for…</h2>
              </div>

              {sourceSession && (
                <div className="bg-slate-800/60 border border-green-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /></div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-green-300">Source · {fmtShortDate(sourceDate)}</div>
                  </div>
                  <div className="flex items-center flex-wrap gap-1 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">{sourceTricks.length} {sourceTricks.length === 1 ? 'trick' : 'tricks'}</span>
                    {sourceDuration > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">~{sourceDuration} min</span>}
                    {sourceTags.map(t => <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">#{t}</span>)}
                  </div>
                  <div className="text-xs text-slate-300 truncate">{sourceTricks.map(t => t.name).join(', ')}</div>
                </div>
              )}

              <div className="space-y-2">
                {tomorrowTrainable && (
                  <button onClick={() => { setTargetDate(tomorrowStr); setStep(2); }}
                    className={`w-full text-left rounded-xl p-3 border-2 transition ${targetDate === tomorrowStr ? 'border-purple-400 bg-purple-500/15' : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-black text-sm">Tomorrow</div>
                        <div className="text-[11px] text-slate-400">{fmtDateLabel(tomorrowStr)}</div>
                      </div>
                      {plannedSessionFocus[tomorrowStr]?.length > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-200 border border-red-500/40">REPLACES PLAN</span>
                      )}
                    </div>
                  </button>
                )}

                {nextOpenStr && nextOpenStr !== tomorrowStr && (
                  <button onClick={() => { setTargetDate(nextOpenStr); setStep(2); }}
                    className={`w-full text-left rounded-xl p-3 border-2 transition ${targetDate === nextOpenStr ? 'border-purple-400 bg-purple-500/15' : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'}`}>
                    <div className="font-black text-sm">Next open day</div>
                    <div className="text-[11px] text-slate-400">{fmtDateLabel(nextOpenStr)}</div>
                  </button>
                )}

                {sameWeekdayStr && sameWeekdayStr !== tomorrowStr && sameWeekdayStr !== nextOpenStr && (
                  <button onClick={() => { setTargetDate(sameWeekdayStr); setStep(2); }}
                    className={`w-full text-left rounded-xl p-3 border-2 transition ${targetDate === sameWeekdayStr ? 'border-purple-400 bg-purple-500/15' : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'}`}>
                    <div className="font-black text-sm">Same weekday next week</div>
                    <div className="text-[11px] text-slate-400">{fmtDateLabel(sameWeekdayStr)}</div>
                  </button>
                )}

                <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-3 space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Or pick a different date
                  </label>
                  <div className="flex gap-2">
                    <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
                      min={todayStr}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm" />
                    <button onClick={() => { if (customDate && customDate >= todayStr) { setTargetDate(customDate); setStep(2); } }}
                      disabled={!customDate || customDate < todayStr}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white disabled:opacity-40">
                      Use →
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={onClose} className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1">Cancel</button>
            </>
          )}

          {step === 2 && targetDate && (
            <>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Step 2 of 3</div>
                <h2 className="font-black text-xl">Tweak what carries</h2>
              </div>

              <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-2 flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">From:</span>
                <span className="font-bold text-slate-200">{fmtShortDate(sourceDate)}</span>
                <span className="text-slate-500">→</span>
                <span className="text-purple-300 font-bold">{fmtShortDate(targetDate)}</span>
              </div>

              <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 space-y-2">
                <div className="text-sm font-bold flex items-center justify-between">
                  <span>🎯 Focus tricks</span>
                  <span className="text-[10px] font-bold text-purple-300">{carryTricks.length} carrying</span>
                </div>
                {carryTricks.length === 0 ? (
                  <div className="text-[11px] text-slate-400 italic">No tricks — add at least one below.</div>
                ) : (
                  carryTricks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-2">
                      <CategoryIcon category={t.category} size={16} />
                      <span className="flex-1 truncate text-sm">{t.name}</span>
                      <button onClick={() => setCarryTrickIds(arr => arr.filter(x => x !== t.id))} className="text-slate-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))
                )}
                {addable.length > 0 && (
                  <select value="" onChange={(e) => { if (e.target.value) setCarryTrickIds(arr => [...arr, parseInt(e.target.value, 10)]); }}
                    className="w-full bg-slate-800 border border-dashed border-slate-700 rounded text-xs text-slate-300 px-2 py-1.5">
                    <option value="">+ Add another trick…</option>
                    {addable.map(t => <option key={t.id} value={t.id}>{t.name} ({t.difficulty})</option>)}
                  </select>
                )}
              </div>

              {sourceTags.length > 0 && (
                <button onClick={() => setCarryTags(v => !v)}
                  className={`w-full text-left rounded-xl p-3 border-2 transition ${carryTags ? 'border-purple-400/60 bg-purple-500/10' : 'border-slate-700 bg-slate-800/40'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">🏷️ Session character</div>
                      <div className="text-[11px] text-slate-400">Carry the {sourceTags.map(t => '#' + t).join(' ')} tag{sourceTags.length === 1 ? '' : 's'} into the intent</div>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition flex-shrink-0 ${carryTags ? 'bg-purple-500' : 'bg-slate-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition ${carryTags ? 'translate-x-4' : ''}`} />
                    </div>
                  </div>
                </button>
              )}

              {sourceDuration > 0 && (
                <button onClick={() => setCarryDuration(v => !v)}
                  className={`w-full text-left rounded-xl p-3 border-2 transition ${carryDuration ? 'border-purple-400/60 bg-purple-500/10' : 'border-slate-700 bg-slate-800/40'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">⏱️ Duration hint</div>
                      <div className="text-[11px] text-slate-400">Show "expected ~{sourceDuration} min" on the planned day</div>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition flex-shrink-0 ${carryDuration ? 'bg-purple-500' : 'bg-slate-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition ${carryDuration ? 'translate-x-4' : ''}`} />
                    </div>
                  </div>
                </button>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Why this session?</label>
                <textarea value={intent} onChange={(e) => setIntent(e.target.value)}
                  placeholder={`Repeat what worked ${fmtShortDate(sourceDate)}…`}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs resize-none" />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => setStep(1)} className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200">‹ Back</button>
                <button onClick={applyPlan} disabled={carryTrickIds.length === 0 || submitting}
                  className="flex-1 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white disabled:opacity-40">
                  {submitting ? 'Applying…' : 'Apply to plan →'}
                </button>
              </div>
            </>
          )}

          {step === 3 && targetDate && (
            <>
              <div className="text-center py-4">
                <div className="inline-flex w-14 h-14 rounded-full bg-green-500 items-center justify-center mb-3 shadow-lg shadow-green-500/30">
                  <Check className="w-8 h-8 text-white" strokeWidth={3} />
                </div>
                <h2 className="font-black text-xl">Plan applied</h2>
                <div className="text-sm text-slate-400 mt-1">{fmtDateLabel(targetDate)} is now planned with {carryTricks.length} {carryTricks.length === 1 ? 'focus trick' : 'focus tricks'}.</div>
              </div>

              <div className="bg-slate-800/60 border border-purple-500/40 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500 text-white">PLANNED</span>
                  <span className="text-[11px] font-bold text-slate-200">{fmtShortDate(targetDate)}</span>
                </div>
                <div className="text-xs text-slate-300">{carryTricks.map(t => t.name).join(', ')}</div>
                {intent && <div className="text-[11px] text-slate-400 italic mt-1">"{intent}"</div>}
              </div>

              {matchingHistoryCount >= 3 && !alreadyTemplated && saveTemplates && !savedTemplateId && (
                <div className="bg-purple-500/10 border border-purple-500/40 rounded-xl p-3">
                  <div className="text-sm font-bold mb-1">📌 Pattern detected</div>
                  <div className="text-[11px] text-slate-300 mb-2">You've used this session shape <span className="font-bold text-purple-200">{matchingHistoryCount}</span> times. Want to save it as a named template?</div>
                  <button onClick={saveAsTemplate}
                    className="w-full py-1.5 rounded-lg text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white">
                    Save as "{suggestTemplateName}"
                  </button>
                </div>
              )}
              {savedTemplateId && (
                <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-green-300">✓ Template saved</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">"{suggestTemplateName}" is now in your templates.</div>
                </div>
              )}

              <button onClick={onClose}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-2">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionDetailModal({ session, tricks = [], onClose, onDelete, onOpenTrick, onUseAsTemplate }) {
  if (!session) return null;
  const d = new Date(session.date + 'T00:00:00');
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  // Keep deleted tricks visible as placeholders so the session record reflects what was practiced.
  const practicedItems = (session.practicedTricks || []).map(id => ({ id, trick: tricks.find(t => t.id === id) || null }));
  const practicedCount = practicedItems.length;
  const changes = Array.isArray(session.trickStatusChanges) ? session.trickStatusChanges : [];
  const changeForTrick = (tid) => changes.find(c => c.trickId === tid);
  const tagList = Array.isArray(session.focusTags) ? session.focusTags : [];
  const masteredHere = changes.filter(c => c.toStatus === 'got_it').length;
  const rpeColor = (rpe) => rpe >= 9 ? 'bg-red-500/20 text-red-200 border-red-500/40' : rpe >= 7 ? 'bg-orange-500/20 text-orange-200 border-orange-500/40' : 'bg-amber-500/20 text-amber-200 border-amber-500/40';

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-t sm:border border-purple-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-full sm:max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Session details</div>
            <div className="font-black text-base">{dayLabel}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-xl p-3 text-center border ${rpeColor(session.rpe || 0)}`}>
              <div className="text-[10px] font-bold uppercase opacity-80">RPE</div>
              <div className="text-2xl font-black">{session.rpe ?? '—'}</div>
            </div>
            <div className="rounded-xl p-3 text-center bg-slate-800 border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Min</div>
              <div className="text-2xl font-black">{session.durationMinutes || 0}</div>
            </div>
            <div className="rounded-xl p-3 text-center bg-slate-800 border border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Tricks</div>
              <div className="text-2xl font-black">{practicedCount}</div>
            </div>
          </div>

          {practicedCount > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Tricks practiced</div>
              <div className="space-y-1.5">
                {practicedItems.map(({ id, trick: t }) => {
                  if (!t) {
                    return (
                      <div key={id} className="w-full flex items-center gap-2 bg-slate-900/60 border border-dashed border-slate-700 rounded-lg p-2">
                        <span className="text-base flex-shrink-0">🗑️</span>
                        <span className="text-xs text-slate-400 italic">Deleted trick · id {id}</span>
                      </div>
                    );
                  }
                  const change = changeForTrick(t.id);
                  const masteredHere = change?.toStatus === 'got_it';
                  return (
                    <button key={t.id} onClick={() => { onOpenTrick && onOpenTrick(t); onClose && onClose(); }}
                      className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-2 text-left transition">
                      <CategoryIcon category={t.category} size={18} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{t.name}</div>
                        {change && change.fromStatus !== change.toStatus && (
                          <div className="text-[10px] mt-0.5 flex items-center gap-1">
                            <span className="text-slate-500">{change.fromStatus.replace(/_/g, ' ')}</span>
                            <span className="text-green-400">→</span>
                            <span className="text-green-300 font-bold">{change.toStatus.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                      {masteredHere && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/40 flex-shrink-0">★ MASTERED</span>}
                      <StatusPill trick={t} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tagList.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Felt like</div>
              <div className="flex flex-wrap gap-1.5">
                {tagList.map(tag => (
                  <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {session.notes && (
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Note</div>
              <div className="text-sm text-slate-200 bg-slate-800/60 border-l-4 border-purple-500/40 rounded-r-lg p-3 whitespace-pre-wrap">{session.notes}</div>
            </div>
          )}

          {masteredHere > 0 && (
            <div className="bg-gradient-to-br from-yellow-500/15 to-orange-500/10 border border-yellow-500/40 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-sm font-black text-yellow-200">Milestone session</div>
              <div className="text-[10px] text-slate-300 mt-0.5">{masteredHere} {masteredHere === 1 ? 'trick' : 'tricks'} mastered today</div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 space-y-2">
            {onUseAsTemplate && (
              <button onClick={() => onUseAsTemplate(session)}
                className="w-full py-2 rounded-lg text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40">
                📋 Use as template
              </button>
            )}
            {onDelete && (
              <button onClick={() => { if (window.confirm('Delete this session?')) { onDelete(session.id); onClose && onClose(); } }}
                className="w-full py-2 rounded-lg text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30">
                × Delete session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionsBrowser({ trainingSessions = [], saveTrainingSessions, tricks = [], legacyJournal = [], plannedSessionFocus = {}, savePlannedSessionFocus, plannedSessionIntents = {}, savePlannedSessionIntents, plannedDays = [], plannedMonths = [], plannedWeeks = [], templates = [], saveTemplates, onClose, onOpenTrick }) {
  const [legacyOpen, setLegacyOpen] = useState(false);
  const safeSessions = Array.isArray(trainingSessions) ? trainingSessions : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [templateSession, setTemplateSession] = useState(null);
  const [monthLimits, setMonthLimits] = useState({});

  const sessionStats = useMemo(() => {
    let totalSessions = 0, totalMinutes = 0;
    const tagCounts = {};
    const trickCounts = {};
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let sessionsThisMonth = 0;
    for (const s of safeSessions) {
      totalSessions += 1;
      totalMinutes += Number(s.durationMinutes) || 0;
      if (s.date && s.date.startsWith(thisMonth)) sessionsThisMonth += 1;
      if (Array.isArray(s.focusTags)) for (const t of s.focusTags) tagCounts[t] = (tagCounts[t] || 0) + 1;
      if (Array.isArray(s.practicedTricks)) for (const id of s.practicedTricks) trickCounts[id] = (trickCounts[id] || 0) + 1;
    }
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
    const topTricks = Object.entries(trickCounts).sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([id]) => tricks.find(t => t.id === parseInt(id, 10))).filter(Boolean);
    const recent8 = [...safeSessions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8);
    const avgRpe = recent8.length > 0
      ? Math.round((recent8.reduce((sum, s) => sum + (Number(s.rpe) || 0), 0) / recent8.length) * 10) / 10
      : 0;
    return { totalSessions, totalHours, sessionsThisMonth, topTag, topTricks, avgRpe };
  }, [safeSessions, tricks]);
  const { totalSessions, totalHours, sessionsThisMonth, topTag, topTricks, avgRpe } = sessionStats;

  const filterChips = useMemo(() => ([
    { id: 'all', label: 'All', count: totalSessions, match: () => true },
    { id: 'hard', label: '🔥 Hard', match: (s) => (Number(s.rpe) || 0) >= 7 },
    ...topTricks.map(t => ({ id: `trick_${t.id}`, label: t.name, match: (s) => Array.isArray(s.practicedTricks) && s.practicedTricks.includes(t.id) })),
    ...(topTag ? [{ id: `tag_${topTag[0]}`, label: `#${topTag[0]}`, match: (s) => Array.isArray(s.focusTags) && s.focusTags.includes(topTag[0]) }] : []),
    { id: 'long', label: '90+ min', match: (s) => (Number(s.durationMinutes) || 0) >= 90 },
    { id: 'milestones', label: '★ Milestones', match: (s) => Array.isArray(s.trickStatusChanges) && s.trickStatusChanges.some(c => c.toStatus === 'got_it') },
  ]), [totalSessions, topTricks, topTag]);
  const activeMatch = filterChips.find(c => c.id === activeFilter)?.match || (() => true);

  const { filtered, byMonth, monthKeys } = useMemo(() => {
    const trickNameById = new Map(tricks.map(t => [t.id, t.name || '']));
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = (s) => {
      if (!q) return true;
      if ((s.notes || '').toLowerCase().includes(q)) return true;
      if (Array.isArray(s.focusTags) && s.focusTags.some(t => t.toLowerCase().includes(q))) return true;
      const names = (Array.isArray(s.practicedTricks) ? s.practicedTricks : [])
        .map(id => trickNameById.get(id) || '').join(' ').toLowerCase();
      return names.includes(q);
    };
    const f = safeSessions.filter(s => activeMatch(s) && matchesSearch(s))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
    const bm = {};
    for (const s of f) {
      if (!s.date) continue;
      const k = s.date.slice(0, 7);
      if (!bm[k]) bm[k] = [];
      bm[k].push(s);
    }
    const mk = Object.keys(bm).sort().reverse();
    return { filtered: f, byMonth: bm, monthKeys: mk };
  }, [safeSessions, activeFilter, searchQuery, tricks, activeMatch]);

  const formatMonthLabel = (key) => {
    const [y, m] = key.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const rpePillClass = (rpe) => {
    if (rpe >= 9) return 'bg-red-500/25 text-red-200 border-red-500/40';
    if (rpe >= 7) return 'bg-orange-500/25 text-orange-200 border-orange-500/40';
    return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
  };

  const removeSession = async (id) => {
    if (!saveTrainingSessions) return;
    await saveTrainingSessions(safeSessions.filter(s => s.id !== id));
  };

  const selectedSession = selectedSessionId ? safeSessions.find(s => s.id === selectedSessionId) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="flex items-center gap-1 text-sm font-semibold text-purple-300 hover:text-purple-200">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1">
          <h2 className="font-black text-lg">Sessions</h2>
          <div className="text-[10px] text-slate-400">{totalSessions} logged · {totalHours} hours total</div>
        </div>
      </div>

      {totalSessions > 0 && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by trick or note…"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500" />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {filterChips.map(c => {
              const matchCount = c.id === 'all' ? totalSessions : safeSessions.filter(c.match).length;
              if (c.id !== 'all' && matchCount === 0) return null;
              const active = activeFilter === c.id;
              return (
                <button key={c.id} onClick={() => setActiveFilter(c.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition border ${active ? 'bg-slate-100 text-slate-900 border-slate-100' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                  {c.label} <span className={`ml-1 ${active ? 'text-slate-500' : 'text-slate-500'}`}>{matchCount}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">This month</div>
              <div className="text-xl font-black mt-0.5">{sessionsThisMonth}</div>
              <div className="text-[10px] text-slate-500">sessions</div>
            </div>
            <div className="p-3 text-center border-l border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Avg RPE</div>
              <div className="text-xl font-black mt-0.5 text-amber-300">{avgRpe || '—'}</div>
              <div className="text-[10px] text-slate-500">last 8</div>
            </div>
            <div className="p-3 text-center border-l border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Top focus</div>
              <div className="text-sm font-black mt-0.5 truncate">{topTag ? `#${topTag[0]}` : '—'}</div>
              <div className="text-[10px] text-slate-500">{topTag ? `${topTag[1]} ${topTag[1] === 1 ? 'session' : 'sessions'}` : 'no tags yet'}</div>
            </div>
          </div>
        </>
      )}

      {totalSessions === 0 ? (
        <div className="bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/40 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-2">📓</div>
          <div className="text-lg font-black text-slate-100">No sessions yet</div>
          <div className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto">
            Your training sessions will show up here. Log your first one from
            <span className="font-bold text-purple-200"> Training → Today's session → Log</span>.
          </div>
          {onClose && (
            <button onClick={onClose}
              className="mt-4 inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white">
              ← Back to Training
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-1">📭</div>
          <div className="text-sm font-bold text-slate-200">No sessions match</div>
          <div className="text-xs text-slate-400 mt-1">Try clearing the search or picking a different filter.</div>
        </div>
      ) : (
        monthKeys.map(monthKey => {
          const monthSessions = byMonth[monthKey];
          const monthMinutes = monthSessions.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
          const monthHours = Math.round(monthMinutes / 60 * 10) / 10;
          const limit = monthLimits[monthKey] || 6;
          const visible = monthSessions.slice(0, limit);
          const hidden = Math.max(0, monthSessions.length - visible.length);
          return (
            <div key={monthKey} className="space-y-2">
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 py-1.5 -mx-1 px-1 flex items-baseline gap-2">
                <span className="text-sm font-black uppercase tracking-wider text-slate-200">{formatMonthLabel(monthKey)}</span>
                <span className="text-[10px] text-slate-400">{monthSessions.length} {monthSessions.length === 1 ? 'session' : 'sessions'} · {monthHours} h</span>
              </div>
              {visible.map(s => {
                const d = new Date(s.date + 'T00:00:00');
                const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = d.getDate();
                const practicedNames = (Array.isArray(s.practicedTricks) ? s.practicedTricks : [])
                  .map(id => tricks.find(t => t.id === id)?.name || '').filter(Boolean);
                const isMilestone = Array.isArray(s.trickStatusChanges) && s.trickStatusChanges.some(c => c.toStatus === 'got_it');
                const tagOne = Array.isArray(s.focusTags) && s.focusTags.length > 0 ? s.focusTags[0] : null;
                const noteShort = s.notes && s.notes.length <= 80 ? s.notes : null;
                return (
                  <button key={s.id} onClick={() => setSelectedSessionId(s.id)}
                    className={`w-full text-left rounded-xl border p-3 transition hover:bg-slate-800 ${isMilestone ? 'bg-green-500/5 border-green-500/40 shadow-md shadow-green-500/10' : tagOne ? 'bg-slate-800/60 border-purple-500/30' : 'bg-slate-800/60 border-slate-700'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 text-center">
                        <div className="text-[9px] uppercase font-bold text-slate-400">{weekday}</div>
                        <div className="text-base font-black">{dayNum}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1 mb-1">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${rpePillClass(Number(s.rpe) || 0)}`}>RPE {s.rpe || '—'}</span>
                          {(s.durationMinutes || 0) > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">{s.durationMinutes} min</span>}
                          {tagOne && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">#{tagOne}</span>}
                          {isMilestone && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/40">★ Mastered</span>}
                        </div>
                        {practicedNames.length > 0 && (
                          <div className="text-xs text-slate-300 truncate">{practicedNames.join(', ')}</div>
                        )}
                        {noteShort && (
                          <div className="text-[11px] text-slate-400 italic mt-0.5 truncate">"{noteShort}"</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {hidden > 0 && (
                <button onClick={() => setMonthLimits(m => ({ ...m, [monthKey]: (m[monthKey] || 6) + 6 }))}
                  className="w-full text-[11px] text-slate-400 hover:text-slate-200 py-1.5 italic">
                  + {hidden} more {hidden === 1 ? 'session' : 'sessions'} in {formatMonthLabel(monthKey)}
                </button>
              )}
            </div>
          );
        })
      )}

      {legacyJournal.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-3">
          <button onClick={() => setLegacyOpen(o => !o)} className="w-full flex items-center gap-2 text-left">
            <span className="text-base">📜</span>
            <span className="text-xs font-bold text-slate-200 flex-1">Notes from earlier journal ({legacyJournal.length})</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${legacyOpen ? 'rotate-180' : ''}`} />
          </button>
          {legacyOpen && (
            <div className="mt-3 space-y-1.5">
              <div className="text-[10px] text-slate-500 italic mb-1">From the old free-text journal — read-only.</div>
              {[...legacyJournal].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 50).map(entry => (
                <div key={entry.timestamp} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-500 mb-1">{entry.date}</div>
                  <div className="text-xs text-slate-200 whitespace-pre-wrap">{entry.text}</div>
                </div>
              ))}
              {legacyJournal.length > 50 && (
                <div className="text-[10px] text-slate-500 text-center italic">+ {legacyJournal.length - 50} older entries</div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedSession && (
        <SessionDetailModal session={selectedSession} tricks={tricks}
          onClose={() => setSelectedSessionId(null)}
          onDelete={removeSession}
          onOpenTrick={onOpenTrick}
          onUseAsTemplate={(s) => setTemplateSession(s)} />
      )}

      {templateSession && (
        <UseAsTemplateModal sourceSession={templateSession} tricks={tricks}
          plannedDays={plannedDays} plannedMonths={plannedMonths} plannedWeeks={plannedWeeks}
          plannedSessionFocus={plannedSessionFocus} savePlannedSessionFocus={savePlannedSessionFocus}
          plannedSessionIntents={plannedSessionIntents} savePlannedSessionIntents={savePlannedSessionIntents}
          trainingSessions={trainingSessions}
          templates={templates} saveTemplates={saveTemplates}
          onClose={() => setTemplateSession(null)} />
      )}
    </div>
  );
}

function ProgressTab({ stats, tricks, earnedBadges, trainingDays }) {
  const categories = [...new Set(tricks.map(t => t.category))];
  const categoryStats = categories.map(cat => {
    const ct = tricks.filter(t => t.category === cat);
    const m = ct.filter(t => t.status === 'got_it').length;
    return { cat, mastered: m, total: ct.length, pct: ct.length > 0 ? (m / ct.length) * 100 : 0 };
  });
  const difficultyStats = [
    { label: 'Easy', count: stats.easyMastered, total: tricks.filter(t => t.difficulty === 'Easy').length, color: 'bg-green-500' },
    { label: 'Medium', count: stats.mediumMastered, total: tricks.filter(t => t.difficulty === 'Medium').length, color: 'bg-blue-500' },
    { label: 'Hard', count: stats.hardMastered, total: tricks.filter(t => t.difficulty === 'Hard').length, color: 'bg-orange-500' },
    { label: 'Super', count: stats.superMastered, total: tricks.filter(t => t.difficulty === 'Super').length, color: 'bg-purple-500' },
  ];
  const [expandedDifficulty, setExpandedDifficulty] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedLanding, setExpandedLanding] = useState(null);
  const [achievementsOpen, setAchievementsOpen] = useState(true);
  const sortByStatus = (a, b) => {
    const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : t.status === 'want_to_learn' ? 2 : 3;
    return order(a) - order(b) || a.name.localeCompare(b.name);
  };
  const TrickRow = ({ t }) => (
    <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
      <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
      <span className="flex-1 truncate">{t.name}</span>
      <StatusPill trick={t} size="sm" />
    </div>
  );
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-4"><div className="text-sm text-green-300 font-semibold">Total mastered</div><div className="text-4xl font-black">{stats.mastered}</div><div className="text-xs text-slate-400">out of {tricks.length} tricks</div></div>
        <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-4"><div className="text-sm text-orange-300 font-semibold">Training days</div><div className="text-4xl font-black">{trainingDays.length}</div><div className="text-xs text-slate-400">total logged</div></div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> By Difficulty</div>
        <div className="space-y-2">
          {difficultyStats.map(d => {
            const open = expandedDifficulty === d.label;
            const rows = tricks.filter(t => t.difficulty === d.label).slice().sort(sortByStatus);
            return (
              <div key={d.label}>
                <button onClick={() => setExpandedDifficulty(open ? null : d.label)}
                  className="w-full text-left hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold flex items-center gap-1">
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : '-rotate-90'}`} />
                      {d.label}
                    </span>
                    <span className="text-slate-400">{d.count}/{d.total}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${d.color} transition-all duration-500`} style={{ width: `${d.total > 0 ? (d.count / d.total) * 100 : 0}%` }} />
                  </div>
                </button>
                {open && (
                  <div className="space-y-1 mt-2 ml-4">
                    {rows.length === 0 ? (
                      <div className="text-xs text-slate-500 italic">No tricks at this difficulty.</div>
                    ) : rows.map(t => <TrickRow key={t.id} t={t} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-cyan-400" /> By Landing</div>
        <div className="space-y-2">
          {(() => {
            const landingCounts = LANDING_LEVELS.map(l => tricks.filter(t => Array.isArray(t.progress) && t.progress.includes(l.id)).length);
            const maxLandingCount = Math.max(1, ...landingCounts);
            return LANDING_LEVELS.map((l, i) => {
            const open = expandedLanding === l.id;
            const matched = tricks.filter(t => Array.isArray(t.progress) && t.progress.includes(l.id));
            const rows = matched.slice().sort(sortByStatus);
            const count = landingCounts[i];
            return (
              <div key={l.id}>
                <button onClick={() => setExpandedLanding(open ? null : l.id)}
                  className="w-full text-left hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold flex items-center gap-1">
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : '-rotate-90'}`} />
                      <span className="text-base">{l.emoji}</span>
                      {l.label}
                    </span>
                    <span className="text-slate-400">{count} {count === 1 ? 'trick' : 'tricks'}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${l.color} transition-all duration-500`} style={{ width: `${(count / maxLandingCount) * 100}%` }} />
                  </div>
                </button>
                {open && (
                  <div className="space-y-1 mt-2 ml-4">
                    {rows.length === 0 ? (
                      <div className="text-xs text-slate-500 italic">No tricks at this landing yet.</div>
                    ) : rows.map(t => <TrickRow key={t.id} t={t} />)}
                  </div>
                )}
              </div>
            );
          });
          })()}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold mb-3">By Category</div>
        <div className="space-y-2">
          {categoryStats.map(c => {
            const open = expandedCategory === c.cat;
            const rows = tricks.filter(t => t.category === c.cat).slice().sort(sortByStatus);
            return (
              <div key={c.cat}>
                <button onClick={() => setExpandedCategory(open ? null : c.cat)}
                  className="w-full text-left hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : '-rotate-90'}`} />
                      <CategoryIcon category={c.cat} size={16} className="text-slate-300" />
                      {c.cat}
                    </span>
                    <span className="text-slate-400">{c.mastered}/{c.total}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${c.pct}%` }} />
                  </div>
                </button>
                {open && (
                  <div className="space-y-1 mt-2 ml-4">
                    {rows.length === 0 ? (
                      <div className="text-xs text-slate-500 italic">No tricks in this category.</div>
                    ) : rows.map(t => <TrickRow key={t.id} t={t} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-yellow-500/30 rounded-2xl p-4">
        <button onClick={() => setAchievementsOpen(o => !o)} className="w-full flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-bold">Achievements ({earnedBadges.length}/{BADGES.length})</span>
          <ChevronDown className={`ml-auto w-4 h-4 text-slate-400 transition-transform ${achievementsOpen ? 'rotate-180' : ''}`} />
        </button>
        {achievementsOpen && (
          <div className="grid grid-cols-2 gap-2">
            {BADGES.map(b => {
              const earned = earnedBadges.some(e => e.id === b.id);
              return (
                <div key={b.id} className={`rounded-xl p-3 border transition ${earned ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50' : 'bg-slate-900 border-slate-700 opacity-50'}`}>
                  <div className="text-3xl mb-1">{earned ? b.icon : '🔒'}</div>
                  <div className={`text-sm font-bold ${earned ? 'text-yellow-300' : 'text-slate-500'}`}>{b.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{b.desc}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AddTab({ user, tricks = [] }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Flips');
  const [difficulty, setDifficulty] = useState('Medium');
  const [coolness, setCoolness] = useState(0);
  const [videos, setVideos] = useState([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoLabel, setNewVideoLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [sent, setSent] = useState(false);
  const categories = ['Flips', 'Jump', 'Tricks', 'Leap', 'Swings', 'Vaults', 'Gymnastics'];
  const difficulties = ['Easy', 'Medium', 'Hard', 'Super'];
  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    const url = normalizeUrl(newVideoUrl.trim());
    const noPrimaryYet = !videos.some(v => v.primary);
    setVideos([...videos, { url, label: newVideoLabel.trim() || 'Video', type: 'reference', primary: noPrimaryYet }]);
    setNewVideoUrl(''); setNewVideoLabel('');
  };
  const removeVideo = (idx) => {
    const removed = videos[idx];
    const next = videos.filter((_, i) => i !== idx);
    // Keep exactly one primary if any videos remain.
    if (removed?.primary && next.length > 0 && !next.some(v => v.primary)) {
      next[0] = { ...next[0], primary: true };
    }
    setVideos(next);
  };
  const togglePrimary = (idx) => {
    setVideos(videos.map((v, i) => i === idx ? { ...v, primary: !v.primary } : { ...v, primary: false }));
  };
  const reset = () => {
    setName(''); setCategory('Flips'); setDifficulty('Medium');
    setCoolness(0); setVideos([]); setNotes('');
    setNewVideoUrl(''); setNewVideoLabel('');
  };
  const submit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addDoc(collection(db, 'trickSuggestions'), {
        trick: { name: name.trim(), category, difficulty, notes, coolness },
        videos,
        requestedByUid: user.uid,
        requestedByEmail: user.email || '',
        requestedByName: user.displayName || user.email || 'Unknown',
        status: 'pending',
        createdAt: Date.now(),
      });
      reset();
      setSent(true);
      setTimeout(() => setSent(false), 2500);
    } catch (e) {
      console.error('Submit suggestion error', e);
      setSubmitError(`${e.code || 'error'}: ${e.message || 'Could not send'}`);
    }
    setSubmitting(false);
  };
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-slate-800/50 border border-purple-500/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1"><Plus className="w-5 h-5 text-purple-400" /><h2 className="font-bold text-lg">Suggest a trick</h2></div>
        <div className="text-xs text-slate-400 mb-3">An admin reviews your suggestion before it shows up for the whole family.</div>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Trick name</div>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Triple Backflip" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
            {(() => {
              const q = name.trim().toLowerCase();
              if (!q) return null;
              const match = tricks.find(t => t.name.toLowerCase() === q);
              const close = !match && tricks.filter(t => t.name.toLowerCase().includes(q) || q.includes(t.name.toLowerCase()));
              if (match) return (
                <div className="mt-2 flex items-start gap-2 bg-red-500/15 border border-red-500/40 rounded-lg px-3 py-2 text-xs text-red-300">
                  <span className="text-base leading-none">⚠️</span>
                  <span><span className="font-bold">"{match.name}"</span> is already in the trick list ({match.difficulty} · {match.category}).</span>
                </div>
              );
              if (close.length > 0) return (
                <div className="mt-2 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-300">
                  <span className="text-base leading-none">⚠️</span>
                  <span>Similar tricks already exist: {close.slice(0, 3).map(t => <span key={t.id} className="font-bold">{t.name}</span>).reduce((a, b) => [a, ', ', b])}.</span>
                </div>
              );
              return null;
            })()}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Category</div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${category === c ? 'bg-purple-500' : 'bg-slate-800 text-slate-300'}`}><CategoryIcon category={c} size={16} />{c}</button>)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Difficulty</div>
            <div className="flex gap-2">
              {difficulties.map(d => { const col = DIFFICULTY_COLORS[d]; return <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${difficulty === d ? `${col.strip} text-white` : 'bg-slate-800 text-slate-300'}`}>{d}</button>; })}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Cool factor (optional)</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => {
                const filled = coolness >= n;
                return (
                  <button key={n} onClick={() => setCoolness(coolness === n ? 0 : n)}
                    className="transition hover:scale-110 p-1" title={`${n} / 5`}>
                    <Star className={`w-7 h-7 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500 hover:text-yellow-300'}`} />
                  </button>
                );
              })}
              {coolness > 0 && (
                <button onClick={() => setCoolness(0)} className="ml-2 text-[10px] font-bold uppercase text-slate-500 hover:text-slate-300">Clear</button>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Videos</div>
            {videos.length > 0 && (
              <div className="space-y-2 mb-2">
                {videos.map((v, i) => (
                  <div key={i} className={`flex items-center gap-2 border rounded-lg p-2 text-sm transition ${v.primary ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-slate-900/50 border-slate-700'}`}>
                    <span className="text-base">{v.type === 'both' ? '📹🎓' : v.type === 'tutorial' ? '🎓' : '📹'}</span>
                    <span className="truncate flex-1">{v.label}</span>
                    <span className="text-xs text-slate-500 truncate flex-shrink-0 max-w-[120px]">{v.url}</span>
                    <button onClick={() => togglePrimary(i)}
                      title={v.primary ? 'Primary video' : 'Mark as primary'}
                      className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition ${v.primary ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-slate-500 hover:text-yellow-300 hover:bg-slate-800'}`}>
                      <Star className={`w-4 h-4 ${v.primary ? 'fill-yellow-400' : ''}`} />
                    </button>
                    <button onClick={() => removeVideo(i)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-2 space-y-2">
              <input type="text" value={newVideoLabel} onChange={e => setNewVideoLabel(e.target.value)} placeholder="Label (e.g. Storror tutorial)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <input type="url" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="YouTube or Vimeo URL" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                <button onClick={addVideo} disabled={!newVideoUrl.trim()} className="px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-bold text-sm">Add</button>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tips, things to remember, safety notes..." rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none" />
          </div>
          {submitError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-xs text-red-200 break-words">
              <div className="font-bold mb-1">Could not send</div>
              <div className="font-mono">{submitError}</div>
            </div>
          )}
          <button onClick={submit} disabled={!name.trim() || submitting} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition">{sent ? '✅ Sent for review!' : submitting ? 'Sending…' : 'Send suggestion'}</button>
        </div>
      </div>
    </div>
  );
}

function AdminTab({ currentUserUid, myTricks = [], saveTricks }) {
  const [profiles, setProfiles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [trickSearch, setTrickSearch] = useState('');
  const [trickSort, setTrickSort] = useState('default');
  const [trickFilterCategory, setTrickFilterCategory] = useState('all');
  const [trickFilterDifficulty, setTrickFilterDifficulty] = useState('all');
  const [editingTrick, setEditingTrick] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: 'Flips', difficulty: 'Medium' });
  const [savingTrick, setSavingTrick] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [communityTricks, setCommunityTricks] = useState([]);
  const [deletedTricks, setDeletedTricks] = useState([]);
  const [globalVideos, setGlobalVideos] = useState({});
  const [deletingTrickId, setDeletingTrickId] = useState(null);
  const [expandedUserDifficulty, setExpandedUserDifficulty] = useState(null);
  const [expandedUserCategory, setExpandedUserCategory] = useState(null);
  const [expandedUserLanding, setExpandedUserLanding] = useState(null);
  const [improvements, setImprovements] = useState([]);
  const [improvementError, setImprovementError] = useState(null);
  const [processingImprovement, setProcessingImprovement] = useState(null);
  const [suggestionError, setSuggestionError] = useState(null);
  const [processingSuggestion, setProcessingSuggestion] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [trickMgmtExpanded, setTrickMgmtExpanded] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      let profilesOk = false;

      // Load user profiles independently so one failure doesn't kill the other
      try {
        const snap = await getDocs(collection(db, 'userProfiles'));
        setProfiles(snap.docs.map(d => d.data()).sort((a, b) => (b.lastSignIn || 0) - (a.lastSignIn || 0)));
        profilesOk = true;
      } catch (e) {
        console.error('userProfiles load error', e);
        setLoadError(`Could not load users: ${e.code || e.message}. Check Firestore rules.`);
      }

      try {
        const snap = await getDocs(collection(db, 'accessRequests'));
        const statusOrder = { pending: 0, submitted: 1, rejected: 2, approved: 3 };
        setRequests(snap.docs.map(d => d.data()).sort((a, b) =>
          (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
          (a.requestedAt || 0) - (b.requestedAt || 0)
        ));
      } catch (e) {
        console.error('accessRequests load error', e);
        if (!profilesOk) setLoadError(`Could not load data: ${e.code || e.message}. Check Firestore rules.`);
      }

      try {
        const snap = await getDoc(doc(db, 'globalConfig', 'tricks'));
        if (snap.exists()) {
          const data = snap.data();
          setOverrides(data.overrides || {});
          setCommunityTricks(Array.isArray(data.communityTricks) ? data.communityTricks : []);
          setDeletedTricks(Array.isArray(data.deletedTricks) ? data.deletedTricks : []);
          setGlobalVideos(data.globalVideos || {});
        }
      } catch (e) { console.error('Global overrides load error', e); }

      try {
        const snap = await getDocs(collection(db, 'trickSuggestions'));
        const items = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
        const statusOrder = { pending: 0, approved: 1, denied: 2 };
        items.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || (b.createdAt || 0) - (a.createdAt || 0));
        setSuggestions(items);
      } catch (e) { console.error('Suggestions load error', e); }

      try {
        const snap = await getDocs(collection(db, 'improvementSuggestions'));
        const items = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
        const statusOrder = { pending: 0, approved: 1, denied: 2 };
        items.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || (b.createdAt || 0) - (a.createdAt || 0));
        setImprovements(items);
      } catch (e) { console.error('Improvements load error', e); }

      setLoading(false);
    };
    loadAll();
  }, []);

  const approveRequest = async (req) => {
    setRequestError(null);
    try {
      await setDoc(doc(db, 'approvedUsers', req.uid), {
        uid: req.uid,
        email: req.email,
        displayName: req.displayName,
        photoURL: req.photoURL,
        approvedAt: Date.now(),
      });
      await setDoc(doc(db, 'accessRequests', req.uid), { ...req, status: 'approved' });
      setRequests(r => r.map(x => x.uid === req.uid ? { ...x, status: 'approved' } : x));
    } catch (e) {
      console.error('Approve error', e);
      setRequestError(`Approve failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
  };

  const denyRequest = async (req) => {
    setRequestError(null);
    try {
      await setDoc(doc(db, 'accessRequests', req.uid), { ...req, status: 'rejected' });
      setRequests(r => r.map(x => x.uid === req.uid ? { ...x, status: 'rejected' } : x));
    } catch (e) {
      console.error('Deny error', e);
      setRequestError(`Deny failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
  };

  const removeUser = async (req) => {
    if (!window.confirm(`Remove access for ${req.displayName || req.email}?\n\nThey'll need to request access again next time they sign in.`)) return;
    setRequestError(null);
    try {
      await Promise.all([
        deleteDoc(doc(db, 'approvedUsers', req.uid)),
        deleteDoc(doc(db, 'accessRequests', req.uid)),
        deleteDoc(doc(db, 'userProfiles', req.uid)),
      ]);
      setRequests(r => r.filter(x => x.uid !== req.uid));
      setProfiles(p => p.filter(x => x.uid !== req.uid));
    } catch (e) {
      console.error('Remove user error', e);
      setRequestError(`Remove failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
  };

  const approveSuggestion = async (s) => {
    setSuggestionError(null);
    setProcessingSuggestion(s._id);
    try {
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      const newCommunity = [...communityTricks, {
        id: newId,
        name: s.trick.name,
        category: s.trick.category,
        difficulty: s.trick.difficulty,
        notes: s.trick.notes || '',
        coolness: Number(s.trick.coolness) || 0,
        suggestedBy: s.requestedByName || s.requestedByEmail || 'Unknown',
      }];
      const updates = { communityTricks: newCommunity, updatedAt: Date.now() };
      if (Array.isArray(s.videos) && s.videos.length > 0) {
        const overridesSnap = await getDoc(doc(db, 'globalConfig', 'tricks'));
        const existingGV = overridesSnap.exists() ? (overridesSnap.data().globalVideos || {}) : {};
        updates.globalVideos = { ...existingGV, [String(newId)]: s.videos };
      }
      await setDoc(doc(db, 'globalConfig', 'tricks'), updates, { merge: true });
      await setDoc(doc(db, 'trickSuggestions', s._id), { ...s, status: 'approved', approvedAt: Date.now(), approvedTrickId: newId }, { merge: true });
      setCommunityTricks(newCommunity);
      setSuggestions(arr => arr.map(x => x._id === s._id ? { ...x, status: 'approved', approvedTrickId: newId } : x));
    } catch (e) {
      console.error('Approve suggestion error', e);
      setSuggestionError(`Approve failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
    setProcessingSuggestion(null);
  };

  const denySuggestion = async (s) => {
    setSuggestionError(null);
    setProcessingSuggestion(s._id);
    try {
      await setDoc(doc(db, 'trickSuggestions', s._id), { ...s, status: 'denied', deniedAt: Date.now() }, { merge: true });
      setSuggestions(arr => arr.map(x => x._id === s._id ? { ...x, status: 'denied' } : x));
    } catch (e) {
      console.error('Deny suggestion error', e);
      setSuggestionError(`Deny failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
    setProcessingSuggestion(null);
  };

  const syncMyTricksToCommunity = async () => {
    if (syncing) return;
    if (!window.confirm(`Push your full trick library to the community list?\n\nNew tricks (not in the seed list) will be added to communityTricks. All your personal videos will be promoted to global AND removed from your personal library (so they don't appear twice).\n\nProceed?`)) return;
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const seedIds = new Set(INITIAL_TRICKS.map(t => t.id));
      const overridesSnap = await getDoc(doc(db, 'globalConfig', 'tricks'));
      const data = overridesSnap.exists() ? overridesSnap.data() : {};
      const existingCommunity = Array.isArray(data.communityTricks) ? data.communityTricks : [];
      const existingCommunityIds = new Set(existingCommunity.map(t => t.id));
      const existingGV = data.globalVideos || {};

      const newCommunity = [...existingCommunity];
      const newGV = { ...existingGV };
      const updatedMyTricks = [];
      let addedTricks = 0;
      let addedVideoTricks = 0;
      let clearedPersonalTricks = 0;

      for (const t of myTricks) {
        const isSeed = seedIds.has(t.id);
        if (!isSeed && !existingCommunityIds.has(t.id)) {
          newCommunity.push({
            id: t.id,
            name: t.name,
            category: t.category,
            difficulty: t.difficulty,
            notes: t.notes || '',
          });
          existingCommunityIds.add(t.id);
          addedTricks++;
        }
        const personalVideos = Array.isArray(t.videos) ? t.videos.filter(v => !v._global) : [];
        if (personalVideos.length > 0) {
          const key = String(t.id);
          const existingForTrick = Array.isArray(newGV[key]) ? newGV[key] : [];
          const existingUrls = new Set(existingForTrick.map(v => v.url));
          const additions = personalVideos
            .filter(v => v.url && !existingUrls.has(v.url))
            .map(({ _global, ...rest }) => rest);
          if (additions.length > 0) {
            newGV[key] = [...existingForTrick, ...additions];
            addedVideoTricks++;
          }
          updatedMyTricks.push({ ...t, videos: [] });
          clearedPersonalTricks++;
        } else {
          updatedMyTricks.push(t);
        }
      }

      await setDoc(doc(db, 'globalConfig', 'tricks'), {
        communityTricks: newCommunity,
        globalVideos: newGV,
        updatedAt: Date.now(),
      }, { merge: true });

      if (clearedPersonalTricks > 0 && typeof saveTricks === 'function') {
        await saveTricks(updatedMyTricks);
      }

      setCommunityTricks(newCommunity);
      setSyncResult(`✅ Synced. Added ${addedTricks} new community trick${addedTricks === 1 ? '' : 's'}, promoted videos for ${addedVideoTricks} trick${addedVideoTricks === 1 ? '' : 's'}, cleared personal videos on ${clearedPersonalTricks} trick${clearedPersonalTricks === 1 ? '' : 's'}.`);
      setTimeout(() => setSyncResult(null), 6000);
    } catch (e) {
      console.error('Sync error', e);
      setSyncError(`Sync failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
    setSyncing(false);
  };

  const removeTrickFromGlobal = async (trickId, trickName) => {
    if (!window.confirm(`Remove "${trickName}" from the global trick list?\n\nThis will hide it for all users on next load. Their personal videos and progress for this trick will be discarded when their app re-syncs.`)) return false;
    setDeletingTrickId(trickId);
    setSaveError(null);
    let ok = false;
    try {
      const snap = await getDoc(doc(db, 'globalConfig', 'tricks'));
      const data = snap.exists() ? snap.data() : {};
      const existingDeleted = Array.isArray(data.deletedTricks) ? data.deletedTricks : [];
      const existingCommunity = Array.isArray(data.communityTricks) ? data.communityTricks : [];
      const existingGV = data.globalVideos || {};
      const newGV = { ...existingGV };
      delete newGV[String(trickId)];
      const next = {
        deletedTricks: Array.from(new Set([...existingDeleted, trickId])),
        communityTricks: existingCommunity.filter(t => t.id !== trickId),
        globalVideos: newGV,
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'globalConfig', 'tricks'), next, { merge: true });
      setDeletedTricks(next.deletedTricks);
      setCommunityTricks(next.communityTricks);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 1500);
      ok = true;
    } catch (e) {
      console.error('Remove trick error', e);
      setSaveError(`Remove failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
    setDeletingTrickId(null);
    return ok;
  };

  const deleteEditingTrick = async () => {
    if (!editingTrick) return;
    const ok = await removeTrickFromGlobal(editingTrick.id, editForm.name.trim() || editingTrick.name);
    if (ok) setEditingTrick(null);
  };

  const respondImprovement = async (s, status) => {
    setImprovementError(null);
    setProcessingImprovement(s._id);
    try {
      await setDoc(doc(db, 'improvementSuggestions', s._id), { ...s, status, resolvedAt: Date.now() }, { merge: true });
      setImprovements(arr => arr.map(x => x._id === s._id ? { ...x, status, resolvedAt: Date.now() } : x));
    } catch (e) {
      console.error('Improvement update error', e);
      setImprovementError(`${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
    setProcessingImprovement(null);
  };
  const deleteImprovement = async (s) => {
    if (!window.confirm('Delete this improvement suggestion permanently?')) return;
    setImprovementError(null);
    try {
      await deleteDoc(doc(db, 'improvementSuggestions', s._id));
      setImprovements(arr => arr.filter(x => x._id !== s._id));
    } catch (e) {
      console.error('Delete improvement error', e);
      setImprovementError(`${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
  };

  const deleteSuggestion = async (s) => {
    if (!window.confirm('Delete this suggestion permanently?')) return;
    setSuggestionError(null);
    try {
      await deleteDoc(doc(db, 'trickSuggestions', s._id));
      setSuggestions(arr => arr.filter(x => x._id !== s._id));
    } catch (e) {
      console.error('Delete suggestion error', e);
      setSuggestionError(`Delete failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
  };

  const toggleAdmin = async (profile) => {
    const next = !profile.isAdmin;
    if (!window.confirm(next
      ? `Grant admin rights to ${profile.displayName || profile.email}?`
      : `Remove admin rights from ${profile.displayName || profile.email}?`)) return;
    setRequestError(null);
    try {
      await setDoc(doc(db, 'userProfiles', profile.uid), { isAdmin: next }, { merge: true });
      setProfiles(p => p.map(x => x.uid === profile.uid ? { ...x, isAdmin: next } : x));
    } catch (e) {
      console.error('Toggle admin error', e);
      setRequestError(`Admin toggle failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
  };

  const viewUser = async (profile) => {
    setSelectedUser(profile);
    setLoadingUser(true);
    setUserData(null);
    try {
      const [tricks, days, journal, goals] = await Promise.all([
        loadUserData(profile.uid, 'tricks'),
        loadUserData(profile.uid, 'trainingDays'),
        loadUserData(profile.uid, 'journal'),
        loadUserData(profile.uid, 'weeklyGoals'),
      ]);
      setUserData({
        tricks: tricks || [],
        trainingDays: days || [],
        journal: journal || [],
        weeklyGoals: goals || [],
      });
    } catch (e) {
      console.error('User data load error', e);
    }
    setLoadingUser(false);
  };

  const startEdit = (trick) => {
    const override = overrides[String(trick.id)];
    setEditingTrick(trick);
    setEditForm({
      name: override?.name || trick.name,
      category: override?.category || trick.category,
      difficulty: override?.difficulty || trick.difficulty,
    });
  };

  const saveTrickOverride = async () => {
    if (!editingTrick) return;
    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setSaveError('Name cannot be empty.');
      return;
    }
    setSavingTrick(true);
    setSaveError(null);
    const newOverrides = {
      ...overrides,
      [String(editingTrick.id)]: { name: trimmedName, category: editForm.category, difficulty: editForm.difficulty },
    };
    try {
      await setDoc(doc(db, 'globalConfig', 'tricks'), { overrides: newOverrides, updatedAt: Date.now() }, { merge: true });
      setOverrides(newOverrides);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 1500);
      setEditingTrick(null);
    } catch (e) {
      console.error('Save override error', e);
      setSaveError(`${e.code || 'error'}: ${e.message || 'Could not save'}`);
    }
    setSavingTrick(false);
  };

  const formatDate = (ts) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-4xl mb-3 animate-bounce">🛡️</div>
        <div className="text-slate-400">Loading users...</div>
      </div>
    );
  }

  if (loadError && profiles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-5">
          <div className="font-bold text-red-300 mb-2">⚠️ Firestore permission error</div>
          <div className="text-sm text-red-200 mb-4">{loadError}</div>
          <div className="text-xs text-slate-300 leading-relaxed">
            Go to <strong>Firebase Console → Firestore → Rules</strong> and set:
            <pre className="mt-2 bg-slate-900 rounded-lg p-3 text-xs text-green-300 overflow-x-auto whitespace-pre">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
          </div>
        </div>
      </div>
    );
  }

  // User detail view
  if (selectedUser && userData) {
    const mastered = userData.tricks.filter(t => t.status === 'got_it').length;
    const inProgress = userData.tricks.filter(t => t.status === 'training').length;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => { setSelectedUser(null); setUserData(null); }}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to user list
        </button>

        {/* User header */}
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            {selectedUser.photoURL ? (
              <img src={selectedUser.photoURL} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-500/30 flex items-center justify-center text-2xl font-black">
                {selectedUser.displayName?.[0] || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-black text-lg truncate">{selectedUser.displayName || 'Unknown'}</div>
              <div className="text-xs text-slate-400 truncate">{selectedUser.email}</div>
              <div className="text-xs text-slate-500 mt-1">Last sign-in: {formatDate(selectedUser.lastSignIn)}</div>
              <div className="text-[10px] text-slate-500 italic mt-1">Data shown as of this user's last sync · global trick edits apply on their next load.</div>
            </div>
            {selectedUser.isAdmin && (
              <span className="text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-1 rounded">
                🛡️ Admin
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{mastered}</div>
            <div className="text-xs text-green-300 font-semibold">Mastered</div>
          </div>
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{inProgress}</div>
            <div className="text-xs text-blue-300 font-semibold">Training</div>
          </div>
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{userData.trainingDays.length}</div>
            <div className="text-xs text-orange-300 font-semibold">Days</div>
          </div>
        </div>

        {/* Progress — By Difficulty & By Category */}
        {(() => {
          const total = userData.tricks.length;
          const difficultyData = ['Easy', 'Medium', 'Hard', 'Super'].map(label => {
            const inDiff = userData.tricks.filter(t => t.difficulty === label);
            const m = inDiff.filter(t => t.status === 'got_it').length;
            const color = ({ Easy: 'bg-green-500', Medium: 'bg-blue-500', Hard: 'bg-orange-500', Super: 'bg-purple-500' })[label];
            return { label, count: m, total: inDiff.length, color };
          });
          const userCategories = [...new Set(userData.tricks.map(t => t.category))].sort();
          const categoryData = userCategories.map(cat => {
            const inCat = userData.tricks.filter(t => t.category === cat);
            const m = inCat.filter(t => t.status === 'got_it').length;
            return { cat, mastered: m, total: inCat.length, pct: inCat.length > 0 ? (m / inCat.length) * 100 : 0 };
          });
          const overallPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
          return (
            <>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> Overall progress</div>
                  <span className="text-sm text-slate-400">{mastered}/{total} · {overallPct}%</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500" style={{ width: `${overallPct}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> By Difficulty</div>
                <div className="space-y-2">
                  {difficultyData.map(d => {
                    const open = expandedUserDifficulty === d.label;
                    const sortByStatus = (a, b) => {
                      const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : t.status === 'want_to_learn' ? 2 : 3;
                      return order(a) - order(b) || a.name.localeCompare(b.name);
                    };
                    const rows = userData.tricks.filter(t => t.difficulty === d.label).slice().sort(sortByStatus);
                    return (
                      <div key={d.label}>
                        <button onClick={() => setExpandedUserDifficulty(open ? null : d.label)}
                          className="w-full text-left hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold flex items-center gap-1">
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : '-rotate-90'}`} />
                              {d.label}
                            </span>
                            <span className="text-slate-400">{d.count}/{d.total}</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full ${d.color} transition-all duration-500`} style={{ width: `${d.total > 0 ? (d.count / d.total) * 100 : 0}%` }} /></div>
                        </button>
                        {open && (
                          <div className="space-y-1 mt-2 ml-4">
                            {rows.length === 0 ? (
                              <div className="text-xs text-slate-500 italic">No tricks at this difficulty.</div>
                            ) : rows.map(t => (
                                <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
                                  <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
                                  <span className="flex-1 truncate">{t.name}</span>
                                  <StatusPill trick={t} size="sm" />
                                </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="font-bold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-cyan-400" /> By Landing</div>
                <div className="space-y-2">
                  {LANDING_LEVELS.map(l => {
                    const open = expandedUserLanding === l.id;
                    const sortByStatus = (a, b) => {
                      const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : t.status === 'want_to_learn' ? 2 : 3;
                      return order(a) - order(b) || a.name.localeCompare(b.name);
                    };
                    const matched = userData.tricks.filter(t => Array.isArray(t.progress) && t.progress.includes(l.id));
                    const rows = matched.slice().sort(sortByStatus);
                    const count = matched.length;
                    const totalTricks = userData.tricks.length;
                    return (
                      <div key={l.id}>
                        <button onClick={() => setExpandedUserLanding(open ? null : l.id)}
                          className="w-full text-left hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold flex items-center gap-1">
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : '-rotate-90'}`} />
                              <span className="text-base">{l.emoji}</span>
                              {l.label}
                            </span>
                            <span className="text-slate-400">{count}/{totalTricks}</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full ${l.color} transition-all duration-500`} style={{ width: `${totalTricks > 0 ? (count / totalTricks) * 100 : 0}%` }} />
                          </div>
                        </button>
                        {open && (
                          <div className="space-y-1 mt-2 ml-4">
                            {rows.length === 0 ? (
                              <div className="text-xs text-slate-500 italic">No tricks at this landing yet.</div>
                            ) : rows.map(t => (
                                <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
                                  <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
                                  <span className="flex-1 truncate">{t.name}</span>
                                  <StatusPill trick={t} size="sm" />
                                </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <div className="font-bold mb-3">By Category</div>
                <div className="space-y-2">
                  {categoryData.map(c => {
                    const open = expandedUserCategory === c.cat;
                    const sortByStatus = (a, b) => {
                      const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : t.status === 'want_to_learn' ? 2 : 3;
                      return order(a) - order(b) || a.name.localeCompare(b.name);
                    };
                    const rows = userData.tricks.filter(t => t.category === c.cat).slice().sort(sortByStatus);
                    return (
                      <div key={c.cat}>
                        <button onClick={() => setExpandedUserCategory(open ? null : c.cat)}
                          className="w-full text-left hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold flex items-center gap-1.5">
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : '-rotate-90'}`} />
                              <CategoryIcon category={c.cat} size={16} className="text-slate-300" />
                              {c.cat}
                            </span>
                            <span className="text-slate-400">{c.mastered}/{c.total}</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${c.pct}%` }} />
                          </div>
                        </button>
                        {open && (
                          <div className="space-y-1 mt-2 ml-4">
                            {rows.length === 0 ? (
                              <div className="text-xs text-slate-500 italic">No tricks in this category.</div>
                            ) : rows.map(t => (
                                <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
                                  <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
                                  <span className="flex-1 truncate">{t.name}</span>
                                  <StatusPill trick={t} size="sm" />
                                </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* Weekly Goals */}
        {userData.weeklyGoals.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <div className="font-bold mb-3">Current Weekly Goals</div>
            <div className="space-y-1">
              {userData.weeklyGoals.map(g => {
                const trick = userData.tricks.find(t => t.id === g.trickId);
                if (!trick) return null;
                return (
                  <div key={g.trickId} className="text-sm flex items-center gap-2">
                    <CategoryIcon category={trick.category} size={16} className="text-slate-300 flex-shrink-0" />
                    <span>{trick.name}</span>
                    <span className="ml-auto">
                      <StatusPill trick={trick} size="sm" />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent journal entries */}
        {userData.journal.length > 0 && (
          <div className="bg-slate-800/50 border border-green-500/30 rounded-2xl p-4">
            <div className="font-bold mb-3 flex items-center gap-2">
              📝 Recent Journal Entries ({userData.journal.length})
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {userData.journal.slice(0, 10).map(j => (
                <div key={j.timestamp} className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{j.date}</div>
                  <div className="text-sm whitespace-pre-wrap">{j.text}</div>
                </div>
              ))}
              {userData.journal.length > 10 && (
                <div className="text-xs text-slate-500 text-center italic">
                  ...and {userData.journal.length - 10} more entries
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 text-center italic py-4">
          🔒 Read-only view — admin cannot modify user data
        </div>
      </div>
    );
  }

  // Loading user detail
  if (selectedUser && loadingUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-3 flex justify-center"><LoadingIcon size={48} /></div>
        <div className="text-slate-400">Loading {selectedUser.displayName}'s data...</div>
      </div>
    );
  }

  // User list view
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-lg">Admin Panel</h2>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Tap a user to view their training progress in read-only mode.
        </p>
        {(() => {
          const pendingUsers = requests.filter(r => r.status === 'pending').length;
          const pendingImprovements = improvements.filter(s => s.status === 'pending').length;
          const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;
          const items = [
            pendingUsers > 0 && { label: 'access request', count: pendingUsers, icon: '👥' },
            pendingImprovements > 0 && { label: 'improvement', count: pendingImprovements, icon: '💡' },
            pendingSuggestions > 0 && { label: 'trick suggestion', count: pendingSuggestions, icon: '✨' },
          ].filter(Boolean);
          if (items.length === 0) return (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
              <Check className="w-3.5 h-3.5 flex-shrink-0" /> All clear — nothing pending review.
            </div>
          );
          return (
            <div className="bg-orange-500/15 border border-orange-500/40 rounded-xl px-3 py-2.5 space-y-1">
              <div className="text-xs font-bold text-orange-300 uppercase tracking-wide mb-1.5">Needs review</div>
              {items.map(({ label, count, icon }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <span>{icon}</span>
                  <span className="font-bold text-white">{count}</span>
                  <span className="text-orange-200">{label}{count !== 1 ? 's' : ''} pending</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="bg-slate-800/50 border border-purple-500/40 rounded-2xl">
        <button
          onClick={() => setUsersExpanded(v => !v)}
          className="w-full p-4 flex items-center gap-2 hover:bg-slate-800/70 transition rounded-2xl text-left"
        >
          <span className="text-lg">👥</span>
          <span className="font-bold">Users</span>
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <span className="text-xs font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full">
              {requests.filter(r => r.status === 'pending').length} pending
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400 font-normal">{profiles.length} active</span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${usersExpanded ? 'rotate-90' : ''}`} />
        </button>
        {usersExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-4 space-y-4">
        <div>
        <div className="font-bold mb-3 flex items-center gap-2">
          <span className="text-lg">📬</span> Access Requests
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <span className="ml-auto text-xs font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full">
              {requests.filter(r => r.status === 'pending').length} pending
            </span>
          )}
        </div>
        {requestError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-3 text-xs text-red-200 leading-relaxed">
            {requestError}
            <div className="text-slate-300 mt-2">
              If this is a permissions error, your Firestore rules need to allow admin writes to <code className="text-purple-300">approvedUsers/&#123;uid&#125;</code> and <code className="text-purple-300">accessRequests/&#123;uid&#125;</code>.
            </div>
          </div>
        )}
        {requests.filter(r => r.status !== 'approved').length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-3">No access requests yet.</div>
        ) : (
          <div className="space-y-3">
            {requests.filter(r => r.status !== 'approved').map(req => {
              const isPending = req.status === 'pending';
              const statusLabel = { pending: '⏳ Pending', rejected: '🚫 Denied' }[req.status] || req.status;
              return (
                <div key={req.uid} className={`bg-slate-900 rounded-xl p-3 flex items-center gap-3 ${!isPending ? 'opacity-60' : ''}`}>
                  {req.photoURL ? (
                    <img src={req.photoURL} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center font-black flex-shrink-0">
                      {req.displayName?.[0] || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{req.displayName || 'Unknown'}</div>
                    <div className="text-xs text-slate-400 truncate">{req.email}</div>
                    <div className="text-xs text-slate-500">{formatDate(req.requestedAt)} · {statusLabel}</div>
                  </div>
                  {isPending && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => approveRequest(req)} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold transition">
                        ✓ Approve
                      </button>
                      <button onClick={() => denyRequest(req)} className="px-3 py-1.5 bg-slate-700 hover:bg-red-600 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition">
                        ✕ Deny
                      </button>
                    </div>
                  )}
                  {req.status === 'rejected' && (
                    <button onClick={() => removeUser(req)} className="px-3 py-1.5 bg-slate-700 hover:bg-red-600 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition flex-shrink-0">
                      🗑️ Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>

        <div>
          <div className="font-bold mb-3">All Users ({profiles.length})</div>
          {profiles.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-4">
              No users have signed in yet.
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map(p => {
                const isSelf = p.uid === currentUserUid;
                const isHardcodedAdmin = ADMIN_EMAILS.includes(p.email);
                const isHardcodedUser = ALLOWED_EMAILS.includes(p.email);
                const showsAsAdmin = p.isAdmin || isHardcodedAdmin;
                return (
                  <div key={p.uid} className="bg-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => viewUser(p)}
                      className="w-full flex items-center gap-3 hover:bg-slate-700 p-3 text-left transition"
                    >
                      {p.photoURL ? (
                        <img src={p.photoURL} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center font-black flex-shrink-0">
                          {p.displayName?.[0] || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold truncate">{p.displayName || 'Unknown'}</span>
                          {isSelf && (
                            <span className="text-xs font-bold bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded">You</span>
                          )}
                          {showsAsAdmin && (
                            <span className="text-xs">🛡️</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{p.email}</div>
                        <div className="text-xs text-slate-500">
                          Last seen: {formatDate(p.lastSignIn)}
                        </div>
                      </div>
                      <Eye className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    </button>
                    {!isSelf && (
                      <div className="flex gap-2 px-3 pb-3 pt-1">
                        {!isHardcodedAdmin && (
                          <button
                            onClick={() => toggleAdmin(p)}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${p.isAdmin ? 'bg-yellow-600/30 text-yellow-200 hover:bg-yellow-600/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                          >
                            {p.isAdmin ? '🛡️ Remove admin' : '🛡️ Make admin'}
                          </button>
                        )}
                        {!isHardcodedUser && (
                          <button
                            onClick={() => removeUser(p)}
                            className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-red-600 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition"
                          >
                            🗑️ Remove access
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-yellow-500/40 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2">
          <span className="text-lg">💡</span> Suggested Improvements
          <span className="ml-auto text-xs text-slate-400 font-normal">{improvements.filter(s => s.status === 'pending').length} pending · {improvements.length} total</span>
        </div>
        {improvementError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-xs text-red-200 mb-2 break-words">{improvementError}</div>
        )}
        {improvements.length === 0 ? (
          <div className="text-sm text-slate-500">No improvement suggestions yet.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {improvements.map(s => {
              const busy = processingImprovement === s._id;
              const statusBadge = s.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/40' : s.status === 'denied' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
              return (
                <div key={s._id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{s.title}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ml-auto ${statusBadge}`}>{s.status || 'pending'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">By {s.requestedByName || s.requestedByEmail || 'Unknown'}</div>
                      {s.description && <div className="text-xs text-slate-300 mt-2 whitespace-pre-wrap">{s.description}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {s.status === 'pending' && (
                      <>
                        <button onClick={() => respondImprovement(s, 'approved')} disabled={busy}
                          className="flex-1 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 rounded-lg text-sm font-bold transition">
                          {busy ? '…' : '✓ Yes'}
                        </button>
                        <button onClick={() => respondImprovement(s, 'denied')} disabled={busy}
                          className="flex-1 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 disabled:opacity-50 rounded-lg text-sm font-bold transition">
                          ✕ No
                        </button>
                      </>
                    )}
                    {s.status !== 'pending' && (
                      <button onClick={() => respondImprovement(s, 'pending')} disabled={busy}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 rounded-lg text-sm font-bold transition">
                        Reset to pending
                      </button>
                    )}
                    <button onClick={() => deleteImprovement(s)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-sm transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-purple-500/40 rounded-2xl">
        <button onClick={() => setSuggestionsExpanded(v => !v)}
          className="w-full p-4 flex items-center gap-2 hover:bg-slate-800/70 transition rounded-2xl text-left">
          <span className="text-lg">💡</span>
          <span className="font-bold">Trick Suggestions</span>
          <span className="ml-auto text-xs text-slate-400 font-normal">{suggestions.filter(s => s.status === 'pending').length} pending · {suggestions.length} total</span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${suggestionsExpanded ? 'rotate-90' : ''}`} />
        </button>
        {suggestionsExpanded && <div className="px-4 pb-4 border-t border-slate-700 pt-4 space-y-3">
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Bulk sync</div>
          <button onClick={syncMyTricksToCommunity} disabled={syncing}
            className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 rounded-lg text-sm font-bold transition">
            {syncing ? 'Syncing…' : '📤 Push my entire trick library to community'}
          </button>
          <div className="text-[11px] text-slate-500 mt-1">Adds any tricks you've created (beyond the seed list) and promotes all your personal videos to global.</div>
          {syncResult && <div className="mt-2 text-xs text-green-300 bg-green-500/10 border border-green-500/30 rounded p-2">{syncResult}</div>}
          {syncError && <div className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{syncError}</div>}
        </div>
        {suggestionError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-xs text-red-200 mb-2 break-words">{suggestionError}</div>
        )}
        {suggestions.length === 0 ? (
          <div className="text-sm text-slate-500">No suggestions yet.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {suggestions.map(s => {
              const t = s.trick || {};
              const col = DIFFICULTY_COLORS[t.difficulty] || DIFFICULTY_COLORS.Medium;
              const busy = processingSuggestion === s._id;
              const statusBadge = s.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/40' : s.status === 'denied' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
              return (
                <div key={s._id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CategoryIcon category={t.category} size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{t.name}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${col.bg} ${col.text}`}>{t.difficulty}</span>
                        <span className="text-xs text-slate-500">{t.category}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ml-auto ${statusBadge}`}>{s.status || 'pending'}</span>
                      </div>
                      {(Number(t.coolness) || 0) > 0 && (
                        <div className="flex items-center gap-0.5 mt-1" title={`Suggested cool factor: ${t.coolness} / 5`}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`w-3.5 h-3.5 ${n <= t.coolness ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">By {s.requestedByName || s.requestedByEmail || 'Unknown'}</div>
                      {t.notes && <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{t.notes}</div>}
                      {Array.isArray(s.videos) && s.videos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.videos.map((v, i) => (
                            <a key={i} href={normalizeUrl(v.url)} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 truncate max-w-[200px]">
                              {v.type === 'both' ? '📹🎓' : v.type === 'tutorial' ? '🎓' : '📹'} {v.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {s.status === 'pending' && (
                      <>
                        <button onClick={() => approveSuggestion(s)} disabled={busy}
                          className="flex-1 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 rounded-lg text-sm font-bold transition">
                          {busy ? '…' : '✓ Approve'}
                        </button>
                        <button onClick={() => denySuggestion(s)} disabled={busy}
                          className="flex-1 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 disabled:opacity-50 rounded-lg text-sm font-bold transition">
                          ✕ Deny
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteSuggestion(s)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-sm transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>}
      </div>

      <div className="bg-slate-800/50 border border-blue-500/40 rounded-2xl">
        <button onClick={() => setTrickMgmtExpanded(v => !v)}
          className="w-full p-4 flex items-center gap-2 hover:bg-slate-800/70 transition rounded-2xl text-left">
          <span className="text-lg">✏️</span>
          <span className="font-bold">Trick Management</span>
          {saveOk && <span className="text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/40 px-2 py-0.5 rounded">✓ Saved</span>}
          <span className="ml-auto text-xs text-slate-400 font-normal">{INITIAL_TRICKS.length} tricks</span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${trickMgmtExpanded ? 'rotate-90' : ''}`} />
        </button>
        {trickMgmtExpanded && <div className="px-4 pb-4 border-t border-slate-700 pt-4">
        <input
          type="text"
          value={trickSearch}
          onChange={e => setTrickSearch(e.target.value)}
          placeholder="Search tricks..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2"
        />
        {!editingTrick && (
          <div className="space-y-2 mb-3">
            <FilterRow label="Category"
              options={['all', ...Array.from(new Set(INITIAL_TRICKS.map(t => (overrides[String(t.id)]?.category) || t.category))).sort()]}
              selected={trickFilterCategory} onChange={setTrickFilterCategory} />
            <FilterRow label="Difficulty"
              options={['all', 'Easy', 'Medium', 'Hard', 'Super']}
              selected={trickFilterDifficulty} onChange={setTrickFilterDifficulty} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Sort</span>
              {[
                { id: 'default', label: 'Default' },
                { id: 'category', label: 'Category' },
                { id: 'difficulty', label: 'Difficulty' },
                { id: 'globalvideos', label: '🌐 Videos' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setTrickSort(opt.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${trickSort === opt.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {editingTrick ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setEditingTrick(null)} className="text-slate-400 hover:text-white transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-sm truncate">Editing: {editingTrick.name}</span>
              {overrides[String(editingTrick.id)] && (
                <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">overridden</span>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Name</div>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Category</div>
              <div className="flex flex-wrap gap-2">
                {['Flips', 'Jump', 'Tricks', 'Leap', 'Swings', 'Vaults', 'Gymnastics'].map(c => (
                  <button key={c} onClick={() => setEditForm(f => ({ ...f, category: c }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${editForm.category === c ? 'bg-purple-500' : 'bg-slate-800 text-slate-300'}`}>
                    <CategoryIcon category={c} size={16} />{c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Difficulty</div>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard', 'Super'].map(d => {
                  const col = DIFFICULTY_COLORS[d];
                  return (
                    <button key={d} onClick={() => setEditForm(f => ({ ...f, difficulty: d }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${editForm.difficulty === d ? `${col.strip} text-white` : 'bg-slate-800 text-slate-300'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            {saveError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-xs text-red-200 break-words">
                <div className="font-bold mb-1">Save failed</div>
                <div className="font-mono">{saveError}</div>
                <div className="mt-2 text-slate-300">
                  If this is a permission error, set Firestore rules to <code className="bg-slate-900 px-1 rounded">allow read, write: if request.auth != null</code> for <code className="bg-slate-900 px-1 rounded">/{'{document=**}'}</code>.
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveTrickOverride} disabled={savingTrick || !editForm.name.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-bold text-sm disabled:opacity-50 transition">
                {savingTrick ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => { setEditingTrick(null); setSaveError(null); }}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-sm transition">
                Cancel
              </button>
            </div>
            <button onClick={deleteEditingTrick} disabled={deletingTrickId === editingTrick.id || savingTrick}
              className="w-full py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
              <X className="w-4 h-4" />
              {deletingTrickId === editingTrick.id ? 'Deleting…' : 'Delete this trick'}
            </button>
            {(() => {
              const previewName = editForm.name.trim() || editingTrick.name;
              const previewVideos = (globalVideos[String(editingTrick.id)] || []).map(v => ({ ...v, _global: true }));
              const previewTrick = {
                ...editingTrick,
                name: previewName,
                category: editForm.category,
                difficulty: editForm.difficulty,
                videos: previewVideos,
              };
              return (
                <div className="pt-3 border-t border-slate-700/50">
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                    Preview
                    <span className="text-[10px] font-normal normal-case text-slate-500">— how this trick appears to users</span>
                  </div>
                  <TrickCard
                    trick={previewTrick}
                    onOpen={(url) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); }}
                    isGymnastics={previewTrick.category === 'Gymnastics'}
                  />
                  {previewVideos.length === 0 && (
                    <div className="mt-2 text-[11px] text-slate-500 italic">No global videos on this trick yet.</div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {(() => {
              const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2, Super: 3 };
              const deletedSet = new Set(deletedTricks);
              const seedRows = INITIAL_TRICKS
                .filter(t => !deletedSet.has(t.id))
                .map(t => ({ trick: t, effective: overrides[String(t.id)] ? { ...t, ...overrides[String(t.id)] } : t, source: 'seed' }));
              const communityRows = communityTricks
                .filter(t => !deletedSet.has(t.id))
                .map(t => ({ trick: t, effective: overrides[String(t.id)] ? { ...t, ...overrides[String(t.id)] } : t, source: 'community' }));
              const withEffective = [...seedRows, ...communityRows]
                .filter(({ effective }) => {
                  if (trickSearch && !effective.name.toLowerCase().includes(trickSearch.toLowerCase())) return false;
                  if (trickFilterCategory !== 'all' && effective.category !== trickFilterCategory) return false;
                  if (trickFilterDifficulty !== 'all' && effective.difficulty !== trickFilterDifficulty) return false;
                  return true;
                });
              if (trickSort === 'category') {
                withEffective.sort((a, b) =>
                  a.effective.category.localeCompare(b.effective.category)
                  || a.effective.name.localeCompare(b.effective.name));
              } else if (trickSort === 'difficulty') {
                withEffective.sort((a, b) =>
                  (DIFF_ORDER[a.effective.difficulty] ?? 99) - (DIFF_ORDER[b.effective.difficulty] ?? 99)
                  || a.effective.name.localeCompare(b.effective.name));
              } else if (trickSort === 'globalvideos') {
                const gvCount = (id) => Array.isArray(globalVideos[String(id)]) ? globalVideos[String(id)].length : 0;
                withEffective.sort((a, b) =>
                  gvCount(b.trick.id) - gvCount(a.trick.id)
                  || a.effective.name.localeCompare(b.effective.name));
              }
              return withEffective;
            })().map(({ trick: t, effective, source }) => {
              const ov = overrides[String(t.id)];
              const col = DIFFICULTY_COLORS[effective.difficulty];
              const isDeleting = deletingTrickId === t.id;
              const gvCount = Array.isArray(globalVideos[String(t.id)]) ? globalVideos[String(t.id)].length : 0;
              return (
                <div key={t.id} className="w-full flex items-center gap-2 bg-slate-900 hover:bg-slate-800 rounded-lg px-3 py-2 text-left transition text-sm">
                  <button onClick={() => startEdit(t)} className="flex-1 flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-6 rounded-full ${col.strip} flex-shrink-0`} />
                    <CategoryIcon category={effective.category} size={15} className="flex-shrink-0 text-slate-400" />
                    <span className="flex-1 truncate font-medium">{effective.name}</span>
                    {gvCount > 0 && (
                      <span title={`${gvCount} global video${gvCount === 1 ? '' : 's'}`}
                        className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                        <Video className="w-2.5 h-2.5" />{gvCount}
                      </span>
                    )}
                    {source === 'community' && <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 rounded flex-shrink-0">🌐</span>}
                    {ov && <span className="text-xs text-blue-400 flex-shrink-0">✏️</span>}
                    <span className={`text-xs font-semibold flex-shrink-0 ${col.text}`}>{effective.difficulty}</span>
                  </button>
                  <button onClick={() => removeTrickFromGlobal(t.id, effective.name)} disabled={isDeleting}
                    title="Remove from global trick list"
                    className="flex-shrink-0 p-1 text-slate-500 hover:text-red-400 disabled:opacity-30 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        </div>}
      </div>

    </div>
  );
}

// Nivla Parkour - Full app with Firebase auth + Firestore
// Replace ALL of src/App.jsx with this file.
//
// Requires: src/firebase.js, .env.local with Firebase keys, `firebase` package installed.

import React, { useState, useEffect, useMemo } from 'react';
import {
   Home, Dumbbell, Calendar, Trophy, Plus, Flame, Search, X, ExternalLink,
  Check, Video, Target, Award, TrendingUp, ChevronRight, ChevronDown, Zap, Play, Pause,
  RotateCcw, LogOut, Shield, Eye, ArrowLeft, ScrollText, GitBranch, Star
} from 'lucide-react';
import { auth, db, googleProvider, ALLOWED_EMAILS, ADMIN_EMAILS, isAdmin } from './firebase';
import { GiAcrobatic, GiJumpAcross, GiHighKick, GiLeapfrog, GiMuscleUp, GiRunningNinja, GiContortionist, GiBodyBalance } from 'react-icons/gi';
import { MdSportsGymnastics } from 'react-icons/md';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';

const RELEASE_NOTES = [
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
  if (s === 'got_it' || s === 'training' || s === 'want_to_learn') return s;
  if (s === 'yes_i_can' || s === 'hard_landing') return 'got_it';
  if (s === 'training_hard' || s === 'trampoline_landing' || s === 'soft_landing' || s === 'training_like_hell') return 'training';
  return 'want_to_learn';
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

const WARMUPS = [
  { id: 1, name: 'Wrist circles', duration: '30 sec each way', desc: 'Critical for handstands and vaults', seconds: 60 },
  { id: 2, name: 'Shoulder rolls', duration: '10 each way', desc: 'Loosens shoulders for swings', seconds: 30 },
  { id: 3, name: 'Arm circles', duration: '10 each way', desc: 'Warm up arms and upper back', seconds: 30 },
  { id: 4, name: 'Neck rotations', duration: '5 each way', desc: 'Slow and controlled', seconds: 30 },
  { id: 5, name: 'Hip circles', duration: '10 each way', desc: 'Open up the hips', seconds: 30 },
  { id: 6, name: 'Leg swings', duration: '10 each leg', desc: 'Front-back and side-to-side', seconds: 60 },
  { id: 7, name: 'Ankle rotations', duration: '10 each way', desc: 'Critical to avoid rolls!', seconds: 30 },
  { id: 8, name: 'Deep squats', duration: '15 reps', desc: 'Hold bottom for 2 seconds', seconds: 60 },
  { id: 9, name: 'Lunges with twist', duration: '10 each side', desc: 'Dynamic hip and core opener', seconds: 60 },
  { id: 10, name: 'Cat-cow stretches', duration: '10 reps', desc: 'Mobilize the spine', seconds: 45 },
  { id: 11, name: 'Light jog', duration: '2-3 min', desc: 'Get blood flowing', seconds: 150 },
  { id: 12, name: 'Jumping jacks', duration: '30 sec', desc: 'Raise heart rate', seconds: 30 },
  { id: 13, name: 'High knees', duration: '30 sec', desc: 'Dynamic warm up', seconds: 30 },
  { id: 14, name: 'Bear crawl', duration: '10 meters', desc: 'Activates full body', seconds: 30 },
];

const CONDITIONING = [
  { id: 1, name: 'Push-ups', reps: '3 x 10-15', desc: 'Upper body strength', seconds: 60 },
  { id: 2, name: 'Pull-ups / Chin-ups', reps: '3 x max', desc: 'Essential for swings and climbs', seconds: 60 },
  { id: 3, name: 'Squats', reps: '3 x 20', desc: 'Leg power for jumps', seconds: 90 },
  { id: 4, name: 'Jump squats', reps: '3 x 10', desc: 'Explosive leg power', seconds: 60 },
  { id: 5, name: 'Handstand hold', reps: '3 x 30 sec', desc: 'Against a wall to start', seconds: 30 },
  { id: 6, name: 'Plank', reps: '3 x 45 sec', desc: 'Core strength', seconds: 45 },
  { id: 7, name: 'Hollow body hold', reps: '3 x 20 sec', desc: 'Essential for flips', seconds: 20 },
  { id: 8, name: 'L-sit', reps: '3 x 10 sec', desc: 'Core + hip flexor strength', seconds: 10 },
  { id: 9, name: 'Box jumps', reps: '3 x 8', desc: 'Explosive power and precision', seconds: 45 },
  { id: 10, name: 'Broad jumps', reps: '3 x 5', desc: 'Horizontal power', seconds: 30 },
  { id: 11, name: 'Pistol squats', reps: '3 x 5 each leg', desc: 'Single leg strength', seconds: 60 },
  { id: 12, name: 'Bridge hold', reps: '3 x 20 sec', desc: 'Back flexibility for flips', seconds: 20 },
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

const getWeekKey = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
};

const formatWeekRange = (mondayStr) => {
  const monday = new Date(mondayStr);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} - ${fmt(sunday)}`;
};

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

  return <MainApp user={user} key={user.uid} />;
}

// =================================================================
// ONBOARDING
// =================================================================
function OnboardingFlow({ tricks, userName, onFinish, onSkip }) {
  const [step, setStep] = useState(1);
  const [pickedTrickIds, setPickedTrickIds] = useState([]);
  const [pickedWeekdays, setPickedWeekdays] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const easyTricks = useMemo(
    () => tricks.filter(t => t.difficulty === 'Easy').slice().sort((a, b) => a.name.localeCompare(b.name)),
    [tricks]
  );

  const WEEKDAYS = [
    { num: 1, label: 'Mon' }, { num: 2, label: 'Tue' }, { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' }, { num: 5, label: 'Fri' }, { num: 6, label: 'Sat' }, { num: 0, label: 'Sun' },
  ];

  const toggleTrick = (id) => {
    setPickedTrickIds(curr => {
      if (curr.includes(id)) return curr.filter(x => x !== id);
      if (curr.length >= 3) return curr;
      return [...curr, id];
    });
  };

  const toggleWeekday = (n) => {
    setPickedWeekdays(curr => curr.includes(n) ? curr.filter(x => x !== n) : [...curr, n]);
  };

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onFinish({ trickIds: pickedTrickIds, weekdays: pickedWeekdays });
    } finally {
      setSubmitting(false);
    }
  };

  const StepDots = () => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map(n => (
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
              <h1 className="text-3xl font-black leading-tight">Pick 3 tricks you want to learn first</h1>
              <p className="text-sm text-slate-400 mt-2">Easy ones to get rolling — you can always change your mind later.</p>
            </div>
            <div className="text-xs text-slate-400">{pickedTrickIds.length} / 3 picked</div>
            <div className="grid grid-cols-2 gap-2">
              {easyTricks.map(t => {
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-purple-300 mb-1">Step 2 of 3</div>
              <h1 className="text-3xl font-black leading-tight">When do you usually train?</h1>
              <p className="text-sm text-slate-400 mt-2">Pick the weekdays you'd like to set aside for parkour. We'll suggest sessions on those days.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(d => {
                const on = pickedWeekdays.includes(d.num);
                return (
                  <button key={d.num} onClick={() => toggleWeekday(d.num)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition border ${on ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
            {pickedWeekdays.length === 0 && (
              <div className="text-xs text-slate-500 italic">Or skip this and pick days later in Training.</div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-purple-300 mb-1">All set</div>
              <h1 className="text-3xl font-black leading-tight">Let's go 🚀</h1>
              <p className="text-sm text-slate-400 mt-2">Today's session is loaded with your 3 picks. Tap Today to start.</p>
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
            {pickedWeekdays.length > 0 && (
              <div className="text-xs text-slate-400">
                Training days: <span className="text-purple-300 font-bold">{pickedWeekdays.map(n => WEEKDAYS.find(d => d.num === n)?.label).filter(Boolean).join(' · ')}</span>
              </div>
            )}
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
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && pickedTrickIds.length === 0}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition">
              {step === 1 ? (pickedTrickIds.length === 0 ? 'Pick at least 1 to continue' : 'Continue →') : 'Continue →'}
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
  const [trainingSection, setTrainingSection] = useState('log');
  const [profileIsAdmin, setProfileIsAdmin] = useState(false);
  const userIsAdmin = isAdmin(user.email) || profileIsAdmin;
  const [tricks, setTricks] = useState([]);
  const [trainingDays, setTrainingDays] = useState([]);
  const [journal, setJournal] = useState([]);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [completedWarmups, setCompletedWarmups] = useState({});
  const [completedConditioning, setCompletedConditioning] = useState({});
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [plannedDays, setPlannedDays] = useState([]);
  const [plannedMonths, setPlannedMonths] = useState([]);
  const [plannedWeeks, setPlannedWeeks] = useState([]);
  const [plannedSessionFocus, setPlannedSessionFocus] = useState({});
  const [plannedSessionDismissed, setPlannedSessionDismissed] = useState({});
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
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTracker, setFilterTracker] = useState('all');
  const [filterVideo, setFilterVideo] = useState('all');
  const [filterStars, setFilterStars] = useState('all');
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
        const [tricksData, daysData, journalData, goalsData, warmupsData, conditioningData, sessionsData, plannedData, plannedMonthsData, plannedWeeksData, plannedFocusData, plannedDismissedData, viewedData, onboardingData] =
          await Promise.all([
            loadUserData(user.uid, 'tricks'),
            loadUserData(user.uid, 'trainingDays'),
            loadUserData(user.uid, 'journal'),
            loadUserData(user.uid, 'weeklyGoals'),
            loadUserData(user.uid, 'completedWarmups'),
            loadUserData(user.uid, 'completedConditioning'),
            loadUserData(user.uid, 'trainingSessions'),
            loadUserData(user.uid, 'plannedDays'),
            loadUserData(user.uid, 'plannedMonths'),
            loadUserData(user.uid, 'plannedWeeks'),
            loadUserData(user.uid, 'plannedSessionFocus'),
            loadUserData(user.uid, 'plannedSessionDismissed'),
            loadUserData(user.uid, 'viewedTricks'),
            loadUserData(user.uid, 'onboardingComplete'),
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
            .map(ct => applyOverrides({ ...ct, status: 'want_to_learn', videos: [], notes: '', progress: [], coolness: 0 }));
          return additions.length > 0 ? [...existing, ...additions] : existing;
        };

        if (tricksData) {
          const filtered = tricksData.filter(t => !deletedSet.has(t.id));
          const migrated = filtered.map(applyOverrides).map(migrateTrickStatus);
          const merged = mergeCommunity(migrated);
          const changed = merged.length !== tricksData.length
            || merged.some((t, i) => i < tricksData.length && (t.category !== tricksData[i].category || t.status !== tricksData[i].status));
          setTricks(merged);
          if (changed) await saveUserData(user.uid, 'tricks', merged);
        } else {
          const seed = INITIAL_TRICKS
            .filter(t => !deletedSet.has(t.id))
            .map(t => applyOverrides({ ...t, status: 'want_to_learn', videos: [], notes: '', progress: [] }));
          const initial = mergeCommunity(seed);
          setTricks(initial);
          await saveUserData(user.uid, 'tricks', initial);
        }
        if (daysData) setTrainingDays(daysData);
        if (journalData) setJournal(journalData);
        if (goalsData) setWeeklyGoals(goalsData);
        if (warmupsData) setCompletedWarmups(warmupsData);
        if (conditioningData) setCompletedConditioning(conditioningData);
        if (sessionsData) setTrainingSessions(sessionsData);
        if (plannedData) setPlannedDays(plannedData);
        if (plannedMonthsData) setPlannedMonths(plannedMonthsData);
        if (plannedWeeksData) setPlannedWeeks(plannedWeeksData);
        if (plannedFocusData) setPlannedSessionFocus(plannedFocusData);
        if (plannedDismissedData) setPlannedSessionDismissed(plannedDismissedData);
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
            saveUserData(user.uid, 'onboardingComplete', true).catch(e => console.error('Onboarding flag save error', e));
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
  const saveJournal = async (j) => { setJournal(j); await saveUserData(user.uid, 'journal', j); };
  const saveGoals = async (g) => { setWeeklyGoals(g); await saveUserData(user.uid, 'weeklyGoals', g); };
  const saveWarmups = async (w) => { setCompletedWarmups(w); await saveUserData(user.uid, 'completedWarmups', w); };
  const saveConditioning = async (c) => { setCompletedConditioning(c); await saveUserData(user.uid, 'completedConditioning', c); };
  const saveTrainingSessions = async (s) => { setTrainingSessions(s); await saveUserData(user.uid, 'trainingSessions', s); };
  const savePlannedDays = async (d) => { setPlannedDays(d); await saveUserData(user.uid, 'plannedDays', d); };
  const savePlannedMonths = async (m) => { setPlannedMonths(m); await saveUserData(user.uid, 'plannedMonths', m); };
  const savePlannedWeeks = async (w) => { setPlannedWeeks(w); await saveUserData(user.uid, 'plannedWeeks', w); };
  const savePlannedSessionFocus = async (f) => { setPlannedSessionFocus(f); await saveUserData(user.uid, 'plannedSessionFocus', f); };
  const savePlannedSessionDismissed = async (d) => { setPlannedSessionDismissed(d); await saveUserData(user.uid, 'plannedSessionDismissed', d); };

  const celebrateLanding = (oldProgress, newProgress, trick) => {
    const oldSet = new Set(Array.isArray(oldProgress) ? oldProgress : []);
    const newSet = new Set(Array.isArray(newProgress) ? newProgress : []);
    if (!oldSet.has('trampoline_landing') && newSet.has('trampoline_landing')) {
      fireCelebration({ _id: Date.now(), kind: 'small', icon: '🤾', title: 'Trampoline landing!', subtitle: trick ? `${trick.name} · soft mat next` : 'Soft mat next', tone: 'cyan' });
    } else if (!oldSet.has('soft_landing') && newSet.has('soft_landing')) {
      fireCelebration({ _id: Date.now(), kind: 'small', icon: '🛬', title: 'Soft mat — almost there!', subtitle: trick ? `${trick.name} · hard ground left` : 'Hard ground left', tone: 'blue' });
    }
  };

  const updateTrickStatus = (id, status) => {
    const oldTrick = tricks.find(t => t.id === id);
    const newTricks = tricks.map(t => t.id === id ? { ...t, status } : t);
    saveTricks(newTricks);
    if (status === 'got_it' && oldTrick?.status !== 'got_it') {
      setCelebrationTrick(oldTrick);
      setTimeout(() => setCelebrationTrick(null), 2500);
    }
  };

  const updateTrickProgress = (id, progress) => {
    const oldTrick = tricks.find(t => t.id === id);
    saveTricks(tricks.map(t => t.id === id ? { ...t, progress } : t));
    celebrateLanding(oldTrick?.progress, progress, oldTrick);
  };
  const updateTrickCoolness = (id, coolness) => saveTricks(tricks.map(t => t.id === id ? { ...t, coolness } : t));
  const updateTrickStatusAndProgress = (id, status, progress) => {
    const oldTrick = tricks.find(t => t.id === id);
    const newTricks = tricks.map(t => t.id === id ? { ...t, status, progress } : t);
    saveTricks(newTricks);
    if (status === 'got_it' && oldTrick?.status !== 'got_it') {
      setCelebrationTrick(oldTrick);
      setTimeout(() => setCelebrationTrick(null), 2500);
    } else {
      celebrateLanding(oldTrick?.progress, progress, oldTrick);
    }
  };
  const updateTrickVideos = (id, videos) => saveTricks(tricks.map(t => t.id === id ? { ...t, videos } : t));
  const updateTrickNotes = (id, notes) => saveTricks(tricks.map(t => t.id === id ? { ...t, notes } : t));
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
    const newTrick = { status: 'want_to_learn', videos: [], notes: '', progress: [], coolness: 0, ...trick, id: Date.now() };
    saveTricks([...tricks, newTrick]);
    if (globalVideoList.length > 0) updateGlobalVideos(newTrick.id, globalVideoList);
  };

  const computeStreakFor = (days) => {
    if (!Array.isArray(days) || days.length === 0) return 0;
    const sorted = [...days].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
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
    if (!dateStr || trainingDays.includes(dateStr)) return;
    const next = [...trainingDays, dateStr];
    const oldStreak = computeStreakFor(trainingDays);
    const newStreak = computeStreakFor(next);
    await saveTrainingDays(next);
    const crossed = STREAK_MILESTONES.find(m => oldStreak < m && newStreak >= m);
    if (crossed) {
      const subtitle = crossed >= 30 ? 'Unstoppable!' : crossed >= 7 ? 'On fire!' : 'Keep it going!';
      fireCelebration({ _id: Date.now(), kind: 'small', icon: '🔥', title: `${crossed}-day streak!`, subtitle, tone: 'orange' });
    }
  };

  const logTrainingDay = () => {
    const today = new Date().toISOString().split('T')[0];
    markDayTrained(today);
  };

  const streak = computeStreakFor(trainingDays);
  const mastered = tricks.filter(t => t.status === 'got_it').length;
  const inProgress = tricks.filter(t => t.status === 'training').length;

  const stats = {
    mastered, streak,
    easyMastered: tricks.filter(t => t.status === 'got_it' && t.difficulty === 'Easy').length,
    mediumMastered: tricks.filter(t => t.status === 'got_it' && t.difficulty === 'Medium').length,
    hardMastered: tricks.filter(t => t.status === 'got_it' && t.difficulty === 'Hard').length,
    superMastered: tricks.filter(t => t.status === 'got_it' && t.difficulty === 'Super').length,
    vaultMastered: tricks.filter(t => t.status === 'got_it' && t.category === 'Vaults').length,
    flipMastered: tricks.filter(t => t.status === 'got_it' && t.category === 'Flips').length,
  };

  const earnedBadges = BADGES.filter(b => b.check(stats));

  const inProgressTricks = tricks.filter(t => t.status === 'training');
  const notStartedEasy = tricks.filter(t => t.status === 'want_to_learn' && t.difficulty === 'Easy');
  const pool = inProgressTricks.length >= 3 ? inProgressTricks : [...inProgressTricks, ...notStartedEasy];
  const now = new Date();
  const weekNum = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 604800000);
  const weeklyFocus = pool.length > 0
    ? [0, 1, 2].map(i => pool[(weekNum + i * 7) % pool.length]).filter((t, i, arr) => t && arr.findIndex(x => x.id === t.id) === i)
    : [];

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

  const finishOnboarding = async ({ trickIds, weekdays }) => {
    const today = new Date().toISOString().split('T')[0];
    if (Array.isArray(trickIds) && trickIds.length > 0) {
      const goals = trickIds.map(id => ({ trickId: id, addedAt: Date.now() }));
      await saveGoals(goals);
      await savePlannedSessionFocus({ ...plannedSessionFocus, [today]: trickIds });
    }
    if (Array.isArray(weekdays) && weekdays.length > 0) {
      await savePlannedDays(weekdays);
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
            plannedSessionFocus={plannedSessionFocus} savePlannedSessionFocus={savePlannedSessionFocus}
            hasTrainedToday={trainingDays.includes(new Date().toISOString().split('T')[0])}
            goToWarmup={() => { setTrainingSection('warmup'); setActiveTab('training'); }}
            goToStrength={() => { setTrainingSection('conditioning'); setActiveTab('training'); }}
            goToLog={() => { setTrainingSection('log'); setActiveTab('training'); }} />
        )}
        {activeTab === 'tricks' && (
          <TricksTab tricks={displayTricks} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterDifficulty={filterDifficulty} setFilterDifficulty={setFilterDifficulty}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterTracker={filterTracker} setFilterTracker={setFilterTracker}
            filterVideo={filterVideo} setFilterVideo={setFilterVideo}
            filterStars={filterStars} setFilterStars={setFilterStars}
            onOpenTrick={openTrick}
            onAddNew={() => setActiveTab('add')} />
        )}
        {activeTab === 'training' && (
          <TrainingTab weeklyGoals={weeklyGoals} saveGoals={saveGoals} tricks={tricks}
            completedWarmups={completedWarmups} saveWarmups={saveWarmups}
            completedConditioning={completedConditioning} saveConditioning={saveConditioning}
            journal={journal} saveJournal={saveJournal} onOpenTrick={openTrick}
            weeklyFocus={weeklyFocus}
            trainingDays={trainingDays} trainingSessions={trainingSessions} saveTrainingSessions={saveTrainingSessions}
            markDayTrained={markDayTrained}
            plannedDays={plannedDays} savePlannedDays={savePlannedDays}
            plannedMonths={plannedMonths} savePlannedMonths={savePlannedMonths}
            plannedWeeks={plannedWeeks} savePlannedWeeks={savePlannedWeeks}
            plannedSessionFocus={plannedSessionFocus} savePlannedSessionFocus={savePlannedSessionFocus}
            plannedSessionDismissed={plannedSessionDismissed} savePlannedSessionDismissed={savePlannedSessionDismissed}
            streak={streak}
            section={trainingSection} setSection={setTrainingSection} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab stats={stats} tricks={tricks} earnedBadges={earnedBadges} trainingDays={trainingDays} />
        )}
        {activeTab === 'skilltree' && (
          <SkillTreeTab tricks={displayTricks} onOpenTrick={openTrick} weeklyGoals={weeklyGoals} saveGoals={saveGoals} />
        )}
        {activeTab === 'add' && (
          <AddTab user={user} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'admin' && userIsAdmin && (
         <AdminTab currentUserUid={user.uid} myTricks={tricks} />
        )}
      </div>

      {showReleaseNotes && <ReleaseNotesModal onClose={() => setShowReleaseNotes(false)} onOpenImprovement={() => { setShowReleaseNotes(false); setShowImprovementModal(true); }} />}
      {showImprovementModal && <ImprovementSuggestionsModal user={user} onClose={() => setShowImprovementModal(false)} />}

      {selectedTrick && (
        <TrickDetailModal trick={displayTricks.find(t => t.id === selectedTrick.id) || selectedTrick}
          autoplayUrl={autoplayVideoUrl}
          isAdmin={userIsAdmin}
          onClose={closeTrick} onUpdateStatus={updateTrickStatus} onUpdateProgress={updateTrickProgress}
          onUpdateStatusAndProgress={updateTrickStatusAndProgress} onUpdateCoolness={updateTrickCoolness}
          onUpdateVideos={updateTrickVideos} onUpdateGlobalVideos={updateGlobalVideos}
          onUpdateNotes={updateTrickNotes} />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-purple-500/20 z-50">
        <div className="flex justify-around items-center py-2 px-2 max-w-2xl mx-auto">
          <NavButton icon={Home} label="Today" active={activeTab === 'home'} onClick={() => { closeTrick(); setActiveTab('home'); }} />
          <NavButton icon={Dumbbell} label="Tricks" active={activeTab === 'tricks'} onClick={() => { closeTrick(); setActiveTab('tricks'); }} />
         <NavButton icon={GitBranch} label="Tree" active={activeTab === 'skilltree'} onClick={() => { closeTrick(); setActiveTab('skilltree'); }} />
         <NavButton icon={Calendar} label="Training" active={activeTab === 'training'} onClick={() => { closeTrick(); setActiveTab('training'); }} />
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

  return (
    <div className="fixed inset-x-0 top-0 bottom-20 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-t sm:border border-yellow-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-full sm:max-h-[85vh] overflow-y-auto">
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
                placeholder="Short summary of your idea"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Description</div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what you'd like and why"
                rows={4}
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

function TodayTab({ streak, weeklyGoals = [], tricks = [], onOpenTrick, plannedSessionFocus = {}, savePlannedSessionFocus, hasTrainedToday, goToWarmup, goToStrength, goToLog }) {
  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const lockedIds = Array.isArray(plannedSessionFocus[today]) ? plannedSessionFocus[today] : [];
  const lockedTricks = lockedIds.map(id => tricks.find(t => t.id === id)).filter(Boolean);

  const buildSuggestions = () => {
    const seen = new Set();
    const out = [];
    const tryAdd = (t) => {
      if (!t || seen.has(t.id) || out.length >= 3) return;
      seen.add(t.id); out.push(t);
    };
    weeklyGoals.forEach(g => tryAdd(tricks.find(t => t.id === g.trickId)));
    tricks.filter(t => t.status === 'training').forEach(tryAdd);
    tricks.filter(t => t.status === 'want_to_learn' && (t.difficulty === 'Easy' || t.difficulty === 'Medium')).forEach(tryAdd);
    return out;
  };
  const suggestions = lockedTricks.length > 0 ? lockedTricks.slice(0, 3) : buildSuggestions();
  const isPlanned = lockedTricks.length > 0;

  const useTheseForToday = () => {
    if (!savePlannedSessionFocus || suggestions.length === 0) return;
    savePlannedSessionFocus({ ...plannedSessionFocus, [today]: suggestions.map(t => t.id) });
  };

  const renderTrickRow = (t) => {
    const diff = DIFFICULTY_COLORS[t.difficulty];
    const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
    const tutorialVideo = t.videos?.find(v => isTutorialVideo(v) && v.primary) || t.videos?.find(v => isTutorialVideo(v));
    const referenceVideo = t.videos?.find(v => v.type !== 'tutorial' && v.primary) || t.videos?.find(v => v.type !== 'tutorial');
    const playVideo = (e, video) => { e.stopPropagation(); if (video?.url) onOpenTrick(t, normalizeUrl(video.url)); };
    return (
      <div key={t.id} className="w-full bg-slate-800/70 hover:bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-2 transition">
        <button onClick={() => onOpenTrick(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
          <CategoryIcon category={t.category} size={20} className="text-slate-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{t.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
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
        <button onClick={() => onOpenTrick(t)} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.color} ${status.textColor}`}>{status.emoji}</button>
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

      <div className="bg-gradient-to-br from-purple-600/20 via-slate-900 to-pink-600/20 border border-purple-500/40 rounded-3xl p-5 shadow-xl shadow-purple-500/10">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-purple-300" />
          <div className="font-black text-lg">{isPlanned ? "Today's session" : 'Want to train? Pick 3 tricks'}</div>
        </div>
        {suggestions.length === 0 ? (
          <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">🤸</div>
            <div className="text-sm font-bold text-slate-200 mb-1">Nothing to suggest yet</div>
            <div className="text-xs text-slate-400">Browse the Tricks tab and tap a trick to mark it 👀 Want to learn or 💪 Training. Then come back here.</div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {suggestions.map(renderTrickRow)}
            </div>
            {!isPlanned && savePlannedSessionFocus && (
              <button onClick={useTheseForToday}
                className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm bg-purple-500 hover:bg-purple-400 text-white transition">
                Use these for today →
              </button>
            )}
            {isPlanned && (
              <div className="mt-3 text-[11px] text-purple-300/80 flex items-center gap-1">
                <Check className="w-3 h-3" /> Locked in for today {hasTrainedToday && '· you trained today!'}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={goToWarmup}
          className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-gradient-to-br from-red-500/30 to-orange-500/30 border border-orange-500/40 hover:scale-[1.02] active:scale-95 transition">
          <span className="text-3xl">🔥</span>
          <span className="font-bold text-sm">Warm up</span>
        </button>
        <button onClick={goToStrength}
          className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-500/40 hover:scale-[1.02] active:scale-95 transition">
          <span className="text-3xl">💪</span>
          <span className="font-bold text-sm">Strength</span>
        </button>
        <button onClick={goToLog}
          className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-500/40 hover:scale-[1.02] active:scale-95 transition">
          <span className="text-3xl">{hasTrainedToday ? '✅' : '📝'}</span>
          <span className="font-bold text-sm">Log it</span>
        </button>
      </div>
    </div>
  );
}

function TricksTab({ tricks, searchQuery, setSearchQuery, filterCategory, setFilterCategory, filterDifficulty, setFilterDifficulty, filterStatus, setFilterStatus, filterTracker, setFilterTracker, filterVideo, setFilterVideo, filterStars, setFilterStars, onOpenTrick, onAddNew }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = ['all', ...new Set(tricks.map(t => t.category))];
  const difficulties = ['all', 'Easy', 'Medium', 'Hard', 'Super'];
  const trackerOptions = ['all', ...STATUS_LEVELS.map(s => s.id)];
  const progressOptions = ['all', 'none', ...LANDING_IDS];
  const progressLabel = (opt) => {
    if (opt === 'all') return 'All';
    if (opt === 'none') return 'No landing';
    return LANDING_LEVELS.find(l => l.id === opt)?.label || opt;
  };
  const filtered = tricks.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false;
    if (filterStatus !== 'all') {
      const progressArr = Array.isArray(t.progress) ? t.progress : [];
      if (filterStatus === 'none' && progressArr.length !== 0) return false;
      if (filterStatus !== 'none' && !progressArr.includes(filterStatus)) return false;
    }
    if (filterTracker !== 'all' && t.status !== filterTracker) return false;
    if (filterVideo !== 'all') {
      const vids = Array.isArray(t.videos) ? t.videos : [];
      if (filterVideo === 'none' && vids.length > 0) return false;
      if (filterVideo === 'reference' && !vids.some(isReferenceVideo)) return false;
      if (filterVideo === 'tutorial' && !vids.some(isTutorialVideo)) return false;
    }
    if (filterStars !== 'all') {
      const stars = t.coolness || 0;
      if (filterStars === 'unrated' && stars !== 0) return false;
      if (filterStars !== 'unrated') {
        const min = parseInt(filterStars, 10);
        if (stars < min) return false;
      }
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
      <button
        onClick={onAddNew}
        className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg"
      >
        <Plus className="w-5 h-5" /> Add new trick
      </button>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tricks..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500" />
      </div>
      {(() => {
        const videoOptions = ['all', 'none', 'reference', 'tutorial'];
        const videoLabel = (opt) => ({ all: 'All', none: 'No video', reference: '📹 Reference', tutorial: '🎓 Tutorial' }[opt] || opt);
        const starsOptions = ['all', 'unrated', '1', '2', '3', '4', '5'];
        const starsLabel = (opt) => {
          if (opt === 'all') return 'All';
          if (opt === 'unrated') return 'Unrated';
          return opt === '5' ? '★★★★★' : `★${opt}+`;
        };
        const activeFilterCount = [filterCategory, filterDifficulty, filterTracker, filterStatus, filterVideo, filterStars].filter(v => v !== 'all').length;
        return (
          <div className="space-y-2">
            <button onClick={() => setFiltersOpen(o => !o)}
              className="w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 transition">
              <span className="font-semibold text-sm flex items-center gap-2">
                Filters
                {activeFilterCount > 0 && (
                  <span className="text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-full">{activeFilterCount} active</span>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            {filtersOpen && (
              <div className="space-y-2 pt-1">
                <FilterRow label="Category" options={categories} selected={filterCategory} onChange={setFilterCategory} />
                <FilterRow label="Difficulty" options={difficulties} selected={filterDifficulty} onChange={setFilterDifficulty} />
                <FilterRow label="Status" options={trackerOptions} selected={filterTracker} onChange={setFilterTracker} labelMap={(opt) => opt === 'all' ? 'All' : STATUS_LEVELS.find(s => s.id === opt)?.label || opt} />
                <FilterRow label="Progress" options={progressOptions} selected={filterStatus} onChange={setFilterStatus} labelMap={progressLabel} />
                <FilterRow label="Video" options={videoOptions} selected={filterVideo} onChange={setFilterVideo} labelMap={videoLabel} />
                <FilterRow label="Stars" options={starsOptions} selected={filterStars} onChange={setFilterStars} labelMap={starsLabel} />
                {activeFilterCount > 0 && (
                  <button onClick={() => { setFilterCategory('all'); setFilterDifficulty('all'); setFilterTracker('all'); setFilterStatus('all'); setFilterVideo('all'); setFilterStars('all'); }}
                    className="text-xs text-slate-400 hover:text-white underline">
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}
      <div className="text-sm text-slate-400">{filtered.length} tricks</div>
      {sortedCategories.map(cat => {
        const isGymnastics = GYMNASTICS_CATEGORIES.includes(cat);
        const catColor = CATEGORY_COLORS[cat];
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2 mt-4">
              <span className="w-1 h-7 rounded-full" style={catColor ? { backgroundColor: catColor.hex } : undefined} />
              <CategoryIcon category={cat} size={28} />
              <h3 className="font-black text-lg uppercase tracking-wide" style={catColor ? { color: catColor.hex } : undefined}>{cat}</h3>
              <span className="text-sm text-slate-500">({grouped[cat].length})</span>
            </div>
            <div className={`space-y-2 ${isGymnastics ? 'bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-2' : ''}`}>
              {grouped[cat].map(t => <TrickCard key={t.id} trick={t} onOpen={(url) => onOpenTrick(t, url)} isGymnastics={isGymnastics} />)}
            </div>
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

function normalizeUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function TrickCard({ trick, onOpen, isGymnastics }) {
  const diff = DIFFICULTY_COLORS[trick.difficulty];
  const status = STATUS_LEVELS.find(s => s.id === trick.status);
  const unread = !!trick._unread;
  const tutorialVideo = trick.videos?.find(v => isTutorialVideo(v) && v.primary)
    || trick.videos?.find(v => isTutorialVideo(v));
  const referenceVideo = trick.videos?.find(v => v.type !== 'tutorial' && v.primary)
    || trick.videos?.find(v => v.type !== 'tutorial');
  const playVideo = (e, video) => { e.stopPropagation(); if (video?.url) onOpen(normalizeUrl(video.url)); };
  const openCard = () => onOpen();
  return (
    <div className={`relative w-full border rounded-xl p-3 transition ${isGymnastics ? 'bg-cyan-900/30 hover:bg-cyan-900/50 border-cyan-500/30' : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700'}`}>
      {unread && <span className="pointer-events-none absolute -top-1 -left-1 text-base animate-pulse">✨</span>}
      <div className="flex items-center gap-2 text-left">
        <button onClick={openCard} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={`w-1 h-12 ${diff.strip} rounded-full flex-shrink-0`} />
          <CategoryIcon category={trick.category} size={20} className="text-slate-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{trick.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff.bg} ${diff.text}`}>{trick.difficulty}</span>
              {trick.videos?.length > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><Video className="w-3 h-3" /> {trick.videos.length}</span>}
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
        <button onClick={openCard} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.color} ${status.textColor}`}>{status.emoji}</button>
      </div>
    </div>
  );
}

function getVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return null;
}

function VideoCard({ video, onRemove, onTogglePrimary, autoplay, scrollRef, isGlobal, canEdit = true }) {
  const safeUrl = normalizeUrl(video.url);
  const embed = getVideoEmbed(safeUrl);
  const embedSrc = embed && autoplay
    ? `${embed.src}${embed.src.includes('?') ? '&' : '?'}autoplay=1`
    : embed?.src;
  return (
    <div ref={scrollRef} className={`bg-purple-900/20 border rounded-lg overflow-hidden ${autoplay ? 'border-purple-400/80 ring-2 ring-purple-400/40' : video.primary ? 'border-yellow-400/60' : isGlobal ? 'border-cyan-500/40' : 'border-purple-500/30'}`}>
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

function TrickDetailModal({ trick, autoplayUrl, isAdmin, onClose, onUpdateStatus, onUpdateProgress, onUpdateStatusAndProgress, onUpdateCoolness, onUpdateVideos, onUpdateGlobalVideos, onUpdateNotes }) {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoLabel, setNewVideoLabel] = useState('');
  const [newVideoIsReference, setNewVideoIsReference] = useState(true);
  const [newVideoIsTutorial, setNewVideoIsTutorial] = useState(false);
  const [newVideoGlobal, setNewVideoGlobal] = useState(false);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [notesInput, setNotesInput] = useState(trick.notes || '');
  const autoplayRef = React.useRef(null);
  const diff = DIFFICULTY_COLORS[trick.difficulty];
  const allVideos = trick.videos || [];
  const personalVideos = allVideos.filter(v => !v._global);
  const globalList = allVideos.filter(v => v._global).map(({ _global, ...rest }) => rest);
  const stripFlag = ({ _global, ...rest }) => rest;
  const tutorialVideos = allVideos.filter(isTutorialVideo);
  const referenceVideos = allVideos.filter(isReferenceVideo);
  const isAutoplayVideo = (v) => autoplayUrl && normalizeUrl(v.url) === autoplayUrl;
  useEffect(() => {
    if (autoplayUrl && autoplayRef.current) {
      autoplayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoplayUrl]);
  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    const url = normalizeUrl(newVideoUrl.trim());
    const isRef = newVideoIsReference || (!newVideoIsReference && !newVideoIsTutorial);
    const isTut = newVideoIsTutorial;
    const type = computeVideoType(isRef, isTut);
    const defaultLabel = type === 'tutorial' ? 'Tutorial' : 'Video';
    const newEntry = { url, label: newVideoLabel.trim() || defaultLabel, type };
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
    const willBePrimary = !v.primary;
    if (v._global) {
      const next = globalList.map(x => {
        if (x.url === v.url && x.label === v.label && x.type === v.type) return { ...x, primary: willBePrimary };
        if (willBePrimary && x.type === v.type) return { ...x, primary: false };
        return x;
      });
      onUpdateGlobalVideos(trick.id, next);
    } else {
      const next = personalVideos.map(stripFlag).map(x => {
        if (x.url === v.url && x.label === v.label && x.type === v.type) return { ...x, primary: willBePrimary };
        if (willBePrimary && x.type === v.type) return { ...x, primary: false };
        return x;
      });
      onUpdateVideos(trick.id, next);
    }
  };
  const saveNotes = () => onUpdateNotes(trick.id, notesInput);
  return (
    <div className="fixed inset-x-0 top-0 bottom-20 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-t sm:border border-purple-500/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-full sm:max-h-[85vh] overflow-y-auto">
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

            return (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Status</div>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_LEVELS.map(s => {
                    const active = trick.status === s.id;
                    return (
                      <button key={s.id} onClick={() => setStatus(s.id)}
                        title={s.id === 'got_it' && active ? 'Click to revert to Training' : undefined}
                        className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition ${active ? `${s.color} border-white/40` : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                        <span className="text-2xl">{s.emoji}</span>
                        <span className={`text-xs font-bold leading-tight text-center ${active ? 'text-white' : 'text-slate-300'}`}>{s.label}</span>
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
                      {LANDING_LEVELS.map(ls => {
                        const checked = progressArr.includes(ls.id);
                        return (
                          <button key={ls.id} onClick={() => toggleLanding(ls.id)}
                            className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
                            <span className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xl transition ${checked ? `${ls.color} border-white` : 'bg-slate-800 border-slate-600 hover:border-slate-400'}`}>
                              {checked ? <Check className="w-5 h-5 text-white" /> : ls.emoji}
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
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1">📹 Reference Videos</div>
            <div className="space-y-2">
              {referenceVideos.length === 0 && <div className="text-sm text-slate-500 bg-slate-800/50 p-3 rounded-lg">No reference videos yet. Add inspiration clips below.</div>}
              {referenceVideos.map((v, i) => (
                <VideoCard key={i} video={v} onRemove={() => removeVideo(v)} onTogglePrimary={() => togglePrimary(v)}
                  autoplay={isAutoplayVideo(v)} scrollRef={isAutoplayVideo(v) ? autoplayRef : null}
                  isGlobal={!!v._global} canEdit={!v._global || isAdmin} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1">🎓 Tutorial Videos</div>
            <div className="space-y-2">
              {tutorialVideos.length === 0 && <div className="text-sm text-slate-500 bg-slate-800/50 p-3 rounded-lg">No tutorials yet. Add one below to learn how to do this trick.</div>}
              {tutorialVideos.map((v, i) => (
                <VideoCard key={i} video={v} onRemove={() => removeVideo(v)} onTogglePrimary={() => togglePrimary(v)}
                  autoplay={isAutoplayVideo(v)} scrollRef={isAutoplayVideo(v) ? autoplayRef : null}
                  isGlobal={!!v._global} canEdit={!v._global || isAdmin} />
              ))}
            </div>
          </div>
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
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tag as</div>
                  <div className="flex gap-2">
                    <button onClick={() => setNewVideoIsReference(v => !v)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition border ${newVideoIsReference ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      📹 Reference
                    </button>
                    <button onClick={() => setNewVideoIsTutorial(v => !v)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition border ${newVideoIsTutorial ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      🎓 Tutorial
                    </button>
                  </div>
                </div>
                <input type="text" value={newVideoLabel} onChange={(e) => setNewVideoLabel(e.target.value)}
                  placeholder="Label (e.g. Sick line by Jason Paul)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <input type="url" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="YouTube or Instagram URL"
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
        </div>
      </div>
    </div>
  );
}

function TrainingTab({ weeklyGoals, saveGoals, tricks, completedWarmups, saveWarmups, completedConditioning, saveConditioning, journal, saveJournal, onOpenTrick, weeklyFocus = [], trainingDays = [], trainingSessions = [], saveTrainingSessions, markDayTrained, plannedDays = [], savePlannedDays, plannedMonths = [], savePlannedMonths, plannedWeeks = [], savePlannedWeeks, plannedSessionFocus = {}, savePlannedSessionFocus, plannedSessionDismissed = {}, savePlannedSessionDismissed, streak = 0, section, setSection }) {
  const [newGoalTrickId, setNewGoalTrickId] = useState('');
  const [newJournalEntry, setNewJournalEntry] = useState('');
  const [expandedWeek, setExpandedWeek] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const safeWarmups = completedWarmups || {};
  const safeConditioning = completedConditioning || {};
  const safeJournal = Array.isArray(journal) ? journal : [];

  const getSuggestions = () => {
    const suggestions = [];
    const currentGoalIds = new Set(weeklyGoals.map(g => g.trickId));
    const addedIds = new Set();
    const tryAdd = (trick, reason, icon, priority) => {
      if (!trick || currentGoalIds.has(trick.id) || addedIds.has(trick.id)) return false;
      suggestions.push({ trick, reason, icon, priority });
      addedIds.add(trick.id);
      return true;
    };
    const hasLanding = (t, id) => Array.isArray(t.progress) && t.progress.includes(id);
    tricks.filter(t => t.status === 'training' && hasLanding(t, 'soft_landing')).slice(0, 2).forEach(t => tryAdd(t, 'Almost mastered — one more push!', '🎯', 1));
    tricks.filter(t => t.status === 'training' && hasLanding(t, 'trampoline_landing') && !hasLanding(t, 'soft_landing')).slice(0, 2).forEach(t => tryAdd(t, 'Got it on trampoline — try soft mat next', '🤾', 2));
    tricks.filter(t => t.status === 'training' && (!Array.isArray(t.progress) || t.progress.length === 0)).slice(0, 2).forEach(t => tryAdd(t, 'Already training — stay consistent', '💪', 3));
    const categories = [...new Set(tricks.map(t => t.category))];
    const categoryProgress = categories.map(cat => {
      const catTricks = tricks.filter(t => t.category === cat);
      const mastered = catTricks.filter(t => t.status === 'got_it').length;
      return { cat, pct: catTricks.length > 0 ? mastered / catTricks.length : 0, tricks: catTricks };
    }).sort((a, b) => a.pct - b.pct);
    for (const weakCat of categoryProgress.slice(0, 2)) {
      const easy = weakCat.tricks.find(t => t.status === 'want_to_learn' && t.difficulty === 'Easy');
      if (easy) tryAdd(easy, `Strengthen weak area: ${weakCat.cat}`, '⚖️', 5);
    }
    const masteredEasy = tricks.filter(t => t.status === 'got_it' && t.difficulty === 'Easy');
    const masteredCats = [...new Set(masteredEasy.map(t => t.category))];
    for (const cat of masteredCats) {
      if (masteredEasy.filter(t => t.category === cat).length >= 2) {
        const next = tricks.find(t => t.category === cat && t.difficulty === 'Medium' && t.status === 'want_to_learn');
        if (next) tryAdd(next, `Ready to level up your ${cat}!`, '🚀', 6);
      }
    }
    if (suggestions.length < 3) {
      const fallback = tricks.filter(t => t.status === 'want_to_learn' && (t.difficulty === 'Easy' || t.difficulty === 'Medium'));
      for (const f of fallback) { if (suggestions.length >= 3) break; tryAdd(f, 'Good one to add to your training', '🌟', 7); }
    }
    return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 3);
  };
  const suggestions = getSuggestions();

  const addGoal = () => {
    if (!newGoalTrickId) return;
    const trick = tricks.find(t => t.id === parseInt(newGoalTrickId));
    if (!trick || weeklyGoals.some(g => g.trickId === trick.id)) return;
    saveGoals([...weeklyGoals, { trickId: trick.id, addedAt: Date.now() }]);
    setNewGoalTrickId('');
  };
  const addSuggestion = (id) => { if (!weeklyGoals.some(g => g.trickId === id)) saveGoals([...weeklyGoals, { trickId: id, addedAt: Date.now() }]); };
  const removeGoal = (id) => saveGoals(weeklyGoals.filter(g => g.trickId !== id));
  const toggleWarmup = (id) => {
    const list = safeWarmups[today] || [];
    saveWarmups({ ...safeWarmups, [today]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] });
  };
  const resetWarmups = () => saveWarmups({ ...safeWarmups, [today]: [] });
  const toggleConditioning = (id) => {
    const list = safeConditioning[today] || [];
    saveConditioning({ ...safeConditioning, [today]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] });
  };
  const resetConditioning = () => saveConditioning({ ...safeConditioning, [today]: [] });
  const addJournalEntry = () => { if (!newJournalEntry.trim()) return; saveJournal([{ date: today, text: newJournalEntry.trim(), timestamp: Date.now() }, ...safeJournal]); setNewJournalEntry(''); };
  const deleteJournalEntry = (ts) => saveJournal(safeJournal.filter(j => j.timestamp !== ts));
  const todayWarmups = safeWarmups[today] || [];
  const todayConditioning = safeConditioning[today] || [];

  const buildHistory = () => {
    const weekMap = {};
    Object.keys(safeWarmups).forEach(date => {
      const arr = safeWarmups[date]; if (!Array.isArray(arr) || arr.length === 0) return;
      const wk = getWeekKey(date);
      if (!weekMap[wk]) weekMap[wk] = { days: new Set(), warmups: {}, conditioning: {}, journal: [] };
      weekMap[wk].days.add(date); weekMap[wk].warmups[date] = arr;
    });
    Object.keys(safeConditioning).forEach(date => {
      const arr = safeConditioning[date]; if (!Array.isArray(arr) || arr.length === 0) return;
      const wk = getWeekKey(date);
      if (!weekMap[wk]) weekMap[wk] = { days: new Set(), warmups: {}, conditioning: {}, journal: [] };
      weekMap[wk].days.add(date); weekMap[wk].conditioning[date] = arr;
    });
    safeJournal.forEach(entry => {
      if (!entry || !entry.date) return;
      const wk = getWeekKey(entry.date);
      if (!weekMap[wk]) weekMap[wk] = { days: new Set(), warmups: {}, conditioning: {}, journal: [] };
      weekMap[wk].days.add(entry.date); weekMap[wk].journal.push(entry);
    });
    return Object.keys(weekMap).sort().reverse().map(wk => ({
      weekStart: wk, range: formatWeekRange(wk), days: [...weekMap[wk].days].sort(),
      warmups: weekMap[wk].warmups, conditioning: weekMap[wk].conditioning,
      journal: weekMap[wk].journal.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    }));
  };
  const history = buildHistory();

  return (
    <div className="max-w-2xl mx-auto">
      {section === 'log' && (
        <TrainingLogSection
          trainingDays={trainingDays}
          trainingSessions={trainingSessions}
          saveTrainingSessions={saveTrainingSessions}
          markDayTrained={markDayTrained}
          plannedDays={plannedDays}
          savePlannedDays={savePlannedDays}
          plannedMonths={plannedMonths}
          savePlannedMonths={savePlannedMonths}
          plannedWeeks={plannedWeeks}
          savePlannedWeeks={savePlannedWeeks}
          plannedSessionFocus={plannedSessionFocus}
          savePlannedSessionFocus={savePlannedSessionFocus}
          plannedSessionDismissed={plannedSessionDismissed}
          savePlannedSessionDismissed={savePlannedSessionDismissed}
          streak={streak}
          tricks={tricks}
          weeklyGoals={weeklyGoals}
          setSection={setSection}
          onOpenTrick={onOpenTrick}
        />
      )}

      {section === 'warmup' && (
        <div className="space-y-3">
          <button onClick={() => setSection('log')} className="text-sm text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Planing and Log
          </button>
          <div className="bg-slate-800/50 border border-orange-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div><div className="font-bold">Warm-up routine</div><div className="text-sm text-slate-400">{todayWarmups.length}/{WARMUPS.length} completed today</div></div>
              {todayWarmups.length > 0 && <button onClick={resetWarmups} className="text-xs text-slate-400 hover:text-white">Reset</button>}
            </div>
            <div className="space-y-2">
              {WARMUPS.map(w => {
                const done = todayWarmups.includes(w.id);
                return (
                  <div key={w.id} className={`p-3 rounded-xl border transition ${done ? 'bg-green-500/20 border-green-500/50' : 'bg-slate-800 border-slate-700'}`}>
                    <button onClick={() => toggleWarmup(w.id)} className="w-full flex items-center gap-3 text-left">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500 border-green-500' : 'border-slate-500'}`}>{done && <Check className="w-4 h-4 text-white" />}</div>
                      <div className="flex-1"><div className={`font-semibold ${done ? 'line-through text-slate-400' : ''}`}>{w.name}</div><div className="text-xs text-slate-400">{w.duration} · {w.desc}</div></div>
                    </button>
                    <ExerciseTimer totalSeconds={w.seconds} color="orange" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {section === 'conditioning' && (
        <div className="space-y-3">
          <button onClick={() => setSection('log')} className="text-sm text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Planing and Log
          </button>
          <div className="bg-slate-800/50 border border-blue-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div><div className="font-bold">Strength</div><div className="text-sm text-slate-400">{todayConditioning.length}/{CONDITIONING.length} completed today</div></div>
              {todayConditioning.length > 0 && <button onClick={resetConditioning} className="text-xs text-slate-400 hover:text-white">Reset</button>}
            </div>
            <div className="space-y-2">
              {CONDITIONING.map(c => {
                const done = todayConditioning.includes(c.id);
                return (
                  <div key={c.id} className={`p-3 rounded-xl border transition ${done ? 'bg-green-500/20 border-green-500/50' : 'bg-slate-800 border-slate-700'}`}>
                    <button onClick={() => toggleConditioning(c.id)} className="w-full flex items-center gap-3 text-left">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500 border-green-500' : 'border-slate-500'}`}>{done && <Check className="w-4 h-4 text-white" />}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2"><div className={`font-semibold ${done ? 'line-through text-slate-400' : ''}`}>{c.name}</div><div className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded flex-shrink-0">{c.reps}</div></div>
                        <div className="text-xs text-slate-400 mt-1">{c.desc}</div>
                      </div>
                    </button>
                    <ExerciseTimer totalSeconds={c.seconds} color="blue" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TrainingLogSection({ trainingDays, trainingSessions, saveTrainingSessions, markDayTrained, plannedDays = [], savePlannedDays, plannedMonths = [], savePlannedMonths, plannedWeeks = [], savePlannedWeeks, plannedSessionFocus = {}, savePlannedSessionFocus, plannedSessionDismissed = {}, savePlannedSessionDismissed, streak, tricks = [], weeklyGoals = [], setSection, onOpenTrick }) {
  const FOCUS_TAGS = ['landning', 'flow', 'vips', 'strength', 'precision', 'flips', 'jump', 'tricks', 'leap', 'swings', 'vaults', 'gymnastics'];
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [tags, setTags] = useState([]);
  const [rpe, setRpe] = useState(6);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});
  const toggleSessionOpen = (dateStr) => setExpandedSessions(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  const lastLoggedSession = useMemo(() => {
    return [...(Array.isArray(trainingSessions) ? trainingSessions : [])]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .find(s => Array.isArray(s.practicedTricks) && s.practicedTricks.length > 0) || null;
  }, [trainingSessions]);
  const copyLastSessionTo = (dateStr) => {
    if (!lastLoggedSession) return;
    setFocusForDate(dateStr, [...lastLoggedSession.practicedTricks]);
  };
  const [practicedTricks, setPracticedTricks] = useState([]);
  useEffect(() => {
    const locked = Array.isArray(plannedSessionFocus[date]) ? plannedSessionFocus[date] : [];
    setPracticedTricks(locked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const safeSessions = Array.isArray(trainingSessions) ? trainingSessions : [];
  const sortedSessions = [...safeSessions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const totalSessions = safeSessions.length;
  const totalMinutes = safeSessions.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  const avgRpe = totalSessions > 0
    ? Math.round((safeSessions.reduce((sum, s) => sum + (Number(s.rpe) || 0), 0) / totalSessions) * 10) / 10
    : 0;
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  const milestones = [
    { count: 10, label: '10 sessions logged' },
    { count: 25, label: '25 sessions logged' },
    { count: 50, label: '50 sessions logged' },
    { count: 100, label: '100 sessions logged' },
  ];
  const reachedMilestones = milestones.filter(m => totalSessions >= m.count);
  const nextMilestone = milestones.find(m => totalSessions < m.count);

  const dayActivity = useMemo(() => {
    const map = {};
    (Array.isArray(trainingDays) ? trainingDays : []).forEach(d => { map[d] = { logged: true, sessions: 0, totalRpe: 0 }; });
    safeSessions.forEach(s => {
      if (!s.date) return;
      if (!map[s.date]) map[s.date] = { logged: false, sessions: 0, totalRpe: 0 };
      map[s.date].sessions += 1;
      map[s.date].totalRpe += Number(s.rpe) || 0;
    });
    return map;
  }, [trainingDays, safeSessions]);

  const heatmapDays = useMemo(() => {
    const days = [];
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    const totalDays = 16 * 7;
    const start = new Date(todayD);
    start.setDate(todayD.getDate() - (totalDays - 1));
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
    const cursor = new Date(start);
    while (cursor <= todayD) {
      days.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, []);

  const cellColor = (dateStr) => {
    const a = dayActivity[dateStr];
    if (!a) return 'bg-slate-800/60';
    if (a.sessions === 0) return 'bg-orange-500/30';
    const avg = a.totalRpe / a.sessions;
    if (avg >= 8) return 'bg-orange-600';
    if (avg >= 6) return 'bg-orange-500';
    if (avg >= 4) return 'bg-orange-400';
    return 'bg-orange-300';
  };
  const todayStr = today;
  const weekOfMonth = (date) => Math.ceil(date.getDate() / 7);
  const isPlannedDay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (Array.isArray(plannedDays) && plannedDays.length > 0 && !plannedDays.includes(d.getDay())) return false;
    if (Array.isArray(plannedMonths) && plannedMonths.length > 0 && !plannedMonths.includes(d.getMonth())) return false;
    if (Array.isArray(plannedWeeks) && plannedWeeks.length > 0 && !plannedWeeks.includes(weekOfMonth(d))) return false;
    const anySelected = (plannedDays?.length || 0) + (plannedMonths?.length || 0) + (plannedWeeks?.length || 0);
    return anySelected > 0;
  };
  const cellClasses = (dateStr) => {
    const planned = isPlannedDay(dateStr);
    const future = dateStr > todayStr;
    const ring = planned && future ? ' ring-1 ring-purple-400/60' : '';
    return `${cellColor(dateStr)}${ring}`;
  };
  const toggleInArray = (arr, value, save) => {
    if (!save) return;
    const next = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value].sort((a, b) => a - b);
    save(next);
  };
  const togglePlannedDay = (n) => toggleInArray(plannedDays, n, savePlannedDays);
  const togglePlannedMonth = (n) => toggleInArray(plannedMonths, n, savePlannedMonths);
  const togglePlannedWeek = (n) => toggleInArray(plannedWeeks, n, savePlannedWeeks);
  const WEEKDAYS = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
    { num: 0, label: 'Sun' },
  ];
  const MONTHS = [
    { num: 0, label: 'Jan' }, { num: 1, label: 'Feb' }, { num: 2, label: 'Mar' },
    { num: 3, label: 'Apr' }, { num: 4, label: 'May' }, { num: 5, label: 'Jun' },
    { num: 6, label: 'Jul' }, { num: 7, label: 'Aug' }, { num: 8, label: 'Sep' },
    { num: 9, label: 'Oct' }, { num: 10, label: 'Nov' }, { num: 11, label: 'Dec' },
  ];
  const WEEKS = [1, 2, 3, 4, 5];
  const plannedSessionsThisMonth = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let count = 0;
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      if (isPlannedDay(dateStr)) count++;
    }
    return count;
  })();
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const userMaxMasteredDifficulty = useMemo(() => {
    const order = ['Easy', 'Medium', 'Hard', 'Super'];
    const masteredLevels = (tricks || []).filter(t => t.status === 'got_it').map(t => order.indexOf(t.difficulty)).filter(i => i >= 0);
    return masteredLevels.length > 0 ? Math.max(...masteredLevels) : -1;
  }, [tricks]);

  const allowedDifficulties = useMemo(() => {
    const order = ['Easy', 'Medium', 'Hard', 'Super'];
    const maxIdx = Math.min(3, Math.max(0, userMaxMasteredDifficulty + 1));
    return order.slice(0, maxIdx + 1);
  }, [userMaxMasteredDifficulty]);

  const sessionSuggestions = useMemo(() => {
    const list = [];
    const seen = new Set();
    const add = (trick, reason) => {
      if (!trick || seen.has(trick.id)) return;
      if (!allowedDifficulties.includes(trick.difficulty)) return;
      list.push({ trick, reason });
      seen.add(trick.id);
    };
    (weeklyGoals || []).forEach(g => add((tricks || []).find(t => t.id === g.trickId), '🎯 Fokus'));
    (tricks || []).filter(t => t.status === 'training').forEach(t => add(t, '💪 Training'));
    (tricks || []).filter(t => t.status === 'want_to_learn').forEach(t => add(t, '👀 Want to learn'));
    return list;
  }, [tricks, weeklyGoals, allowedDifficulties]);

  const upcomingSessions = useMemo(() => {
    const result = [];
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    const sessionsByDate = {};
    safeSessions.forEach(s => { if (s.date) sessionsByDate[s.date] = s; });
    for (let i = 0; i < 28 && result.length < 4; i++) {
      const d = new Date(todayD);
      d.setDate(todayD.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      if (isPlannedDay(dateStr)) {
        result.push({ date: dateStr, dayOfWeek: d.getDay(), loggedSession: sessionsByDate[dateStr] || null });
      }
    }
    return result;
  }, [plannedDays, plannedMonths, plannedWeeks, safeSessions]);

  const formatUpcomingDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
    const diff = Math.round((d - todayD) / 86400000);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diff === 0) return `Today · ${weekday} ${md}`;
    if (diff === 1) return `Tomorrow · ${weekday} ${md}`;
    return `${weekday} ${md}`;
  };

  const startLogFor = (dateStr) => {
    setDate(dateStr);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('training-log-form');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const focusForDate = (dateStr) => Array.isArray(plannedSessionFocus[dateStr]) ? plannedSessionFocus[dateStr] : [];
  const setFocusForDate = (dateStr, ids) => {
    if (!savePlannedSessionFocus) return;
    const next = { ...plannedSessionFocus };
    if (ids.length === 0) delete next[dateStr];
    else next[dateStr] = ids;
    savePlannedSessionFocus(next);
  };
  const lockFocusTrick = (dateStr, trickId) => {
    const cur = focusForDate(dateStr);
    if (cur.includes(trickId)) return;
    setFocusForDate(dateStr, [...cur, trickId]);
  };
  const unlockFocusTrick = (dateStr, trickId) => {
    setFocusForDate(dateStr, focusForDate(dateStr).filter(id => id !== trickId));
  };

  const dismissedForDate = (dateStr) => Array.isArray(plannedSessionDismissed[dateStr]) ? plannedSessionDismissed[dateStr] : [];
  const dismissSuggestion = (dateStr, trickId) => {
    if (!savePlannedSessionDismissed) return;
    const cur = dismissedForDate(dateStr);
    if (cur.includes(trickId)) return;
    const next = { ...plannedSessionDismissed, [dateStr]: [...cur, trickId] };
    savePlannedSessionDismissed(next);
  };
  const restoreDismissed = (dateStr) => {
    if (!savePlannedSessionDismissed) return;
    const next = { ...plannedSessionDismissed };
    delete next[dateStr];
    savePlannedSessionDismissed(next);
  };

  const toggleTag = (tag) => {
    setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag]);
  };

  const submit = async () => {
    if (!date) return;
    const entry = {
      id: Date.now(),
      date,
      focusTags: tags,
      practicedTricks,
      rpe: Number(rpe),
      durationMinutes: duration ? Math.max(0, parseInt(duration, 10) || 0) : 0,
      notes: notes.trim(),
      createdAt: Date.now(),
    };
    await saveTrainingSessions([entry, ...safeSessions]);
    if (markDayTrained) await markDayTrained(date);
    setTags([]); setDuration(''); setNotes(''); setRpe(6); setDate(today); setPracticedTricks([]);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const removeSession = async (id) => {
    if (!window.confirm('Delete this training session?')) return;
    await saveTrainingSessions(safeSessions.filter(s => s.id !== id));
  };

  const weeks = [];
  for (let i = 0; i < heatmapDays.length; i += 7) weeks.push(heatmapDays.slice(i, i + 7));

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-orange-300 uppercase">Streak</div>
            <div className="flex items-baseline gap-2"><span className="text-4xl font-black">{streak}</span><span className="text-sm font-bold text-orange-200">days</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-orange-300 uppercase">Total</div>
            <div className="text-2xl font-black">{totalSessions} <span className="text-sm font-bold text-orange-200">sessions</span></div>
            <div className="text-xs text-slate-300">{totalHours} h logged · avg RPE {avgRpe || '—'}</div>
          </div>
        </div>
        {nextMilestone && (
          <div className="mt-3 text-xs text-orange-200">
            Next milestone: <span className="font-bold">{nextMilestone.label}</span> ({nextMilestone.count - totalSessions} to go)
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" /> Last 16 weeks</div>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(d => (
                  <div key={d} title={`${d}${dayActivity[d] ? ` · ${dayActivity[d].sessions} session${dayActivity[d].sessions === 1 ? '' : 's'}` : ''}${isPlannedDay(d) ? ' · planned' : ''}`}
                    className={`w-3 h-3 rounded-sm ${cellClasses(d)}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-slate-800/60" />
            <div className="w-3 h-3 rounded-sm bg-orange-500/30" />
            <div className="w-3 h-3 rounded-sm bg-orange-300" />
            <div className="w-3 h-3 rounded-sm bg-orange-400" />
            <div className="w-3 h-3 rounded-sm bg-orange-500" />
            <div className="w-3 h-3 rounded-sm bg-orange-600" />
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-purple-500/30 rounded-2xl p-4">
        <button onClick={() => setPlanOpen(o => !o)} className="w-full flex items-start gap-2 text-left">
          <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-bold mb-1">Plan your training</div>
            <div className="text-xs text-slate-400">Pick months, weeks and weekdays you plan to train. Empty = all. Future planned days get a purple ring on the heatmap.</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform mt-1 ${planOpen ? 'rotate-180' : ''}`} />
        </button>
        {planOpen && (
          <div className="space-y-3 mt-3">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Months</div>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.map(m => {
                  const on = plannedMonths.includes(m.num);
                  return (
                    <button key={m.num} onClick={() => togglePlannedMonth(m.num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${on ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Weeks of the month</div>
              <div className="flex flex-wrap gap-1.5">
                {WEEKS.map(w => {
                  const on = plannedWeeks.includes(w);
                  return (
                    <button key={w} onClick={() => togglePlannedWeek(w)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${on ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                      Week {w}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Weekdays</div>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(d => {
                  const on = plannedDays.includes(d.num);
                  return (
                    <button key={d.num} onClick={() => togglePlannedDay(d.num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${on ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {(plannedDays.length + plannedMonths.length + plannedWeeks.length) > 0 && (
              <div className="text-xs text-slate-300">
                <span className="text-purple-300 font-bold">{plannedSessionsThisMonth}</span> planned training day{plannedSessionsThisMonth === 1 ? '' : 's'} in {monthName}.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" /> Upcoming sessions</div>
        {upcomingSessions.length === 0 ? (
          <div className="text-sm text-slate-500">Pick months / weeks / weekdays above to plan your sessions.</div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map(us => {
              const logged = us.loggedSession;
              const lockedIds = focusForDate(us.date);
              const lockedTricks = lockedIds.map(id => tricks.find(t => t.id === id)).filter(Boolean);
              const dismissedIds = dismissedForDate(us.date);
              const remainingSuggestions = sessionSuggestions.filter(s => !lockedIds.includes(s.trick.id) && !dismissedIds.includes(s.trick.id));
              const addable = tricks.filter(t => !lockedIds.includes(t.id) && t.status !== 'got_it')
                .sort((a, b) => a.name.localeCompare(b.name));
              const isOpen = !!expandedSessions[us.date];
              return (
                <div key={us.date} className={`bg-slate-900 border rounded-xl p-3 ${logged ? 'border-green-500/40' : 'border-slate-700'}`}>
                  <button onClick={() => toggleSessionOpen(us.date)} className={`w-full flex items-center gap-2 text-left ${isOpen ? 'mb-2' : ''}`}>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className="font-bold text-sm flex-1">{formatUpcomingDate(us.date)}</span>
                    {!isOpen && lockedTricks.length > 0 && (
                      <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded">{lockedTricks.length} locked</span>
                    )}
                    {logged && <span className="text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/40 px-2 py-0.5 rounded">✓ Logged · RPE {logged.rpe}</span>}
                  </button>

                  {isOpen && lastLoggedSession && (
                    <button onClick={() => copyLastSessionTo(us.date)}
                      className="w-full mb-2 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded font-bold text-xs transition flex items-center justify-center gap-1"
                      title={`Copy practiced tricks from session on ${lastLoggedSession.date}`}>
                      📋 Copy last session ({lastLoggedSession.practicedTricks.length} {lastLoggedSession.practicedTricks.length === 1 ? 'trick' : 'tricks'} from {lastLoggedSession.date})
                    </button>
                  )}

                  {isOpen && lockedTricks.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-semibold text-purple-300 uppercase mb-1">🔒 Focus for this session ({lockedTricks.length})</div>
                      <div className="space-y-2">
                        {lockedTricks.map(t => {
                          const diff = DIFFICULTY_COLORS[t.difficulty];
                          const tStatus = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
                          const tutorialVideo = t.videos?.find(v => isTutorialVideo(v) && v.primary) || t.videos?.find(v => isTutorialVideo(v));
                          const referenceVideo = t.videos?.find(v => v.type !== 'tutorial' && v.primary) || t.videos?.find(v => v.type !== 'tutorial');
                          const playVideo = (e, video) => { e.stopPropagation(); if (video?.url && onOpenTrick) onOpenTrick(t, normalizeUrl(video.url)); };
                          return (
                            <div key={t.id} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-purple-500/40 rounded-xl p-3 flex items-center gap-2 transition">
                              <button onClick={() => onOpenTrick && onOpenTrick(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
                                <CategoryIcon category={t.category} size={20} className="text-slate-300 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold truncate">{t.name}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
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
                              <button onClick={() => onOpenTrick && onOpenTrick(t)} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${tStatus.color} ${tStatus.textColor}`}>{tStatus.emoji}</button>
                              <button onClick={() => unlockFocusTrick(us.date, t.id)} className="text-slate-500 hover:text-red-400 flex-shrink-0" title="Remove from focus"><X className="w-4 h-4" /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isOpen && remainingSuggestions.length > 0 && (() => {
                    const suggestionLimit = Math.max(1, 5 - lockedTricks.length);
                    const visible = remainingSuggestions.slice(0, suggestionLimit);
                    return (
                      <div className="mb-2">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Suggested focus</div>
                        <div className="space-y-2">
                          {visible.map(s => {
                            const canDismiss = remainingSuggestions.length > 1;
                            const diff = DIFFICULTY_COLORS[s.trick.difficulty];
                            const tStatus = STATUS_LEVELS.find(st => st.id === s.trick.status) || STATUS_LEVELS[0];
                            const tutorialVideo = s.trick.videos?.find(v => isTutorialVideo(v) && v.primary) || s.trick.videos?.find(v => isTutorialVideo(v));
                            const referenceVideo = s.trick.videos?.find(v => v.type !== 'tutorial' && v.primary) || s.trick.videos?.find(v => v.type !== 'tutorial');
                            const playVideo = (e, video) => { e.stopPropagation(); if (video?.url && onOpenTrick) onOpenTrick(s.trick, normalizeUrl(video.url)); };
                            return (
                              <div key={s.trick.id} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-2 transition">
                                <button onClick={() => onOpenTrick && onOpenTrick(s.trick)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                  <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
                                  <CategoryIcon category={s.trick.category} size={20} className="text-slate-300 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate">{s.trick.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{s.trick.difficulty}</span>
                                      {s.trick.videos?.length > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><Video className="w-3 h-3" /> {s.trick.videos.length}</span>}
                                      <span className="text-[10px] text-slate-400 truncate">{s.reason}</span>
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
                                <button onClick={() => onOpenTrick && onOpenTrick(s.trick)} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${tStatus.color} ${tStatus.textColor}`}>{tStatus.emoji}</button>
                                <button onClick={() => lockFocusTrick(us.date, s.trick.id)} className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500 text-slate-900 hover:bg-yellow-400 transition" title="Lock in for this session">+ Add</button>
                                {canDismiss && (
                                  <button onClick={() => dismissSuggestion(us.date, s.trick.id)} className="text-slate-500 hover:text-red-400 flex-shrink-0" title="Dismiss this suggestion"><X className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {dismissedIds.length > 0 && (
                          <button onClick={() => restoreDismissed(us.date)} className="text-[10px] text-slate-500 hover:text-slate-300 mt-2">
                            ↩ Restore {dismissedIds.length} dismissed
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {isOpen && !logged && addable.length > 0 && (
                    <div className="mb-2">
                      <select value=""
                        onChange={(e) => { if (e.target.value) lockFocusTrick(us.date, parseInt(e.target.value, 10)); }}
                        className="w-full bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 px-2 py-1.5">
                        <option value="">+ Add another trick…</option>
                        {addable.map(t => <option key={t.id} value={t.id}>{t.name} ({t.difficulty})</option>)}
                      </select>
                    </div>
                  )}

                  {isOpen && lockedTricks.length === 0 && remainingSuggestions.length === 0 && (
                    <div className="bg-slate-900 border border-dashed border-slate-700 rounded-lg p-3 mb-2 text-center">
                      <div className="text-sm text-slate-300">Nothing planned yet for this day.</div>
                      <div className="text-xs text-slate-500 mt-1">Pick a trick from below, or mark tricks as 💪 Training in the Tricks tab to see them here.</div>
                    </div>
                  )}

                  {isOpen && (
                    <div className="flex gap-1.5">
                      <button onClick={() => setSection && setSection('warmup')} className="flex-1 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded font-bold text-xs transition">🔥 Warm Up</button>
                      <button onClick={() => setSection && setSection('conditioning')} className="flex-1 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded font-bold text-xs transition">💪 Strength</button>
                      {!logged && (
                        <button onClick={() => startLogFor(us.date)} className="flex-1 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded font-bold text-xs transition">📝 Log it</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div id="training-log-form" className="bg-slate-800/50 border border-purple-500/30 rounded-2xl p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-purple-400" /> Log a session</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Date</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Duration (min)</div>
            <input type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 90" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-slate-400 uppercase">RPE (intensity)</div>
            <span className="text-xs font-bold text-purple-300">{rpe} / 10</span>
          </div>
          <input type="range" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} className="w-full accent-purple-500" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Focus</div>
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_TAGS.map(tag => {
              const on = tags.includes(tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition border ${on ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Tricks practiced</div>
          {practicedTricks.length === 0 && <div className="text-xs text-slate-500 italic mb-1">No tricks added — pick from the dropdown below.</div>}
          {practicedTricks.length > 0 && (
            <div className="space-y-2 mb-2">
              {practicedTricks.map(id => {
                const t = tricks.find(x => x.id === id);
                if (!t) return null;
                const diff = DIFFICULTY_COLORS[t.difficulty];
                const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
                const tutorialVideo = t.videos?.find(v => isTutorialVideo(v) && v.primary) || t.videos?.find(v => isTutorialVideo(v));
                const referenceVideo = t.videos?.find(v => v.type !== 'tutorial' && v.primary) || t.videos?.find(v => v.type !== 'tutorial');
                const playVideo = (e, video) => { e.stopPropagation(); if (video?.url && onOpenTrick) onOpenTrick(t, normalizeUrl(video.url)); };
                return (
                  <div key={id} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-2 transition">
                    <button onClick={() => onOpenTrick && onOpenTrick(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
                      <CategoryIcon category={t.category} size={20} className="text-slate-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{t.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
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
                    <button onClick={() => onOpenTrick && onOpenTrick(t)} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.color} ${status.textColor}`}>{status.emoji}</button>
                    <button onClick={() => setPracticedTricks(arr => arr.filter(x => x !== id))} className="text-slate-500 hover:text-red-400 flex-shrink-0" title="Remove"><X className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
          {(() => {
            const addable = (tricks || []).filter(t => !practicedTricks.includes(t.id)).sort((a, b) => a.name.localeCompare(b.name));
            if (addable.length === 0) return null;
            return (
              <select value=""
                onChange={e => { if (e.target.value) setPracticedTricks(arr => [...arr, parseInt(e.target.value, 10)]); }}
                className="w-full bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 px-2 py-1.5">
                <option value="">+ Add a trick…</option>
                {addable.map(t => <option key={t.id} value={t.id}>{t.name} ({t.difficulty})</option>)}
              </select>
            );
          })()}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="What worked? What's next?" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm resize-none" />
        </div>
        <button onClick={submit} className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold transition hover:scale-[1.02] active:scale-95">
          {savedToast ? '✅ Saved!' : 'Log session'}
        </button>
      </div>

      {reachedMilestones.length > 0 && (
        <div className="bg-slate-800/50 border border-yellow-500/30 rounded-2xl p-4">
          <div className="font-bold mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Milestones</div>
          <div className="flex flex-wrap gap-2">
            {reachedMilestones.map(m => (
              <span key={m.count} className="text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-1 rounded">🏅 {m.label}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <button onClick={() => setJournalOpen(o => !o)} className="w-full flex items-center gap-2 text-left">
          <ScrollText className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <span className="font-bold flex-1">Journal — logged sessions ({safeSessions.length})</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${journalOpen ? 'rotate-180' : ''}`} />
        </button>
        {journalOpen && (
          <div className="mt-3">
            <SessionJournalSection
              trainingSessions={trainingSessions}
              saveTrainingSessions={saveTrainingSessions}
              tricks={tricks}
              embedded
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SessionJournalSection({ trainingSessions = [], saveTrainingSessions, tricks = [], embedded = false }) {
  const safeSessions = Array.isArray(trainingSessions) ? trainingSessions : [];
  const sortedSessions = [...safeSessions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const [openId, setOpenId] = useState(null);
  const removeSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this training session?')) return;
    if (openId === id) setOpenId(null);
    await saveTrainingSessions(safeSessions.filter(s => s.id !== id));
  };
  const Wrapper = embedded ? 'div' : 'div';
  const wrapperClass = embedded ? '' : 'bg-slate-800/50 border border-slate-700 rounded-2xl p-4';
  return (
    <Wrapper className={wrapperClass}>
      {!embedded && (
        <div className="font-bold mb-3 flex items-center gap-2"><ScrollText className="w-5 h-5 text-purple-400" /> Logged sessions ({safeSessions.length})</div>
      )}
      {sortedSessions.length === 0 ? (
        <div className="text-sm text-slate-500 text-center py-6">No sessions logged yet.</div>
      ) : (
        <div className="space-y-2">
          {sortedSessions.map(s => {
            const isOpen = openId === s.id;
            const tagsCount = Array.isArray(s.focusTags) ? s.focusTags.length : 0;
            const tricksCount = Array.isArray(s.practicedTricks) ? s.practicedTricks.length : 0;
            return (
              <div key={s.id} className={`bg-slate-900 border rounded-lg text-sm ${isOpen ? 'border-purple-500/40' : 'border-slate-700'}`}>
                <button onClick={() => setOpenId(isOpen ? null : s.id)} className="w-full flex items-center gap-2 p-3 text-left">
                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  <span className="font-bold">{s.date}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex-shrink-0">RPE {s.rpe}</span>
                  {s.durationMinutes > 0 && <span className="text-xs text-slate-400 flex-shrink-0">{s.durationMinutes} min</span>}
                  {!isOpen && (tricksCount > 0 || tagsCount > 0) && (
                    <span className="text-[10px] text-slate-500 flex-shrink-0 ml-auto">
                      {tricksCount > 0 && `${tricksCount} ${tricksCount === 1 ? 'trick' : 'tricks'}`}
                      {tricksCount > 0 && tagsCount > 0 && ' · '}
                      {tagsCount > 0 && `${tagsCount} tag${tagsCount === 1 ? '' : 's'}`}
                    </span>
                  )}
                  {isOpen && <span className="ml-auto" />}
                  <button onClick={(e) => removeSession(e, s.id)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><X className="w-4 h-4" /></button>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-0 space-y-2 border-t border-slate-700/60">
                    {tagsCount > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mt-2 mb-1">Focus tags</div>
                        <div className="flex flex-wrap gap-1">
                          {s.focusTags.map(t => <span key={t} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">#{t}</span>)}
                        </div>
                      </div>
                    )}
                    {tricksCount > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tricks practiced</div>
                        <div className="space-y-1">
                          {s.practicedTricks.map(id => {
                            const t = tricks.find(x => x.id === id);
                            if (!t) return null;
                            return (
                              <div key={id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded p-2 text-xs">
                                <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
                                <span className="flex-1 truncate font-medium">{t.name}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[t.difficulty]?.bg} ${DIFFICULTY_COLORS[t.difficulty]?.text} flex-shrink-0`}>{t.difficulty}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {s.notes ? (
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Notes</div>
                        <div className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-800 border border-slate-700 rounded p-2">{s.notes}</div>
                      </div>
                    ) : null}
                    {tagsCount === 0 && tricksCount === 0 && !s.notes && (
                      <div className="text-xs text-slate-500 italic mt-2">No details logged for this session.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Wrapper>
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
    const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : 2;
    return order(a) - order(b) || a.name.localeCompare(b.name);
  };
  const TrickRow = ({ t }) => {
    const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
    return (
      <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
        <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
        <span className="flex-1 truncate">{t.name}</span>
        <span className="text-base flex-shrink-0">{status.emoji}</span>
      </div>
    );
  };
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
          {LANDING_LEVELS.map(l => {
            const open = expandedLanding === l.id;
            const matched = tricks.filter(t => Array.isArray(t.progress) && t.progress.includes(l.id));
            const rows = matched.slice().sort(sortByStatus);
            const count = matched.length;
            const totalTricks = tricks.length;
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
                    ) : rows.map(t => <TrickRow key={t.id} t={t} />)}
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

function SkillTreeTab({ tricks, onOpenTrick, weeklyGoals = [], saveGoals }) {
  const FOCUS_KEY = '__focus__';
  const TIERS = ['Easy', 'Medium', 'Hard', 'Super'];
  const trickCategories = [...new Set(tricks.map(t => t.category))].sort((a, b) => {
    if (a === 'Gymnastics') return 1;
    if (b === 'Gymnastics') return -1;
    return a.localeCompare(b);
  });
  const allCategories = [FOCUS_KEY, ...trickCategories];
  const [selectedCategory, setSelectedCategory] = useState(FOCUS_KEY);
  const [newGoalTrickId, setNewGoalTrickId] = useState('');
  const isFocus = selectedCategory === FOCUS_KEY;

  const inCategory = isFocus
    ? weeklyGoals.map(g => tricks.find(t => t.id === g.trickId)).filter(Boolean)
    : tricks.filter(t => t.category === selectedCategory);
  const totalMastered = inCategory.filter(t => t.status === 'got_it').length;

  const addGoal = () => {
    if (!newGoalTrickId || !saveGoals) return;
    const id = parseInt(newGoalTrickId, 10);
    if (weeklyGoals.some(g => g.trickId === id)) return;
    saveGoals([...weeklyGoals, { trickId: id, addedAt: Date.now() }]);
    setNewGoalTrickId('');
  };
  const removeGoal = (id) => { if (saveGoals) saveGoals(weeklyGoals.filter(g => g.trickId !== id)); };
  const addSuggestion = (id) => { if (saveGoals && !weeklyGoals.some(g => g.trickId === id)) saveGoals([...weeklyGoals, { trickId: id, addedAt: Date.now() }]); };

  const focusSuggestions = (() => {
    const list = [];
    const added = new Set(weeklyGoals.map(g => g.trickId));
    const tryAdd = (trick, reason, icon, priority) => {
      if (!trick || added.has(trick.id)) return;
      list.push({ trick, reason, icon, priority });
      added.add(trick.id);
    };
    const hasLanding = (t, id) => Array.isArray(t.progress) && t.progress.includes(id);
    tricks.filter(t => t.status === 'training' && hasLanding(t, 'soft_landing')).slice(0, 2).forEach(t => tryAdd(t, 'Almost mastered — one more push!', '🎯', 1));
    tricks.filter(t => t.status === 'training' && hasLanding(t, 'trampoline_landing') && !hasLanding(t, 'soft_landing')).slice(0, 2).forEach(t => tryAdd(t, 'Got it on trampoline — try soft mat next', '🤾', 2));
    tricks.filter(t => t.status === 'training' && (!Array.isArray(t.progress) || t.progress.length === 0)).slice(0, 2).forEach(t => tryAdd(t, 'Already training — stay consistent', '💪', 3));
    if (list.length < 3) {
      tricks.filter(t => t.status === 'want_to_learn' && (t.difficulty === 'Easy' || t.difficulty === 'Medium')).slice(0, 5).forEach(t => tryAdd(t, 'Good one to add', '🌟', 7));
    }
    return list.sort((a, b) => a.priority - b.priority).slice(0, 3);
  })();

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-lg">Skill Tree</h2>
        </div>
        <p className="text-sm text-slate-400">
          Climb each category from Easy to Super. Tap a trick to open it.
        </p>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Category</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allCategories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${selectedCategory === c ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {c === FOCUS_KEY ? <><span className="text-base">🎯</span>In Focus</> : <><CategoryIcon category={c} size={16} />{c}</>}
            </button>
          ))}
        </div>
      </div>

      {isFocus && (() => {
        const remainingSuggestions = focusSuggestions.filter(s => !weeklyGoals.some(g => g.trickId === s.trick.id));
        const suggestionLimit = Math.max(1, 5 - weeklyGoals.length);
        const visibleSuggestions = remainingSuggestions.slice(0, suggestionLimit);
        const addable = tricks.filter(t => t.status !== 'got_it' && !weeklyGoals.some(g => g.trickId === t.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
            {weeklyGoals.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-purple-300 uppercase mb-1">🎯 In Focus ({weeklyGoals.length})</div>
                <div className="space-y-2">
                  {weeklyGoals.map(g => {
                    const t = tricks.find(x => x.id === g.trickId);
                    if (!t) return null;
                    const diff = DIFFICULTY_COLORS[t.difficulty];
                    const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
                    const tutorialVideo = t.videos?.find(v => isTutorialVideo(v) && v.primary) || t.videos?.find(v => isTutorialVideo(v));
                    const referenceVideo = t.videos?.find(v => v.type !== 'tutorial' && v.primary) || t.videos?.find(v => v.type !== 'tutorial');
                    const playVideo = (e, video) => { e.stopPropagation(); if (video?.url) onOpenTrick(t, normalizeUrl(video.url)); };
                    return (
                      <div key={g.trickId} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-purple-500/40 rounded-xl p-3 flex items-center gap-2 transition">
                        <button onClick={() => onOpenTrick(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
                          <CategoryIcon category={t.category} size={20} className="text-slate-300 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">{t.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
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
                        <button onClick={() => onOpenTrick(t)} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.color} ${status.textColor}`}>{status.emoji}</button>
                        <button onClick={() => removeGoal(g.trickId)} className="text-slate-500 hover:text-red-400 flex-shrink-0" title="Remove from focus"><X className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {visibleSuggestions.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Suggested focus</div>
                <div className="space-y-1">
                  {visibleSuggestions.map(s => (
                    <div key={s.trick.id} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded p-2 text-sm transition">
                      <CategoryIcon category={s.trick.category} size={14} className="text-slate-400 flex-shrink-0" />
                      <button onClick={() => onOpenTrick(s.trick)} className="flex-1 truncate font-medium text-left">{s.trick.name}</button>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{s.reason}</span>
                      <button onClick={() => addSuggestion(s.trick.id)} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-500 text-slate-900 hover:bg-yellow-400 transition" title="Add to focus">+ Add</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {addable.length > 0 && (
              <select value="" onChange={(e) => { if (e.target.value) addSuggestion(parseInt(e.target.value, 10)); }}
                className="w-full bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 px-2 py-1.5 mb-2">
                <option value="">+ Add another trick…</option>
                {addable.map(t => <option key={t.id} value={t.id}>{t.name} ({t.difficulty})</option>)}
              </select>
            )}

            {weeklyGoals.length === 0 && visibleSuggestions.length === 0 && addable.length === 0 && (
              <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-sm font-bold text-slate-200 mb-1">No focus tricks yet</div>
                <div className="text-xs text-slate-400">Tap a category above and hit <span className="font-bold text-yellow-300">+ Add</span> next to any trick to focus on it this week.</div>
              </div>
            )}
          </div>
        );
      })()}

      {isFocus && (() => {
        const training = tricks.filter(t => t.status === 'training' && !weeklyGoals.some(g => g.trickId === t.id));
        const wantToLearn = tricks.filter(t => t.status === 'want_to_learn' && !weeklyGoals.some(g => g.trickId === t.id));
        const renderTierRow = (t) => {
          const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
          const diff = DIFFICULTY_COLORS[t.difficulty];
          const tutorialVideo = t.videos?.find(v => isTutorialVideo(v) && v.primary) || t.videos?.find(v => isTutorialVideo(v));
          const referenceVideo = t.videos?.find(v => v.type !== 'tutorial' && v.primary) || t.videos?.find(v => v.type !== 'tutorial');
          const playVideo = (e, video) => { e.stopPropagation(); if (video?.url) onOpenTrick(t, normalizeUrl(video.url)); };
          return (
            <div key={t.id} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-2 transition">
              <button onClick={() => onOpenTrick(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className={`w-1 h-12 ${diff?.strip} rounded-full flex-shrink-0`} />
                <CategoryIcon category={t.category} size={20} className="text-slate-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{t.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff?.bg} ${diff?.text}`}>{t.difficulty}</span>
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
              <button onClick={() => onOpenTrick(t)} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.color} ${status.textColor}`}>{status.emoji}</button>
              <button onClick={() => addSuggestion(t.id)}
                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500 text-slate-900 hover:bg-yellow-400 transition">
                + Add
              </button>
            </div>
          );
        };
        return (
          <>
            {training.length > 0 && (
              <div className="bg-slate-800/50 border border-yellow-500/40 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black px-2 py-1 rounded bg-yellow-500 text-white">💪 TRAINING</span>
                  <span className="text-sm font-bold text-slate-200">{training.length}</span>
                </div>
                <div className="space-y-2">
                  {training.map(renderTierRow)}
                </div>
              </div>
            )}
            {wantToLearn.length > 0 && (
              <div className="bg-slate-800/50 border border-purple-500/40 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black px-2 py-1 rounded bg-purple-500 text-white">👀 WANT TO LEARN</span>
                  <span className="text-sm font-bold text-slate-200">{wantToLearn.length}</span>
                </div>
                <div className="space-y-2">
                  {wantToLearn.map(renderTierRow)}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {!isFocus && inCategory.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-5xl mb-2">🌱</div>
          <div>No tricks in this category yet.</div>
        </div>
      ) : !isFocus && (
        <>
          <div className="text-sm text-slate-400 text-center">
            <span className="font-bold text-white">{totalMastered}</span> / {inCategory.length} mastered in {selectedCategory}
          </div>

          <div className="space-y-2">
            {TIERS.map((tier, idx) => {
              const tricksAtTier = inCategory.filter(t => t.difficulty === tier);
              if (tricksAtTier.length === 0) return null;
              const masteredCount = tricksAtTier.filter(t => t.status === 'got_it').length;
              const allMastered = masteredCount === tricksAtTier.length;
              const col = DIFFICULTY_COLORS[tier];
              const nextHasContent = TIERS.slice(idx + 1).some(t => inCategory.some(tr => tr.difficulty === t));
              return (
                <React.Fragment key={tier}>
                  <div className={`bg-slate-800/50 border ${allMastered ? 'border-green-500/50' : col.border + '/40'} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-black px-2 py-1 rounded ${col.strip} text-white`}>{tier.toUpperCase()}</span>
                      <span className="text-sm font-bold text-slate-200">{masteredCount} / {tricksAtTier.length}</span>
                      {allMastered && <span className="ml-auto text-xs font-bold text-green-300">✅ Tier complete</span>}
                    </div>
                    <div className="space-y-2">
                      {tricksAtTier.map(t => {
                        const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
                        const mastered = t.status === 'got_it';
                        const inProgress = t.status === 'training';
                        const inFocus = weeklyGoals.some(g => g.trickId === t.id);
                        const unread = !!t._unread;
                        return (
                          <div
                            key={t.id}
                            className={`relative w-full flex items-center gap-2 rounded-lg p-2.5 transition border ${
                              mastered
                                ? 'bg-green-500/10 border-green-500/40 hover:bg-green-500/20'
                                : inProgress
                                  ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                                  : 'bg-slate-900 border-transparent hover:bg-slate-800'
                            }`}
                          >
                            {unread && <span className="pointer-events-none absolute -top-1 -left-1 text-sm animate-pulse">✨</span>}
                            <button onClick={() => onOpenTrick(t)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                              <span className="text-lg flex-shrink-0">{status.emoji}</span>
                              <CategoryIcon category={t.category} size={16} className="text-slate-300 flex-shrink-0" />
                              <span className="flex-1 truncate font-medium text-sm">{t.name}</span>
                              <span className={`text-xs flex-shrink-0 ${mastered ? 'text-green-300' : inProgress ? 'text-yellow-300' : 'text-slate-500'}`}>
                                {status.label}
                              </span>
                            </button>
                            {!mastered && (
                              <button onClick={(e) => { e.stopPropagation(); inFocus ? removeGoal(t.id) : addSuggestion(t.id); }}
                                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition ${inFocus ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'}`}
                                title={inFocus ? 'Remove from In Focus' : 'Add to In Focus'}>
                                {inFocus ? '✓ Added' : '+ Add'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {nextHasContent && (
                    <div className="flex justify-center py-1">
                      <ChevronDown className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function AddTab({ user, setActiveTab }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Flips');
  const [difficulty, setDifficulty] = useState('Medium');
  const [videos, setVideos] = useState([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoLabel, setNewVideoLabel] = useState('');
  const [newVideoIsReference, setNewVideoIsReference] = useState(true);
  const [newVideoIsTutorial, setNewVideoIsTutorial] = useState(false);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [sent, setSent] = useState(false);
  const categories = ['Flips', 'Jump', 'Tricks', 'Leap', 'Swings', 'Vaults', 'Gymnastics'];
  const difficulties = ['Easy', 'Medium', 'Hard', 'Super'];
  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    const url = normalizeUrl(newVideoUrl.trim());
    const isRef = newVideoIsReference || (!newVideoIsReference && !newVideoIsTutorial);
    const type = computeVideoType(isRef, newVideoIsTutorial);
    const defaultLabel = type === 'tutorial' ? 'Tutorial' : 'Video';
    setVideos([...videos, { url, label: newVideoLabel.trim() || defaultLabel, type }]);
    setNewVideoUrl(''); setNewVideoLabel('');
  };
  const removeVideo = (idx) => setVideos(videos.filter((_, i) => i !== idx));
  const reset = () => {
    setName(''); setCategory('Flips'); setDifficulty('Medium');
    setVideos([]); setNotes('');
    setNewVideoUrl(''); setNewVideoLabel('');
    setNewVideoIsReference(true); setNewVideoIsTutorial(false);
    setAddVideoOpen(false);
  };
  const submit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addDoc(collection(db, 'trickSuggestions'), {
        trick: { name: name.trim(), category, difficulty, notes },
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
        <div className="flex items-center gap-2 mb-1"><Plus className="w-5 h-5 text-purple-400" /><h2 className="font-bold text-lg">Add a new trick suggestion</h2></div>
        <div className="text-xs text-slate-400 mb-3">Submitted suggestions are reviewed by an admin before being published to everyone.</div>
        <div className="space-y-4">
          <div><div className="text-xs font-semibold text-slate-400 uppercase mb-1">Trick name</div><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Triple Backflip" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" /></div>
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
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Videos</div>
            {videos.length > 0 && (
              <div className="space-y-2 mb-2">
                {videos.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-sm">
                    <span className="text-base">{v.type === 'both' ? '📹🎓' : v.type === 'tutorial' ? '🎓' : '📹'}</span>
                    <span className="truncate flex-1">{v.label}</span>
                    <span className="text-xs text-slate-500 truncate flex-shrink-0 max-w-[120px]">{v.url}</span>
                    <button onClick={() => removeVideo(i)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg">
              <button onClick={() => setAddVideoOpen(o => !o)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-800/50 transition rounded-lg">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Add a video
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${addVideoOpen ? 'rotate-180' : ''}`} />
              </button>
              {addVideoOpen && (
              <div className="p-2 pt-0 space-y-2">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tag as</div>
                <div className="flex gap-2">
                  <button onClick={() => setNewVideoIsReference(v => !v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${newVideoIsReference ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>📹 Reference</button>
                  <button onClick={() => setNewVideoIsTutorial(v => !v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${newVideoIsTutorial ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>🎓 Tutorial</button>
                </div>
              </div>
              <input type="text" value={newVideoLabel} onChange={e => setNewVideoLabel(e.target.value)} placeholder="Label (e.g. Storror tutorial)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <input type="url" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="YouTube or Vimeo URL" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                <button onClick={addVideo} disabled={!newVideoUrl.trim()} className="px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-bold text-sm">Add</button>
              </div>
              </div>
              )}
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
          <button onClick={submit} disabled={!name.trim() || submitting} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition">{sent ? '✅ Sent for review!' : submitting ? 'Sending…' : 'Send in request'}</button>
        </div>
      </div>
    </div>
  );
}

function ExerciseTimer({ totalSeconds, color = 'orange' }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); setFinished(true); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [running, remaining]);
  const reset = (e) => { e.stopPropagation(); setRemaining(totalSeconds); setRunning(false); setFinished(false); };
  const toggle = (e) => { e.stopPropagation(); if (finished) { setRemaining(totalSeconds); setFinished(false); setRunning(true); } else setRunning(r => !r); };
  const mins = Math.floor(remaining / 60), secs = remaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;
  const pct = (remaining / totalSeconds) * 100;
  const c = color === 'blue' ? { bg: 'bg-blue-500', text: 'text-blue-300', bgLight: 'bg-blue-500/20' } : { bg: 'bg-orange-500', text: 'text-orange-300', bgLight: 'bg-orange-500/20' };
  return (
    <div onClick={(e) => e.stopPropagation()} className="mt-3 flex items-center gap-2 bg-slate-900/70 rounded-lg p-2 border border-slate-700">
      <div className="flex-1 relative h-8 bg-slate-800 rounded overflow-hidden">
        <div className={`absolute inset-y-0 left-0 ${c.bg} transition-all duration-1000 ${finished ? 'animate-pulse' : ''}`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm">{finished ? '✅ Done!' : display}</div>
      </div>
      <button onClick={toggle} className={`flex-shrink-0 w-9 h-9 rounded-lg ${c.bgLight} ${c.text} hover:opacity-80 flex items-center justify-center transition`}>{running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
      <button onClick={reset} className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center justify-center transition"><RotateCcw className="w-4 h-4" /></button>
    </div>
  );
}

function AdminTab({ currentUserUid, myTricks = [] }) {
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
    if (!window.confirm(`Push your full trick library to the community list?\n\nNew tricks (not in the seed list) will be added to communityTricks. All your personal videos will be made global.\n\nProceed?`)) return;
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
      let addedTricks = 0;
      let addedVideoTricks = 0;

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
        }
      }

      await setDoc(doc(db, 'globalConfig', 'tricks'), {
        communityTricks: newCommunity,
        globalVideos: newGV,
        updatedAt: Date.now(),
      }, { merge: true });

      setCommunityTricks(newCommunity);
      setSyncResult(`✅ Synced. Added ${addedTricks} new community trick${addedTricks === 1 ? '' : 's'}, promoted videos for ${addedVideoTricks} trick${addedVideoTricks === 1 ? '' : 's'}.`);
      setTimeout(() => setSyncResult(null), 6000);
    } catch (e) {
      console.error('Sync error', e);
      setSyncError(`Sync failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
    setSyncing(false);
  };

  const removeTrickFromGlobal = async (trickId, trickName) => {
    if (!window.confirm(`Remove "${trickName}" from the global trick list?\n\nThis will hide it for all users on next load. Their personal videos and progress for this trick will be discarded when their app re-syncs.`)) return;
    setDeletingTrickId(trickId);
    setSaveError(null);
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
    } catch (e) {
      console.error('Remove trick error', e);
      setSaveError(`Remove failed — ${e.code || 'error'}: ${e.message || 'unknown'}`);
    }
    setDeletingTrickId(null);
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
      const [tricks, days, journal, goals, warmups, conditioning] = await Promise.all([
        loadUserData(profile.uid, 'tricks'),
        loadUserData(profile.uid, 'trainingDays'),
        loadUserData(profile.uid, 'journal'),
        loadUserData(profile.uid, 'weeklyGoals'),
        loadUserData(profile.uid, 'completedWarmups'),
        loadUserData(profile.uid, 'completedConditioning'),
      ]);
      setUserData({
        tricks: tricks || [],
        trainingDays: days || [],
        journal: journal || [],
        weeklyGoals: goals || [],
        completedWarmups: warmups || {},
        completedConditioning: conditioning || {},
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
                      const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : 2;
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
                            ) : rows.map(t => {
                              const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
                              return (
                                <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
                                  <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
                                  <span className="flex-1 truncate">{t.name}</span>
                                  <span className="text-base flex-shrink-0">{status.emoji}</span>
                                </div>
                              );
                            })}
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
                      const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : 2;
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
                            ) : rows.map(t => {
                              const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
                              return (
                                <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
                                  <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
                                  <span className="flex-1 truncate">{t.name}</span>
                                  <span className="text-base flex-shrink-0">{status.emoji}</span>
                                </div>
                              );
                            })}
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
                      const order = (t) => t.status === 'got_it' ? 0 : t.status === 'training' ? 1 : 2;
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
                            ) : rows.map(t => {
                              const status = STATUS_LEVELS.find(s => s.id === t.status) || STATUS_LEVELS[0];
                              return (
                                <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 text-sm">
                                  <CategoryIcon category={t.category} size={14} className="text-slate-400 flex-shrink-0" />
                                  <span className="flex-1 truncate">{t.name}</span>
                                  <span className="text-base flex-shrink-0">{status.emoji}</span>
                                </div>
                              );
                            })}
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
                    <span className="text-xs text-slate-400 ml-auto">
                      {STATUS_LEVELS.find(s => s.id === trick.status)?.emoji}
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
        <p className="text-sm text-slate-400">
          Tap a user to view their training progress in read-only mode.
        </p>
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

      <div className="bg-slate-800/50 border border-purple-500/40 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2">
          <span className="text-lg">💡</span> Trick Suggestions
          <span className="ml-auto text-xs text-slate-400 font-normal">{suggestions.filter(s => s.status === 'pending').length} pending · {suggestions.length} total</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 mb-3">
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
      </div>

      <div className="bg-slate-800/50 border border-blue-500/40 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2">
          <span className="text-lg">✏️</span> Trick Management
          {saveOk && <span className="text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/40 px-2 py-0.5 rounded">✓ Saved</span>}
          <span className="ml-auto text-xs text-slate-400 font-normal">{INITIAL_TRICKS.length} tricks</span>
        </div>
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
              }
              return withEffective;
            })().map(({ trick: t, effective, source }) => {
              const ov = overrides[String(t.id)];
              const col = DIFFICULTY_COLORS[effective.difficulty];
              const isDeleting = deletingTrickId === t.id;
              return (
                <div key={t.id} className="w-full flex items-center gap-2 bg-slate-900 hover:bg-slate-800 rounded-lg px-3 py-2 text-left transition text-sm">
                  <button onClick={() => startEdit(t)} className="flex-1 flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-6 rounded-full ${col.strip} flex-shrink-0`} />
                    <CategoryIcon category={effective.category} size={15} className="flex-shrink-0 text-slate-400" />
                    <span className="flex-1 truncate font-medium">{effective.name}</span>
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
      </div>

    </div>
  );
}
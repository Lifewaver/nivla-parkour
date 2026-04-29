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
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

const RELEASE_NOTES = [
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
  { id: 'not_started', label: 'Not started', color: 'bg-gray-600', textColor: 'text-gray-300', emoji: '⚪' },
  { id: 'training_hard', label: 'Training hard', color: 'bg-yellow-500', textColor: 'text-yellow-100', emoji: '💪' },
  { id: 'trampoline_landing', label: 'Trampoline landing', color: 'bg-cyan-500', textColor: 'text-cyan-100', emoji: '🤾' },
  { id: 'soft_landing', label: 'Soft landing', color: 'bg-blue-500', textColor: 'text-blue-100', emoji: '🛬' },
  { id: 'training_like_hell', label: 'Training like hell', color: 'bg-orange-500', textColor: 'text-orange-100', emoji: '🔥' },
  { id: 'yes_i_can', label: 'Yes I can!', color: 'bg-green-500', textColor: 'text-green-100', emoji: '✅' },
];

const DIFFICULTY_COLORS = {
  Easy: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', strip: 'bg-green-500' },
  Medium: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', strip: 'bg-blue-500' },
  Hard: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', strip: 'bg-orange-500' },
  Super: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', strip: 'bg-purple-500' },
};

const CATEGORY_ICONS = {
  Flips: '🤸', Jump: '🤾‍♂️', Kicks: '🥋', Leap: '🐆', Swings: '🦧',
  Vaults: '🧗', Gymnastics: '🤸',
};

const CATEGORY_ICON_COMPONENTS = {
  Flips: GiAcrobatic,
  Jump: GiJumpAcross,
  Kicks: GiHighKick,
  Leap: GiLeapfrog,
  Swings: GiMuscleUp,
  Vaults: GiRunningNinja,
  Gymnastics: MdSportsGymnastics,
};

function CategoryIcon({ category, size = 22, className = '' }) {
  const Icon = CATEGORY_ICON_COMPONENTS[category];
  if (!Icon) return <span>{CATEGORY_ICONS[category]}</span>;
  return <Icon size={size} className={className} />;
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
  { id: 34, name: 'Twist Cart', difficulty: 'Hard', category: 'Kicks' },
  { id: 35, name: 'Atwist Gumbi', difficulty: 'Hard', category: 'Kicks' },
  { id: 36, name: 'Kick the Moon', difficulty: 'Medium', category: 'Kicks' },
  { id: 37, name: 'Turtle walk', difficulty: 'Medium', category: 'Kicks' },
  { id: 38, name: 'Coin Drop', difficulty: 'Medium', category: 'Kicks' },
  { id: 39, name: 'Helicoptero', difficulty: 'Medium', category: 'Kicks' },
  { id: 40, name: 'Windmill', difficulty: 'Medium', category: 'Kicks' },
  { id: 41, name: 'Flare', difficulty: 'Medium', category: 'Kicks' },
  { id: 42, name: 'Butterfly', difficulty: 'Medium', category: 'Kicks' },
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
// MAIN APP
// =================================================================
function MainApp({ user }) {
  const [activeTab, setActiveTab] = useState('home');
  const [trainingSection, setTrainingSection] = useState('goals');
  const [profileIsAdmin, setProfileIsAdmin] = useState(false);
  const userIsAdmin = isAdmin(user.email) || profileIsAdmin;
  const [tricks, setTricks] = useState([]);
  const [trainingDays, setTrainingDays] = useState([]);
  const [journal, setJournal] = useState([]);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [completedWarmups, setCompletedWarmups] = useState({});
  const [completedConditioning, setCompletedConditioning] = useState({});
  const [globalVideos, setGlobalVideos] = useState({});
  const [selectedTrick, setSelectedTrick] = useState(null);
  const [autoplayVideoUrl, setAutoplayVideoUrl] = useState(null);
  const openTrick = (trick, videoUrl = null) => { setSelectedTrick(trick); setAutoplayVideoUrl(videoUrl); };
  const closeTrick = () => { setSelectedTrick(null); setAutoplayVideoUrl(null); };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [celebrationTrick, setCelebrationTrick] = useState(null);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [tricksData, daysData, journalData, goalsData, warmupsData, conditioningData] =
          await Promise.all([
            loadUserData(user.uid, 'tricks'),
            loadUserData(user.uid, 'trainingDays'),
            loadUserData(user.uid, 'journal'),
            loadUserData(user.uid, 'weeklyGoals'),
            loadUserData(user.uid, 'completedWarmups'),
            loadUserData(user.uid, 'completedConditioning'),
          ]);

        // Load global trick overrides set by admin
        let globalOverrides = {};
        try {
          const overridesSnap = await getDoc(doc(db, 'globalConfig', 'tricks'));
          if (overridesSnap.exists()) {
            const data = overridesSnap.data();
            globalOverrides = data.overrides || {};
            setGlobalVideos(data.globalVideos || {});
          }
        } catch (e) { console.error('Global overrides load error', e); }

        // Load own profile to pick up any dynamic admin grant
        try {
          const profileSnap = await getDoc(doc(db, 'userProfiles', user.uid));
          if (profileSnap.exists() && profileSnap.data().isAdmin === true) setProfileIsAdmin(true);
        } catch (e) { console.error('Profile load error', e); }

        const applyOverrides = (t) => {
          const OLD_GYM = ['Trampoline', 'Tumbling', 'Floor'];
          const base = OLD_GYM.includes(t.category) ? { ...t, category: 'Gymnastics' } : t;
          const override = globalOverrides[String(base.id)];
          return override ? { ...base, ...override } : base;
        };

        if (tricksData) {
          const migrated = tricksData.map(applyOverrides);
          const changed = migrated.some((t, i) => t.category !== tricksData[i].category);
          setTricks(migrated);
          if (changed) await saveUserData(user.uid, 'tricks', migrated);
        } else {
          const initial = INITIAL_TRICKS.map(t => applyOverrides({ ...t, status: 'not_started', videos: [], notes: '' }));
          setTricks(initial);
          await saveUserData(user.uid, 'tricks', initial);
        }
        if (daysData) setTrainingDays(daysData);
        if (journalData) setJournal(journalData);
        if (goalsData) setWeeklyGoals(goalsData);
        if (warmupsData) setCompletedWarmups(warmupsData);
        if (conditioningData) setCompletedConditioning(conditioningData);
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

  const updateTrickStatus = (id, status) => {
    const oldTrick = tricks.find(t => t.id === id);
    const newTricks = tricks.map(t => t.id === id ? { ...t, status } : t);
    saveTricks(newTricks);
    if (status === 'yes_i_can' && oldTrick?.status !== 'yes_i_can') {
      setCelebrationTrick(oldTrick);
      setTimeout(() => setCelebrationTrick(null), 2500);
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
  const displayTricks = useMemo(() => tricks.map(t => {
    const personals = (t.videos || []).map(v => ({ ...v, _global: false }));
    const globals = (globalVideos[String(t.id)] || []).map(v => ({ ...v, _global: true }));
    return { ...t, videos: [...personals, ...globals] };
  }), [tricks, globalVideos]);

  const addTrick = (trick) => {
    const newTrick = { ...trick, id: Date.now(), status: 'not_started', videos: [], notes: '' };
    saveTricks([...tricks, newTrick]);
  };

  const logTrainingDay = () => {
    const today = new Date().toISOString().split('T')[0];
    if (!trainingDays.includes(today)) saveTrainingDays([...trainingDays, today]);
  };

  const calculateStreak = () => {
    if (trainingDays.length === 0) return 0;
    const sorted = [...trainingDays].sort().reverse();
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

  const streak = calculateStreak();
  const mastered = tricks.filter(t => t.status === 'yes_i_can').length;
  const inProgress = tricks.filter(t => t.status !== 'not_started' && t.status !== 'yes_i_can').length;

  const stats = {
    mastered, streak,
    easyMastered: tricks.filter(t => t.status === 'yes_i_can' && t.difficulty === 'Easy').length,
    mediumMastered: tricks.filter(t => t.status === 'yes_i_can' && t.difficulty === 'Medium').length,
    hardMastered: tricks.filter(t => t.status === 'yes_i_can' && t.difficulty === 'Hard').length,
    superMastered: tricks.filter(t => t.status === 'yes_i_can' && t.difficulty === 'Super').length,
    vaultMastered: tricks.filter(t => t.status === 'yes_i_can' && t.category === 'Vaults').length,
    flipMastered: tricks.filter(t => t.status === 'yes_i_can' && t.category === 'Flips').length,
  };

  const earnedBadges = BADGES.filter(b => b.check(stats));

  const inProgressTricks = tricks.filter(t => t.status !== 'yes_i_can' && t.status !== 'not_started');
  const notStartedEasy = tricks.filter(t => t.status === 'not_started' && t.difficulty === 'Easy');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white pb-24">
      {celebrationTrick && (
        <div className="fixed inset-x-0 top-0 bottom-20 z-40 flex items-center justify-center bg-black/70 pointer-events-none animate-pulse">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">🏆</div>
            <div className="text-4xl font-black text-yellow-400 mb-2">LEVEL UP!</div>
            <div className="text-2xl text-white font-bold">{celebrationTrick.name}</div>
            <div className="text-xl text-green-400 mt-2">Yes I can! ✅</div>
          </div>
        </div>
      )}

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
          <HomeTab stats={stats} streak={streak} mastered={mastered} inProgress={inProgress}
            total={tricks.length} tricksOfTheDay={weeklyFocus} onOpenTrick={openTrick}
            earnedBadges={earnedBadges} onLogTraining={logTrainingDay}
            hasTrainedToday={trainingDays.includes(new Date().toISOString().split('T')[0])}
            setActiveTab={setActiveTab}
            goToWarmup={() => { setTrainingSection('warmup'); setActiveTab('training'); }}
            goToStrength={() => { setTrainingSection('conditioning'); setActiveTab('training'); }} />
        )}
        {activeTab === 'tricks' && (
          <TricksTab tricks={displayTricks} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterDifficulty={filterDifficulty} setFilterDifficulty={setFilterDifficulty}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            onOpenTrick={openTrick}
            onAddNew={() => setActiveTab('add')} />
        )}
        {activeTab === 'training' && (
          <TrainingTab weeklyGoals={weeklyGoals} saveGoals={saveGoals} tricks={tricks}
            completedWarmups={completedWarmups} saveWarmups={saveWarmups}
            completedConditioning={completedConditioning} saveConditioning={saveConditioning}
            journal={journal} saveJournal={saveJournal} onOpenTrick={openTrick}
            section={trainingSection} setSection={setTrainingSection} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab stats={stats} tricks={tricks} earnedBadges={earnedBadges} trainingDays={trainingDays} />
        )}
        {activeTab === 'skilltree' && (
          <SkillTreeTab tricks={tricks} onOpenTrick={openTrick} />
        )}
        {activeTab === 'add' && (
          <AddTab onAddTrick={addTrick} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'admin' && userIsAdmin && (
         <AdminTab currentUserUid={user.uid} />
        )}
      </div>

      {showReleaseNotes && <ReleaseNotesModal onClose={() => setShowReleaseNotes(false)} />}

      {selectedTrick && (
        <TrickDetailModal trick={displayTricks.find(t => t.id === selectedTrick.id) || selectedTrick}
          autoplayUrl={autoplayVideoUrl}
          isAdmin={userIsAdmin}
          onClose={closeTrick} onUpdateStatus={updateTrickStatus}
          onUpdateVideos={updateTrickVideos} onUpdateGlobalVideos={updateGlobalVideos}
          onUpdateNotes={updateTrickNotes} />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-purple-500/20 z-50">
        <div className="flex justify-around items-center py-2 px-2 max-w-2xl mx-auto">
          <NavButton icon={Home} label="Home" active={activeTab === 'home'} onClick={() => { closeTrick(); setActiveTab('home'); }} />
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

function ReleaseNotesModal({ onClose }) {
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

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-1 py-2 rounded-xl transition-all ${active ? 'text-orange-400 scale-110' : 'text-slate-400 hover:text-white'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-[10px] font-semibold truncate max-w-full">{label}</span>
    </button>
  );
}

function HomeTab({ stats, streak, mastered, inProgress, total, tricksOfTheDay, onOpenTrick, earnedBadges, onLogTraining, hasTrainedToday, setActiveTab, goToWarmup, goToStrength }) {
  const progressPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-3xl p-6 shadow-2xl shadow-orange-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white/80 text-sm font-semibold uppercase tracking-wide">Current streak</div>
            <div className="flex items-baseline gap-2 mt-1"><span className="text-6xl font-black">{streak}</span><span className="text-xl font-bold">days</span></div>
            <div className="text-white/90 text-sm mt-2">{streak === 0 ? "Let's start today! 💪" : streak < 3 ? "Keep it going! 🔥" : streak < 7 ? "You're on fire! 🚀" : "Unstoppable! 👑"}</div>
          </div>
          <div className="text-7xl">🔥</div>
        </div>
        <button onClick={onLogTraining} disabled={hasTrainedToday} className={`mt-4 w-full py-3 rounded-xl font-bold transition ${hasTrainedToday ? 'bg-white/20 text-white/70 cursor-not-allowed' : 'bg-white text-orange-600 hover:scale-[1.02] active:scale-95 shadow-lg'}`}>
          {hasTrainedToday ? '✅ Trained today!' : '💪 Log training today'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Mastered" value={mastered} icon="🏆" color="from-green-500 to-emerald-600" />
        <StatCard label="Training" value={inProgress} icon="💪" color="from-blue-500 to-cyan-600" />
        <StatCard label="Progress" value={`${progressPct}%`} icon="📈" color="from-purple-500 to-pink-600" />
      </div>
      {tricksOfTheDay.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur border border-purple-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><Target className="w-5 h-5 text-purple-400" /><h2 className="font-bold text-lg">This Week's Focus</h2></div>
          <div className="space-y-2">
            {tricksOfTheDay.map((trick, idx) => (
              <button key={trick.id} onClick={() => onOpenTrick(trick)} className="w-full text-left bg-gradient-to-br from-purple-600/40 to-pink-600/40 border border-purple-400/50 rounded-xl p-4 hover:scale-[1.02] active:scale-95 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-lg">{idx + 1}</div>
                    <div>
                      <div className="flex items-center gap-2"><CategoryIcon category={trick.category} size={22} className="text-white/80 flex-shrink-0" /><span className="font-black text-lg">{trick.name}</span></div>
                      <div className="flex items-center gap-2 mt-1"><span className={`text-xs font-bold px-2 py-0.5 rounded ${DIFFICULTY_COLORS[trick.difficulty].bg} ${DIFFICULTY_COLORS[trick.difficulty].text}`}>{trick.difficulty}</span><span className="text-xs text-slate-300">{trick.category}</span></div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {earnedBadges.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur border border-yellow-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Award className="w-5 h-5 text-yellow-400" /><h2 className="font-bold text-lg">Achievements</h2></div>
            <button onClick={() => setActiveTab('progress')} className="text-sm text-yellow-400 font-semibold">See all →</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {earnedBadges.slice(-5).map(b => (
              <div key={b.id} className="flex-shrink-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-3 min-w-[110px]">
                <div className="text-3xl mb-1">{b.icon}</div>
                <div className="text-xs font-bold text-yellow-300 leading-tight">{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink label="Warm Up" icon="🔥" onClick={goToWarmup} color="from-red-500/30 to-orange-500/30" />
        <QuickLink label="Strength" icon="💪" onClick={goToStrength} color="from-blue-500/30 to-purple-500/30" />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-center shadow-lg`}>
      <div className="text-2xl mb-1">{icon}</div><div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-semibold text-white/80 uppercase">{label}</div>
    </div>
  );
}

function QuickLink({ label, icon, onClick, color }) {
  return (
    <button onClick={onClick} className={`bg-gradient-to-br ${color} border border-white/10 rounded-2xl p-4 text-left hover:scale-[1.02] active:scale-95 transition`}>
      <div className="text-3xl mb-2">{icon}</div><div className="font-bold">{label}</div>
    </button>
  );
}

function TricksTab({ tricks, searchQuery, setSearchQuery, filterCategory, setFilterCategory, filterDifficulty, setFilterDifficulty, filterStatus, setFilterStatus, onOpenTrick, onAddNew }) {
  const categories = ['all', ...new Set(tricks.map(t => t.category))];
  const difficulties = ['all', 'Easy', 'Medium', 'Hard', 'Super'];
  const statuses = ['all', ...STATUS_LEVELS.map(s => s.id)];
  const filtered = tricks.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });
  const grouped = filtered.reduce((acc, t) => { if (!acc[t.category]) acc[t.category] = []; acc[t.category].push(t); return acc; }, {});
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
      <div className="space-y-2">
        <FilterRow label="Category" options={categories} selected={filterCategory} onChange={setFilterCategory} />
        <FilterRow label="Difficulty" options={difficulties} selected={filterDifficulty} onChange={setFilterDifficulty} />
        <FilterRow label="Status" options={statuses} selected={filterStatus} onChange={setFilterStatus} labelMap={(opt) => opt === 'all' ? 'All' : STATUS_LEVELS.find(s => s.id === opt)?.label || opt} />
      </div>
      <div className="text-sm text-slate-400">{filtered.length} tricks</div>
      {sortedCategories.map(cat => {
        const isGymnastics = GYMNASTICS_CATEGORIES.includes(cat);
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2 mt-4">
              <CategoryIcon category={cat} size={28} className="text-slate-200" />
              <h3 className={`font-black text-lg uppercase tracking-wide ${isGymnastics ? 'text-cyan-300' : 'text-slate-200'}`}>{cat}</h3>
              <span className="text-sm text-slate-500">({grouped[cat].length})</span>
              {isGymnastics && <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Gymnastics</span>}
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
  const tutorialVideo = trick.videos?.find(v => v.type === 'tutorial' && v.primary)
    || trick.videos?.find(v => v.type === 'tutorial');
  const referenceVideo = trick.videos?.find(v => v.type !== 'tutorial' && v.primary)
    || trick.videos?.find(v => v.type !== 'tutorial');
  const playVideo = (e, video) => { e.stopPropagation(); if (video?.url) onOpen(normalizeUrl(video.url)); };
  const openCard = () => onOpen();
  return (
    <div className={`w-full border rounded-xl p-3 flex items-center gap-2 text-left transition ${isGymnastics ? 'bg-cyan-900/30 hover:bg-cyan-900/50 border-cyan-500/30' : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700'}`}>
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
        <button onClick={(e) => playVideo(e, referenceVideo)} className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 flex items-center justify-center transition" title={`📹 ${referenceVideo.label}`}>
          <span className="text-base">📹</span>
        </button>
      )}
      {tutorialVideo && (
        <button onClick={(e) => playVideo(e, tutorialVideo)} className="flex-shrink-0 w-9 h-9 rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 flex items-center justify-center transition" title={`🎓 ${tutorialVideo.label}`}>
          <span className="text-base">🎓</span>
        </button>
      )}
      <button onClick={openCard} className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.color} ${status.textColor}`}>{status.emoji}</button>
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

function TrickDetailModal({ trick, autoplayUrl, isAdmin, onClose, onUpdateStatus, onUpdateVideos, onUpdateGlobalVideos, onUpdateNotes }) {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoLabel, setNewVideoLabel] = useState('');
  const [newVideoType, setNewVideoType] = useState('reference');
  const [newVideoGlobal, setNewVideoGlobal] = useState(false);
  const [notesInput, setNotesInput] = useState(trick.notes || '');
  const autoplayRef = React.useRef(null);
  const diff = DIFFICULTY_COLORS[trick.difficulty];
  const allVideos = trick.videos || [];
  const personalVideos = allVideos.filter(v => !v._global);
  const globalList = allVideos.filter(v => v._global).map(({ _global, ...rest }) => rest);
  const stripFlag = ({ _global, ...rest }) => rest;
  const tutorialVideos = allVideos.filter(v => v.type === 'tutorial');
  const referenceVideos = allVideos.filter(v => v.type !== 'tutorial');
  const isAutoplayVideo = (v) => autoplayUrl && normalizeUrl(v.url) === autoplayUrl;
  useEffect(() => {
    if (autoplayUrl && autoplayRef.current) {
      autoplayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoplayUrl]);
  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    const url = normalizeUrl(newVideoUrl.trim());
    const newEntry = { url, label: newVideoLabel.trim() || (newVideoType === 'tutorial' ? 'Tutorial' : 'Video'), type: newVideoType };
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
          <div className="text-2xl font-black">{trick.name}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${diff.bg} ${diff.text} border ${diff.border}`}>{trick.difficulty}</span>
            <span className="text-xs text-slate-300">{trick.category}</span>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Progress</div>
            <div className="space-y-2">
              {STATUS_LEVELS.map(s => (
                <button key={s.id} onClick={() => onUpdateStatus(trick.id, s.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${trick.status === s.id ? `${s.color} border-white/40` : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                  <span className="text-2xl">{s.emoji}</span>
                  <span className={`font-bold ${trick.status === s.id ? 'text-white' : 'text-slate-300'}`}>{s.label}</span>
                  {trick.status === s.id && <Check className="ml-auto w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Add a video</div>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setNewVideoType('tutorial')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${newVideoType === 'tutorial' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'}`}>🎓 Tutorial</button>
              <button onClick={() => setNewVideoType('reference')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${newVideoType === 'reference' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'}`}>📹 Reference</button>
            </div>
            <input type="text" value={newVideoLabel} onChange={(e) => setNewVideoLabel(e.target.value)} placeholder={newVideoType === 'tutorial' ? 'Label (e.g. How to Backflip by Storror)' : 'Label (e.g. Sick line by Jason Paul)'} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2" />
            <div className="flex gap-2">
              <input type="url" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="YouTube or Instagram URL" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
              <button onClick={addVideo} className="px-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-sm">Add</button>
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 mt-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={newVideoGlobal} onChange={(e) => setNewVideoGlobal(e.target.checked)} className="accent-purple-500" />
                <span>🌐 Share with everyone (global)</span>
              </label>
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

function TrainingTab({ weeklyGoals, saveGoals, tricks, completedWarmups, saveWarmups, completedConditioning, saveConditioning, journal, saveJournal, onOpenTrick, section, setSection }) {
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
    tricks.filter(t => t.status === 'training_like_hell').slice(0, 2).forEach(t => tryAdd(t, 'Almost mastered — one more push!', '🎯', 1));
    tricks.filter(t => t.status === 'soft_landing').slice(0, 2).forEach(t => tryAdd(t, 'Keep building confidence on soft surface', '🛬', 2));
    tricks.filter(t => t.status === 'trampoline_landing').slice(0, 2).forEach(t => tryAdd(t, 'Got it on trampoline — try soft mat next', '🤾', 3));
    tricks.filter(t => t.status === 'training_hard').slice(0, 2).forEach(t => tryAdd(t, 'Already training — stay consistent', '💪', 4));
    const categories = [...new Set(tricks.map(t => t.category))];
    const categoryProgress = categories.map(cat => {
      const catTricks = tricks.filter(t => t.category === cat);
      const mastered = catTricks.filter(t => t.status === 'yes_i_can').length;
      return { cat, pct: catTricks.length > 0 ? mastered / catTricks.length : 0, tricks: catTricks };
    }).sort((a, b) => a.pct - b.pct);
    for (const weakCat of categoryProgress.slice(0, 2)) {
      const easy = weakCat.tricks.find(t => t.status === 'not_started' && t.difficulty === 'Easy');
      if (easy) tryAdd(easy, `Strengthen weak area: ${weakCat.cat}`, '⚖️', 5);
    }
    const masteredEasy = tricks.filter(t => t.status === 'yes_i_can' && t.difficulty === 'Easy');
    const masteredCats = [...new Set(masteredEasy.map(t => t.category))];
    for (const cat of masteredCats) {
      if (masteredEasy.filter(t => t.category === cat).length >= 2) {
        const next = tricks.find(t => t.category === cat && t.difficulty === 'Medium' && t.status === 'not_started');
        if (next) tryAdd(next, `Ready to level up your ${cat}!`, '🚀', 6);
      }
    }
    if (suggestions.length < 3) {
      const fallback = tricks.filter(t => t.status === 'not_started' && (t.difficulty === 'Easy' || t.difficulty === 'Medium'));
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
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[{id:'goals',label:'Weekly Goals',icon:'🎯'},{id:'warmup',label:'Warm Up',icon:'🔥'},{id:'conditioning',label:'Strength',icon:'💪'},{id:'journal',label:'Journal',icon:'📝'},{id:'history',label:'History',icon:'📅'}].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition ${section === s.id ? 'bg-purple-500' : 'bg-slate-800 text-slate-300'}`}>
            <span className="mr-1">{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {section === 'goals' && (
        <div className="space-y-3">
          {suggestions.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1"><Zap className="w-5 h-5 text-yellow-400" /><div className="font-bold">Suggested for this week</div></div>
              <div className="text-sm text-slate-400 mb-3">Smart picks based on your progress</div>
              <div className="space-y-2">
                {suggestions.map(s => {
                  const inGoals = weeklyGoals.some(g => g.trickId === s.trick.id);
                  return (
                    <div key={s.trick.id} className="flex items-center gap-2 bg-slate-800/80 rounded-lg p-3">
                      <button onClick={() => onOpenTrick(s.trick)} className="flex-1 text-left">
                        <div className="flex items-center gap-2"><span className="text-lg">{s.icon}</span><CategoryIcon category={s.trick.category} size={16} className="text-slate-300 flex-shrink-0" /><span className="font-bold text-sm">{s.trick.name}</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[s.trick.difficulty].bg} ${DIFFICULTY_COLORS[s.trick.difficulty].text}`}>{s.trick.difficulty}</span></div>
                        <div className="text-xs text-yellow-300/90 mt-1 ml-7">{s.reason}</div>
                      </button>
                      <button onClick={() => addSuggestion(s.trick.id)} disabled={inGoals} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${inGoals ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'}`}>{inGoals ? '✓ Added' : '+ Add'}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bg-slate-800/50 border border-purple-500/30 rounded-2xl p-4">
            <div className="font-bold mb-2">This week's focus</div>
            <div className="text-sm text-slate-400 mb-3">Pick up to 3-5 tricks to focus on</div>
            <div className="space-y-2 mb-3">
              {weeklyGoals.length === 0 && <div className="text-sm text-slate-500 text-center py-4">No goals yet. Pick some tricks to focus on!</div>}
              {weeklyGoals.map(g => {
                const trick = tricks.find(t => t.id === g.trickId); if (!trick) return null;
                const status = STATUS_LEVELS.find(s => s.id === trick.status);
                return (
                  <div key={g.trickId} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                    <button onClick={() => onOpenTrick(trick)} className="flex-1 text-left flex items-center gap-2"><CategoryIcon category={trick.category} size={18} className="text-slate-300 flex-shrink-0" /><span className="font-semibold text-sm">{trick.name}</span><span className="ml-auto text-lg">{status.emoji}</span></button>
                    <button onClick={() => removeGoal(g.trickId)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <select value={newGoalTrickId} onChange={(e) => setNewGoalTrickId(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Select a trick...</option>
                {tricks.filter(t => t.status !== 'yes_i_can' && !weeklyGoals.some(g => g.trickId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name} ({t.difficulty})</option>)}
              </select>
              <button onClick={addGoal} className="px-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-sm">Add</button>
            </div>
          </div>
        </div>
      )}

      {section === 'warmup' && (
        <div className="space-y-3">
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

      {section === 'journal' && (
        <div className="space-y-3">
          <div className="bg-slate-800/50 border border-green-500/30 rounded-2xl p-4">
            <div className="font-bold mb-2">Training journal</div>
            <textarea value={newJournalEntry} onChange={(e) => setNewJournalEntry(e.target.value)} placeholder="How did today's session go? What did you work on?" rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none mb-2" />
            <button onClick={addJournalEntry} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-sm">Save entry</button>
          </div>
          <div className="space-y-2">
            {safeJournal.length === 0 && <div className="text-center text-slate-500 py-8">No entries yet.</div>}
            {safeJournal.map(j => (
              <div key={j.timestamp} className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1"><div className="text-xs font-semibold text-slate-400">{j.date}</div><button onClick={() => deleteJournalEntry(j.timestamp)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button></div>
                <div className="text-sm whitespace-pre-wrap">{j.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center"><div className="text-5xl mb-3">📅</div><div className="font-bold mb-1">No training history yet</div><div className="text-sm text-slate-400">Complete warm-ups, strength exercises, or journal entries.</div></div>}
          {history.map(week => {
            const isExpanded = expandedWeek === week.weekStart;
            const totalW = Object.values(week.warmups).reduce((s, a) => s + a.length, 0);
            const totalC = Object.values(week.conditioning).reduce((s, a) => s + a.length, 0);
            return (
              <div key={week.weekStart} className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedWeek(isExpanded ? null : week.weekStart)} className="w-full p-4 text-left hover:bg-slate-800 transition">
                  <div className="flex items-center justify-between">
                    <div><div className="font-bold">{week.range}</div><div className="text-xs text-slate-400 mt-1">{week.days.length} training {week.days.length === 1 ? 'day' : 'days'}</div></div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 text-xs">
                        {totalW > 0 && <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded font-semibold">🔥 {totalW}</span>}
                        {totalC > 0 && <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded font-semibold">💪 {totalC}</span>}
                        {week.journal.length > 0 && <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded font-semibold">📝 {week.journal.length}</span>}
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-400 transition ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-700">
                    {week.days.map(date => {
                      const wIds = week.warmups[date] || [], cIds = week.conditioning[date] || [];
                      const dj = week.journal.filter(j => j.date === date);
                      const label = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                      return (
                        <div key={date} className="bg-slate-900/50 rounded-xl p-3 mt-3">
                          <div className="font-bold text-sm text-purple-300 mb-2">{label}</div>
                          {wIds.length > 0 && <div className="mb-2"><div className="text-xs font-bold text-orange-400 mb-1">🔥 Warm-ups ({wIds.length})</div><div className="flex flex-wrap gap-1">{wIds.map(id => { const w = WARMUPS.find(x => x.id === id); return w ? <span key={id} className="text-xs bg-orange-500/10 text-orange-200 px-2 py-1 rounded">{w.name}</span> : null; })}</div></div>}
                          {cIds.length > 0 && <div className="mb-2"><div className="text-xs font-bold text-blue-400 mb-1">💪 Strength ({cIds.length})</div><div className="flex flex-wrap gap-1">{cIds.map(id => { const c = CONDITIONING.find(x => x.id === id); return c ? <span key={id} className="text-xs bg-blue-500/10 text-blue-200 px-2 py-1 rounded">{c.name} · {c.reps}</span> : null; })}</div></div>}
                          {dj.length > 0 && <div><div className="text-xs font-bold text-green-400 mb-1">📝 Journal</div>{dj.map(j => <div key={j.timestamp} className="text-xs bg-green-500/10 text-green-100 p-2 rounded whitespace-pre-wrap">{j.text}</div>)}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgressTab({ stats, tricks, earnedBadges, trainingDays }) {
  const categories = [...new Set(tricks.map(t => t.category))];
  const categoryStats = categories.map(cat => {
    const ct = tricks.filter(t => t.category === cat);
    const m = ct.filter(t => t.status === 'yes_i_can').length;
    return { cat, mastered: m, total: ct.length, pct: ct.length > 0 ? (m / ct.length) * 100 : 0 };
  });
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-4"><div className="text-sm text-green-300 font-semibold">Total mastered</div><div className="text-4xl font-black">{stats.mastered}</div><div className="text-xs text-slate-400">out of {tricks.length} tricks</div></div>
        <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-4"><div className="text-sm text-orange-300 font-semibold">Training days</div><div className="text-4xl font-black">{trainingDays.length}</div><div className="text-xs text-slate-400">total logged</div></div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> By Difficulty</div>
        <div className="space-y-2">
          {[{label:'Easy',count:stats.easyMastered,total:tricks.filter(t=>t.difficulty==='Easy').length,color:'bg-green-500'},{label:'Medium',count:stats.mediumMastered,total:tricks.filter(t=>t.difficulty==='Medium').length,color:'bg-blue-500'},{label:'Hard',count:stats.hardMastered,total:tricks.filter(t=>t.difficulty==='Hard').length,color:'bg-orange-500'},{label:'Super',count:stats.superMastered,total:tricks.filter(t=>t.difficulty==='Super').length,color:'bg-purple-500'}].map(d => (
            <div key={d.label}>
              <div className="flex items-center justify-between text-sm mb-1"><span className="font-semibold">{d.label}</span><span className="text-slate-400">{d.count}/{d.total}</span></div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full ${d.color} transition-all duration-500`} style={{ width: `${d.total > 0 ? (d.count / d.total) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="font-bold mb-3">By Category</div>
        <div className="space-y-2">
          {categoryStats.map(c => (
            <div key={c.cat}>
              <div className="flex items-center justify-between text-sm mb-1"><span className="font-semibold flex items-center gap-1.5"><CategoryIcon category={c.cat} size={16} className="text-slate-300" />{c.cat}</span><span className="text-slate-400">{c.mastered}/{c.total}</span></div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${c.pct}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-yellow-500/30 rounded-2xl p-4">
        <div className="font-bold mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Achievements ({earnedBadges.length}/{BADGES.length})</div>
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
      </div>
    </div>
  );
}

function SkillTreeTab({ tricks, onOpenTrick }) {
  const TIERS = ['Easy', 'Medium', 'Hard', 'Super'];
  const allCategories = [...new Set(tricks.map(t => t.category))].sort((a, b) => {
    if (a === 'Gymnastics') return 1;
    if (b === 'Gymnastics') return -1;
    return a.localeCompare(b);
  });
  const [selectedCategory, setSelectedCategory] = useState(allCategories[0] || 'Flips');

  const inCategory = tricks.filter(t => t.category === selectedCategory);
  const totalMastered = inCategory.filter(t => t.status === 'yes_i_can').length;

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
              <CategoryIcon category={c} size={16} />{c}
            </button>
          ))}
        </div>
      </div>

      {inCategory.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-5xl mb-2">🌱</div>
          <div>No tricks in this category yet.</div>
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-400 text-center">
            <span className="font-bold text-white">{totalMastered}</span> / {inCategory.length} mastered in {selectedCategory}
          </div>

          <div className="space-y-2">
            {TIERS.map((tier, idx) => {
              const tricksAtTier = inCategory.filter(t => t.difficulty === tier);
              if (tricksAtTier.length === 0) return null;
              const masteredCount = tricksAtTier.filter(t => t.status === 'yes_i_can').length;
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
                        const mastered = t.status === 'yes_i_can';
                        const inProgress = t.status && t.status !== 'not_started' && !mastered;
                        return (
                          <button
                            key={t.id}
                            onClick={() => onOpenTrick(t)}
                            className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition border ${
                              mastered
                                ? 'bg-green-500/10 border-green-500/40 hover:bg-green-500/20'
                                : inProgress
                                  ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                                  : 'bg-slate-900 border-transparent hover:bg-slate-800'
                            }`}
                          >
                            <span className="text-lg flex-shrink-0">{status.emoji}</span>
                            <CategoryIcon category={t.category} size={16} className="text-slate-300 flex-shrink-0" />
                            <span className="flex-1 truncate font-medium text-sm">{t.name}</span>
                            <span className={`text-xs flex-shrink-0 ${mastered ? 'text-green-300' : inProgress ? 'text-yellow-300' : 'text-slate-500'}`}>
                              {status.label}
                            </span>
                          </button>
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

function AddTab({ onAddTrick, setActiveTab }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Flips');
  const [difficulty, setDifficulty] = useState('Medium');
  const [added, setAdded] = useState(false);
  const categories = ['Flips', 'Jump', 'Kicks', 'Leap', 'Swings', 'Vaults', 'Gymnastics'];
  const difficulties = ['Easy', 'Medium', 'Hard', 'Super'];
  const submit = () => { if (!name.trim()) return; onAddTrick({ name: name.trim(), category, difficulty }); setName(''); setAdded(true); setTimeout(() => setAdded(false), 2000); };
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-slate-800/50 border border-purple-500/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3"><Plus className="w-5 h-5 text-purple-400" /><h2 className="font-bold text-lg">Add a new trick</h2></div>
        <div className="space-y-3">
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
          <button onClick={submit} disabled={!name.trim()} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition">{added ? '✅ Added!' : 'Add trick'}</button>
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

function AdminTab({ currentUserUid }) {
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
        if (snap.exists()) setOverrides(snap.data().overrides || {});
      } catch (e) { console.error('Global overrides load error', e); }

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
    const mastered = userData.tricks.filter(t => t.status === 'yes_i_can').length;
    const inProgress = userData.tricks.filter(t => t.status !== 'not_started' && t.status !== 'yes_i_can').length;
    const notStarted = userData.tricks.filter(t => t.status === 'not_started').length;

    // Group tricks by status
    const byStatus = STATUS_LEVELS.map(level => ({
      ...level,
      tricks: userData.tricks.filter(t => t.status === level.id),
    }));

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

        {/* Tricks by status */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="font-bold mb-3">Tricks by Status</div>
          <div className="space-y-3">
            {byStatus.filter(s => s.tricks.length > 0).map(s => (
              <div key={s.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="font-bold text-sm">{s.label}</span>
                  <span className="text-xs text-slate-400">({s.tricks.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.tricks.map(t => (
                    <span key={t.id} className="text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700">
                      <CategoryIcon category={t.category} size={13} className="inline-block mr-1" /> {t.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {notStarted > 0 && (
              <div className="text-xs text-slate-500 italic">Not started: {notStarted} tricks</div>
            )}
          </div>
        </div>

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
                {['Flips', 'Jump', 'Kicks', 'Leap', 'Swings', 'Vaults', 'Gymnastics'].map(c => (
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
              const withEffective = INITIAL_TRICKS
                .map(t => ({ trick: t, effective: overrides[String(t.id)] ? { ...t, ...overrides[String(t.id)] } : t }))
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
            })().map(({ trick: t, effective }) => {
              const ov = overrides[String(t.id)];
              const col = DIFFICULTY_COLORS[effective.difficulty];
              return (
                <button key={t.id} onClick={() => startEdit(t)}
                  className="w-full flex items-center gap-2 bg-slate-900 hover:bg-slate-800 rounded-lg px-3 py-2 text-left transition text-sm">
                  <div className={`w-1.5 h-6 rounded-full ${col.strip} flex-shrink-0`} />
                  <CategoryIcon category={effective.category} size={15} className="flex-shrink-0 text-slate-400" />
                  <span className="flex-1 truncate font-medium">{effective.name}</span>
                  {ov && <span className="text-xs text-blue-400 flex-shrink-0">✏️</span>}
                  <span className={`text-xs font-semibold flex-shrink-0 ${col.text}`}>{effective.difficulty}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
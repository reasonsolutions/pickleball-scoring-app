// Fantasy data layer for the public CCPL site (/ccplfantasy).
// Mirrors the CCPL React Native app (FantasyHubScreen + firebaseService) so both
// clients read and write the same `fantasy-teams` / `fantasy-players` documents.
import {
  collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { db } from './firebase';
import { sendWhatsAppOTP } from '../services/whatsappOtpService';

export const FANTASY_BUDGET = 100; // credits
export const FANTASY_SQUAD = 10;   // slots
export const MAX_PER_TEAM = 2;
export const LEADERBOARD_MIN_TEAMS = 10; // hide standings until this many teams exist
export const MAX_MEN = 7;          // => at least 3 women in a full squad
export const DEADLINE_LEAD_MS = 10 * 60 * 1000; // lock 10 min before first match

// ── Helpers ──────────────────────────────────────────────────
const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  return null;
};

// Same normalisation as the app: UTC ISO date (YYYY-MM-DD)
const isoDay = (v) => {
  if (typeof v === 'string') return v.split('T')[0];
  const d = toDate(v);
  return d ? d.toISOString().split('T')[0] : null;
};

export const AUTH_EVENT = 'ccpl-auth-change';

// Log in against ccpl-users — accepts the app's `phone` field, the website's
// `phoneNumber` field, or email. Passwords are SHA-256 hex, same as both clients.
export async function loginCcplUser(identifier, password, remember) {
  const id = identifier.trim();
  const usersRef = collection(db, 'ccpl-users');
  let docs = [];
  if (id.includes('@')) {
    docs = (await getDocs(query(usersRef, where('email', '==', id.toLowerCase())))).docs;
  } else {
    const digits = id.replace(/\D/g, '');
    const last10 = digits.slice(-10);
    const candidates = [...new Set([id, digits, last10].filter(Boolean))];
    for (const field of ['phone', 'phoneNumber']) {
      const snap = await getDocs(query(usersRef, where(field, 'in', candidates)));
      if (!snap.empty) { docs = snap.docs; break; }
    }
  }
  if (!docs.length) throw new Error('No account found with this phone number or email.');

  const hashed = CryptoJS.SHA256(password).toString();
  const match = docs.find((d) => d.data().password === hashed);
  if (!match) throw new Error('Incorrect password. Please try again.');
  const data = match.data();
  if (data.verified === false) throw new Error('This account isn’t verified yet. Finish signing up in the CCPL app first.');

  // Never keep the password hash or OTP in browser storage
  const { password: _pw, otp: _otp, ...safe } = data;
  const user = { id: match.id, ...safe };
  const store = remember ? localStorage : sessionStorage;
  (remember ? sessionStorage : localStorage).removeItem('ccpl-user');
  store.setItem('ccpl-user', JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return user;
}

// ── Sign up (same flow as the CCPL app's AuthScreen) ─────────
// 1. create or refresh an unverified ccpl-users doc with a 4-digit OTP
// 2. send the OTP on WhatsApp
// 3. on a matching code, mark the doc verified and log the user in
const newOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

async function sendOtp(phone, otp) {
  const res = await sendWhatsAppOTP(phone, otp);
  if (!res.success) throw new Error('Could not send the WhatsApp code. Check the number and try again.');
}

export async function startSignup({ name, phone, email, password }) {
  const digits = phone.replace(/\D/g, '').slice(-10);
  const usersRef = collection(db, 'ccpl-users');
  const existing = await getDocs(query(usersRef, where('phone', 'in', [...new Set([digits, phone.trim()])])));
  const otp = newOtp();
  const hashed = CryptoJS.SHA256(password).toString();
  let userId;

  if (!existing.empty) {
    const d = existing.docs[0];
    if (d.data().verified) {
      throw new Error(d.data().type === 'player'
        ? 'This number already has an account from player registration. Log in with those details.'
        : 'This number is already registered. Log in instead.');
    }
    userId = d.id;
    await updateDoc(doc(db, 'ccpl-users', userId), {
      name, email, password: hashed, otp, otpCreatedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  } else {
    const ref = await addDoc(usersRef, {
      name, phone: digits, email, password: hashed, otp, otpCreatedAt: serverTimestamp(),
      verified: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    userId = ref.id;
  }

  await sendOtp(digits, otp);
  return { userId, otp, phone: digits };
}

export async function resendSignupOtp(userId, phone) {
  const otp = newOtp();
  await updateDoc(doc(db, 'ccpl-users', userId), { otp, otpCreatedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await sendOtp(phone, otp);
  return otp;
}

export async function completeSignup({ userId, name, phone, email }, remember) {
  await updateDoc(doc(db, 'ccpl-users', userId), {
    verified: true, otp: null, otpCreatedAt: null, updatedAt: serverTimestamp(),
  });
  const user = { id: userId, name, phone, email, verified: true };
  (remember ? sessionStorage : localStorage).removeItem('ccpl-user');
  (remember ? localStorage : sessionStorage).setItem('ccpl-user', JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return user;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('ccpl-user') || sessionStorage.getItem('ccpl-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Tournament / fixtures / teams ────────────────────────────
export async function getActiveTournamentId() {
  const snap = await getDoc(doc(db, 'app-settings', 'mobile-app'));
  return snap.exists() ? snap.data().activeTournamentId || null : null;
}

export async function getFixtures(tournamentId) {
  const snap = await getDocs(query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Each unique fixture date is a gameweek (identical to getGameweeksFromFixtures in the app)
export function gameweeksFromFixtures(fixtures) {
  const dates = new Set();
  fixtures.forEach((f) => {
    const day = isoDay(f.date);
    if (day) dates.add(day);
  });
  return [...dates].sort().map((date, i) => ({ gameweekNumber: i + 1, date }));
}

export function gameweekDeadline(fixtures, gwDate) {
  const gwFixtures = fixtures.filter((f) => isoDay(f.date) === gwDate);
  if (!gwFixtures.length) return null;
  gwFixtures.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  const first = gwFixtures[0];
  const start = new Date(`${gwDate}T${first.time || '00:00'}:00`);
  return new Date(start.getTime() - DEADLINE_LEAD_MS);
}

export async function getTournamentTeams(tournamentId) {
  const snap = await getDocs(query(collection(db, 'teams'), where('tournamentId', '==', tournamentId)));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name || 'Unknown Team', playerIds: d.data().playerIds || [] }));
}

// ── Players ──────────────────────────────────────────────────
const normGender = (g) => {
  const s = String(g || '').toLowerCase();
  return s === 'female' || s === 'w' || s === 'woman' ? 'w' : 'm';
};

const photoUrl = (photo) => {
  if (typeof photo === 'string') return photo;
  if (photo && typeof photo === 'object' && photo.url) return photo.url;
  return null;
};

export async function getFantasyPlayers(tournamentId, tournamentTeams = []) {
  const snap = await getDocs(collection(db, 'fantasy-players', tournamentId, 'players'));

  // Team lookup by player id (fallback when matches don't carry playerTeam)
  const teamByPlayer = {};
  tournamentTeams.forEach((t) => t.playerIds.forEach((pid) => { teamByPlayer[pid] = t.name; }));

  return Promise.all(snap.docs.map(async (d) => {
    const data = d.data();
    const matches = [...(data.matches || [])].sort((a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0));

    // Points per gameweek date
    const pointsByDate = {};
    matches.forEach((m) => {
      const day = isoDay(m.date);
      if (day && typeof m.date !== 'string') pointsByDate[day] = (pointsByDate[day] || 0) + (m.totalFantasyPoints || 0);
    });

    const total = data.fantasyPoints || 0;
    const played = data.matchesPlayed || matches.length || 0;
    const cost = data.cost !== undefined ? Number(data.cost) : Math.max(4, Math.min(11, +(total / 20).toFixed(1)));
    const latest = matches[matches.length - 1];
    const teamName = latest?.playerTeam || data.teamName || teamByPlayer[data.playerId] || teamByPlayer[d.id] || '';

    let gender = 'm';
    let photo = null;
    try {
      const p = await getDoc(doc(db, 'players', d.id));
      if (p.exists()) {
        gender = normGender(p.data().gender);
        photo = photoUrl(p.data().photo);
      }
    } catch { /* keep defaults */ }

    return {
      id: d.id,
      name: data.playerName || 'Unknown Player',
      teamId: teamName,
      total,
      cost,
      avg: played > 0 ? +(total / played).toFixed(1) : 0,
      played,
      won: data.matchesWon || 0,
      lost: data.matchesLost || 0,
      gender,
      photo,
      pointsByDate,
    };
  }));
}

export const CAPTAIN_MULTIPLIER = 2;
export const VICE_CAPTAIN_MULTIPLIER = 1.5;

// A player's points on a gameweek date, with the captain (2x) / vice-captain (1.5x)
// multiplier applied. Matches the admin recalculation in src/pages/Fantasy.jsx.
export function playerGameweekPoints(playerId, playersById, gwDate, captainId, viceCaptainId) {
  if (!gwDate) return 0;
  const base = playersById[playerId]?.pointsByDate?.[gwDate] || 0;
  if (playerId === captainId) return base * CAPTAIN_MULTIPLIER;
  if (playerId === viceCaptainId) return base * VICE_CAPTAIN_MULTIPLIER;
  return base;
}

// Squad total for a gameweek, captain multipliers included
export function gameweekPointsFor(playerIds, playersById, gwDate, captainId = null, viceCaptainId = null) {
  if (!gwDate) return 0;
  return playerIds.reduce((sum, id) => sum + playerGameweekPoints(id, playersById, gwDate, captainId, viceCaptainId), 0);
}

// ── Squad rules ──────────────────────────────────────────────
// Returns null if the player can be added, otherwise a reason string.
export function addBlockReason(player, squadIds, playersById) {
  if (squadIds.includes(player.id)) return null;
  if (squadIds.length >= FANTASY_SQUAD) return `Squad full — max ${FANTASY_SQUAD} players`;
  const spent = squadIds.reduce((s, id) => s + (playersById[id]?.cost || 0), 0);
  const remaining = FANTASY_BUDGET - spent;
  if (player.cost > remaining + 0.01) return `Not enough credits (${remaining.toFixed(1)} CR left)`;
  if (player.teamId) {
    const sameTeam = squadIds.filter((id) => playersById[id]?.teamId === player.teamId).length;
    if (sameTeam >= MAX_PER_TEAM) return `Max ${MAX_PER_TEAM} players from ${player.teamId}`;
  }
  if (player.gender === 'm') {
    const men = squadIds.filter((id) => playersById[id]?.gender === 'm').length;
    if (men >= MAX_MEN) return `Max ${MAX_MEN} men — pick at least ${FANTASY_SQUAD - MAX_MEN} women`;
  }
  return null;
}

// Full check of a finished squad, run right before it is saved.
// Returns null if the squad is valid, otherwise the first problem found.
export function squadError(squadIds, playersById) {
  const ids = [...new Set(squadIds)];
  if (ids.length !== squadIds.length) return 'The same player is in your squad twice';
  if (ids.length !== FANTASY_SQUAD) return `Your squad needs exactly ${FANTASY_SQUAD} players (you have ${ids.length})`;
  const missing = ids.filter((id) => !playersById[id]);
  if (missing.length) return 'Some players in your squad are no longer available — swap them out';
  const spent = ids.reduce((s, id) => s + (playersById[id].cost || 0), 0);
  if (spent > FANTASY_BUDGET + 0.01) return `Squad costs ${spent.toFixed(1)} CR — the budget is ${FANTASY_BUDGET} CR`;
  const perTeam = {};
  ids.forEach((id) => { const t = playersById[id].teamId; if (t) perTeam[t] = (perTeam[t] || 0) + 1; });
  const over = Object.entries(perTeam).find(([, n]) => n > MAX_PER_TEAM);
  if (over) return `Max ${MAX_PER_TEAM} players from ${over[0]}`;
  const men = ids.filter((id) => playersById[id].gender === 'm').length;
  if (men > MAX_MEN) return `Max ${MAX_MEN} men — pick at least ${FANTASY_SQUAD - MAX_MEN} women`;
  return null;
}

// ── Fantasy teams ────────────────────────────────────────────
const blankGameweeks = (gameweeks) => {
  const obj = {};
  gameweeks.forEach((gw) => {
    obj[gw.gameweekNumber] = { gameweekNumber: gw.gameweekNumber, gameweekDate: gw.date, playerIds: [], points: 0, locked: false };
  });
  return obj;
};

export async function getMyTeam(userId, tournamentId, gameweeks) {
  const snap = await getDocs(query(
    collection(db, 'fantasy-teams'),
    where('userId', '==', userId),
    where('tournamentId', '==', tournamentId),
  ));
  if (snap.empty) return null;
  const team = { id: snap.docs[0].id, ...snap.docs[0].data() };
  if (!team.gameweeks || Object.keys(team.gameweeks).length === 0) {
    team.gameweeks = blankGameweeks(gameweeks);
    await updateDoc(doc(db, 'fantasy-teams', team.id), { gameweeks: team.gameweeks, updatedAt: new Date() });
  }
  return team;
}

export async function createTeam({ userId, teamName, tournamentId, gameweeks }) {
  const now = new Date();
  const data = {
    userId,
    teamName,
    tournamentId,
    playerIds: [],
    totalPoints: 0,
    gameweeks: blankGameweeks(gameweeks),
    currentGameweek: 1,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, 'fantasy-teams'), data);
  return { id: ref.id, ...data };
}

export async function updateTeam(teamId, data) {
  await updateDoc(doc(db, 'fantasy-teams', teamId), { ...data, updatedAt: new Date() });
}

export async function getAllTeams(tournamentId) {
  const snap = await getDocs(query(collection(db, 'fantasy-teams'), where('tournamentId', '==', tournamentId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserNames(userIds) {
  const names = {};
  await Promise.all(userIds.map(async (id) => {
    try {
      const s = await getDoc(doc(db, 'ccpl-users', id));
      if (s.exists()) names[id] = s.data().name;
    } catch { /* ignore */ }
  }));
  return names;
}

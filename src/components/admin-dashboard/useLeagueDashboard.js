import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { getActiveTournamentId } from '../../services/ticketingService';
import { useAuth } from '../../contexts/AuthContext';
import { tournamentStatus, toDate } from './leagueData';

/**
 * Picks the dashboard's tournament: the team admin's own; otherwise the app's active tournament
 * (App Settings), falling back to the running one, then the most recent.
 */
async function resolveTournament({ teamAdmin, currentUser, getAllTournaments }) {
  if (teamAdmin) {
    if (!currentUser?.tournamentId) return null;
    const snap = await getDoc(doc(db, 'tournaments', currentUser.tournamentId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  const activeId = await getActiveTournamentId().catch(() => null);
  if (activeId) {
    const snap = await getDoc(doc(db, 'tournaments', activeId));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  }
  const all = await getAllTournaments();
  return all.find((t) => tournamentStatus(t) === 'active') || all[0] || null;
}

/** Loads everything the dashboard shows for one tournament. Passes load only for super admins. */
export default function useLeagueDashboard() {
  const { currentUser, isSuperAdmin, isTeamAdmin, getAllTournaments } = useAuth();
  const [state, setState] = useState({ loading: true, error: null });
  const superAdmin = isSuperAdmin();
  const teamAdmin = isTeamAdmin();

  useEffect(() => {
    if (!currentUser) return undefined;
    let alive = true;
    (async () => {
      try {
        const tournament = await resolveTournament({ teamAdmin, currentUser, getAllTournaments });
        if (!tournament) {
          if (alive) setState({ loading: false, error: null, tournament: null });
          return;
        }
        const byT = (name) => getDocs(query(collection(db, name), where('tournamentId', '==', tournament.id)));
        const [fx, pl, tm, md] = await Promise.all([
          byT('fixtures'),
          byT('players'),
          byT('teams'),
          superAdmin ? byT('ticketing') : Promise.resolve(null),
        ]);

        let matchDays = [];
        if (md) {
          matchDays = await Promise.all(
            md.docs.map(async (d) => {
              const passes = await getDocs(collection(db, 'ticketing', d.id, 'passes'));
              return { id: d.id, ...d.data(), passes: passes.docs.map((p) => p.data()) };
            })
          );
          matchDays.sort((a, b) => (toDate(a.date) || 0) - (toDate(b.date) || 0));
        }

        if (!alive) return;
        setState({
          loading: false,
          error: null,
          tournament,
          fixtures: fx.docs.map((d) => ({ id: d.id, ...d.data() })),
          players: pl.docs.map((d) => ({ id: d.id, ...d.data() })),
          teams: tm.docs.map((d) => ({ id: d.id, ...d.data() })),
          matchDays,
        });
      } catch (error) {
        console.error('Dashboard: failed to load data', error);
        if (alive) setState({ loading: false, error });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, superAdmin, teamAdmin]);

  return state;
}

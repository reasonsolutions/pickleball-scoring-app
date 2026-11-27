import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';

// Local calendar date key, same as the points recalculation in Fantasy.jsx
const toDateKey = (date) => {
  if (!date) return null;
  let d;
  if (date.seconds) d = new Date(date.seconds * 1000);
  else if (typeof date.toDate === 'function') d = date.toDate();
  else d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatDay = (key) => {
  if (!key) return '';
  const d = new Date(`${key}T00:00:00`);
  return isNaN(d.getTime()) ? key : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtPts = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

export default function FantasyTeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [owner, setOwner] = useState(null);
  const [tournamentName, setTournamentName] = useState('');
  const [playersById, setPlayersById] = useState({});
  const [teamByPlayer, setTeamByPlayer] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const teamSnap = await getDoc(doc(db, 'fantasy-teams', teamId));
        if (!teamSnap.exists()) {
          setTeam(null);
          return;
        }
        const teamData = { id: teamSnap.id, ...teamSnap.data() };
        setTeam(teamData);

        const tasks = [];

        if (teamData.userId) {
          tasks.push(getDoc(doc(db, 'ccpl-users', teamData.userId)).then((s) => {
            if (s.exists()) {
              const u = s.data();
              setOwner({ name: u.name || '', phone: u.phone || u.phoneNumber || '', email: u.email || '' });
            }
          }).catch(() => {}));
        }

        if (teamData.tournamentId) {
          tasks.push(getDoc(doc(db, 'tournaments', teamData.tournamentId)).then((s) => {
            if (s.exists()) setTournamentName(s.data().name || s.data().tournamentName || '');
          }).catch(() => {}));

          tasks.push(getDocs(collection(db, 'fantasy-players', teamData.tournamentId, 'players')).then((snap) => {
            const map = {};
            snap.docs.forEach((d) => {
              const data = d.data();
              map[d.id] = {
                id: d.id,
                name: data.playerName || 'Unknown Player',
                cost: data.cost,
                matches: data.matches || [],
              };
            });
            setPlayersById(map);
          }));

          tasks.push(getDocs(query(collection(db, 'teams'), where('tournamentId', '==', teamData.tournamentId))).then((snap) => {
            const map = {};
            snap.docs.forEach((d) => {
              const name = d.data().name || d.data().teamName || '';
              (d.data().playerIds || []).forEach((pid) => { map[pid] = name; });
            });
            setTeamByPlayer(map);
          }));
        }

        await Promise.all(tasks);
      } catch (error) {
        console.error('Error loading fantasy team:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId]);

  const gameweeks = Object.values(team?.gameweeks || {})
    .filter(Boolean)
    .sort((a, b) => (a.gameweekNumber || 0) - (b.gameweekNumber || 0));

  // A gameweek covers matches from its date up to (not including) the next gameweek's date
  const starts = [...new Set(gameweeks.map((g) => g.gameweekDate).filter(Boolean))].sort();
  const gameweekStartFor = (dateKey) => {
    let start = null;
    starts.forEach((s) => { if (s <= dateKey) start = s; });
    return start;
  };

  const playerGwPoints = (playerId, gw) => {
    const p = playersById[playerId];
    if (!p || !gw.gameweekDate) return 0;
    let pts = 0;
    p.matches.forEach((m) => {
      const key = toDateKey(m.date);
      if (key && gameweekStartFor(key) === gw.gameweekDate) pts += m.totalFantasyPoints || 0;
    });
    if (playerId === gw.captainId) return pts * 2;
    if (playerId === gw.viceCaptainId) return pts * 1.5;
    return pts;
  };

  const createdAt = toDate(team?.createdAt);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/admin/fantasy', { state: { tab: 'teams' } })}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to fantasy teams
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : !team ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team not found</h3>
              <p className="text-gray-600">This fantasy team doesn't exist or was deleted.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{team.teamName || 'Unnamed Team'}</h1>
                    {tournamentName && <p className="text-sm text-gray-500 mt-1">{tournamentName}</p>}
                    <div className="mt-3 text-sm text-gray-700 space-y-0.5">
                      <div><span className="text-gray-500">Owner:</span> {owner?.name || <span className="italic text-gray-400">Unknown ({team.userId || 'no user'})</span>}</div>
                      {owner?.phone && <div><span className="text-gray-500">Phone:</span> {owner.phone}</div>}
                      {owner?.email && <div><span className="text-gray-500">Email:</span> {owner.email}</div>}
                      {createdAt && <div><span className="text-gray-500">Created:</span> {createdAt.toLocaleString()}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Total points</div>
                    <div className="text-4xl font-bold text-orange-600">{fmtPts(Number(team.totalPoints) || 0)}</div>
                  </div>
                </div>
              </div>

              {gameweeks.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-600">
                  This team has no gameweeks yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {gameweeks.map((gw) => {
                    const ids = gw.playerIds || [];
                    const rows = ids
                      .map((pid) => ({
                        id: pid,
                        name: playersById[pid]?.name || 'Unknown Player',
                        realTeam: teamByPlayer[pid] || '—',
                        cost: playersById[pid]?.cost,
                        isC: pid === gw.captainId,
                        isV: pid === gw.viceCaptainId,
                        pts: playerGwPoints(pid, gw),
                      }))
                      .sort((a, b) => (b.isC - a.isC) || (b.isV - a.isV) || b.pts - a.pts);
                    const storedPts = Number(gw.points) || 0;

                    return (
                      <div key={gw.gameweekNumber} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">Gameweek {gw.gameweekNumber}</h2>
                            {gw.gameweekDate && <span className="text-sm text-gray-500">{formatDay(gw.gameweekDate)}</span>}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${gw.locked ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                              {gw.locked ? 'Locked' : 'Open'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            {ids.length} player{ids.length === 1 ? '' : 's'} · <span className="font-semibold text-orange-600">{fmtPts(storedPts)} pts</span>
                          </div>
                        </div>

                        {ids.length === 0 ? (
                          <div className="px-6 py-6 text-sm text-gray-500 italic">No squad picked for this gameweek.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="border-b border-gray-200">
                                <tr>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                  <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GW points</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {rows.map((r) => (
                                  <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm text-gray-900">
                                      <button
                                        onClick={() => navigate(`/admin/fantasy/player/${r.id}`)}
                                        className="font-medium hover:text-orange-600 hover:underline"
                                      >
                                        {r.name}
                                      </button>
                                      {r.isC && <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white" title="Captain (2x)">C</span>}
                                      {r.isV && <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-gray-700 text-white" title="Vice-captain (1.5x)">VC</span>}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-700">{r.realTeam}</td>
                                    <td className="px-6 py-3 text-sm text-gray-700">{r.cost !== undefined ? `${r.cost} CR` : '—'}</td>
                                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{fmtPts(r.pts)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

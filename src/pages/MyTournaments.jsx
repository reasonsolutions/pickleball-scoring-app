import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, deleteDoc, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import {
  Badge, Button, Card, Chip, Dialog, EmptyState, Icon, IconButton, Loading, Page, PageHeader,
  SegmentProgress, Tabs, useToast, cx,
} from '../components/admin-ui';
import { formatRange } from '../components/admin-shell/TournamentSwitcher';
import {
  buildMatchdays, categoryList, fmtDay, fmtMoney, fmtNumber, seasonPosition, tournamentStatus,
} from '../components/admin-dashboard/leagueData';

const STATUS_BADGE = {
  active: <Badge tone="success" dot>Active</Badge>,
  upcoming: <Badge tone="brand">Upcoming</Badge>,
  completed: <Badge>Completed</Badge>,
};

/** Per-tournament numbers: team count; full fixtures for current tournaments (matchday progress), counts for past ones. */
async function loadSummary(t, withFixtures) {
  const byT = (name) => query(collection(db, name), where('tournamentId', '==', t.id));
  const teams = await getCountFromServer(byT('teams')).then((s) => s.data().count).catch(() => null);
  if (!withFixtures) {
    const fixtures = await getCountFromServer(byT('fixtures')).then((s) => s.data().count).catch(() => null);
    return { teams, fixturesTotal: fixtures };
  }
  const snap = await getDocs(byT('fixtures'));
  const matchdays = buildMatchdays(snap.docs.map((d) => d.data()));
  const pos = seasonPosition(matchdays);
  return {
    teams,
    fixtureDocs: snap.size, // every fixture record, incl. unplayed breakers (what delete removes)
    matchdays,
    pos,
    fixturesDone: matchdays.reduce((s, d) => s + d.completed, 0),
    fixturesTotal: matchdays.reduce((s, d) => s + d.total, 0),
  };
}

function CountCard({ label, value, icon, tone }) {
  const tones = {
    neutral: 'bg-paper-100 text-ink-900',
    success: 'bg-ok-50 text-ok-700',
    brand: 'bg-brand-100 text-brand-700',
  };
  return (
    <Card className="!flex-row items-center !gap-3.5">
      <span className={cx('w-10 h-10 rounded-ds-md inline-flex items-center justify-center shrink-0', tones[tone])}>
        <Icon name={icon} size={18} />
      </span>
      <div>
        <div className="text-sm text-ink-500">{label}</div>
        <div className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900 tabular">{value}</div>
      </div>
    </Card>
  );
}

function FeaturedTournament({ t, summary, teamAdmin, canDelete, onDelete }) {
  const status = tournamentStatus(t);
  const md = summary?.matchdays || [];
  const done = md.filter((d) => d.total > 0 && d.completed === d.total).length;
  const next = summary?.pos?.next;
  const categories = categoryList(t.categories);
  const facts = [
    ['Teams', summary?.teams != null ? fmtNumber(summary.teams) : '—'],
    ['Fixtures', summary ? `${fmtNumber(summary.fixturesDone)} / ${fmtNumber(summary.fixturesTotal)}` : '—'],
    ...(!teamAdmin ? [['Prize money', fmtMoney(t.prizeMoney)], ['Entry fee', fmtMoney(t.registrationFee)]] : []),
  ];
  const openPath = teamAdmin ? `/admin/tournaments/${t.id}/fixtures` : `/admin/tournaments/${t.id}`;

  return (
    <Card radius="2xl" padding={false} className="!flex-row flex-wrap !gap-7 p-5 sm:p-7">
      <div className="flex-[1_1_360px] flex flex-col gap-[18px] min-w-0">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-2xl font-bold tracking-[-0.02em] text-ink-900">{t.name || 'Untitled tournament'}</span>
            {STATUS_BADGE[status]}
          </div>
          <div className="text-sm text-ink-500 mt-1">
            {[t.description, formatRange(t.startDate, t.endDate)].filter(Boolean).join(' · ')}
          </div>
        </div>

        {md.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between gap-3 text-[13px] flex-wrap">
              <b className="font-semibold text-ink-900">Matchday {done} of {md.length} complete</b>
              <span className="text-ink-500">{next ? `Next: ${fmtDay(next.date)}` : 'All matchdays played'}</span>
            </div>
            <SegmentProgress total={md.length} done={done} next={next ? 1 : 0} />
          </div>
        ) : (
          <div className="text-[13px] text-ink-500">{summary ? 'No fixtures yet' : 'Loading progress'}</div>
        )}

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => <Chip key={c}>{c}</Chip>)}
          </div>
        )}
      </div>

      <div className="flex-[1_1_260px] flex flex-col justify-between gap-[18px] min-w-0">
        <div className="grid grid-cols-2 gap-px bg-line-100 border border-line-100 rounded-ds-lg overflow-hidden">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-paper-50 px-3.5 py-3">
              <div className="text-xs text-ink-500">{k}</div>
              <div className="text-lg font-bold text-ink-900 tabular">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button as={Link} to={openPath} variant="dark" size="lg" iconRight="arrowUpRight" fullWidth>
            {teamAdmin ? 'Open fixtures' : 'Open tournament'}
          </Button>
          {canDelete && <IconButton icon="trash" label="Delete tournament" variant="danger" size="lg" onClick={() => onDelete(t)} />}
        </div>
      </div>
    </Card>
  );
}

function PastTournament({ t, summary, teamAdmin, canDelete, onDelete }) {
  const openPath = teamAdmin ? `/admin/tournaments/${t.id}/fixtures` : `/admin/tournaments/${t.id}`;
  return (
    <Card
      title={t.name || 'Untitled tournament'}
      subtitle={[t.description, formatRange(t.startDate, t.endDate)].filter(Boolean).join(' · ')}
      action={<Badge>Completed</Badge>}
    >
      <div className="flex gap-6 text-sm px-3 py-2.5 rounded-ds-md bg-paper-50">
        <span><span className="text-ink-500">Teams </span><b className="font-semibold tabular">{summary?.teams ?? '—'}</b></span>
        <span><span className="text-ink-500">Fixtures </span><b className="font-semibold tabular">{summary?.fixturesTotal ?? '—'}</b></span>
      </div>
      <div className="flex gap-2">
        <Button as={Link} to={openPath} variant="secondary" size="lg" fullWidth>View</Button>
        {canDelete && <IconButton icon="trash" label="Delete tournament" variant="danger" size="lg" onClick={() => onDelete(t)} />}
      </div>
    </Card>
  );
}

export default function MyTournaments() {
  const [activeTab, setActiveTab] = useState('current');
  const [tournaments, setTournaments] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { currentUser, isSuperAdmin, isTeamAdmin, getAllTournaments } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const superAdmin = isSuperAdmin();
  const teamAdmin = isTeamAdmin();

  // Same sources as before: all tournaments (super admin), own tournament (team admin), or created-by-me (live).
  useEffect(() => {
    if (!currentUser) return undefined;
    let unsubscribe;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (superAdmin) {
          const all = await getAllTournaments();
          if (alive) setTournaments(all);
        } else if (teamAdmin) {
          if (currentUser.tournamentId) {
            const snap = await getDoc(doc(db, 'tournaments', currentUser.tournamentId));
            if (alive && snap.exists()) setTournaments([{ id: snap.id, ...snap.data() }]);
          }
        } else {
          const q = query(collection(db, 'tournaments'), where('createdBy', '==', currentUser.uid), orderBy('createdAt', 'desc'));
          unsubscribe = onSnapshot(q, (s) => {
            setTournaments(s.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
          });
          return;
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, superAdmin, teamAdmin]);

  const current = tournaments.filter((t) => tournamentStatus(t) !== 'completed');
  const past = tournaments.filter((t) => tournamentStatus(t) === 'completed');
  const activeCount = tournaments.filter((t) => tournamentStatus(t) === 'active').length;

  // Load progress numbers once the list is known.
  useEffect(() => {
    let alive = true;
    tournaments.forEach((t) => {
      if (summaries[t.id]) return;
      loadSummary(t, tournamentStatus(t) !== 'completed')
        .then((s) => alive && setSummaries((prev) => ({ ...prev, [t.id]: s })))
        .catch((err) => console.error('Tournament summary failed', t.id, err));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournaments]);

  const canDelete = (t) => superAdmin || (currentUser && t.createdBy === currentUser.uid);

  const handleDelete = async () => {
    const t = confirm;
    if (!t || !canDelete(t)) return;
    setDeleting(true);
    try {
      const fixtures = await getDocs(query(collection(db, 'fixtures'), where('tournamentId', '==', t.id)));
      await Promise.all(fixtures.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'tournaments', t.id));
      setTournaments((xs) => xs.filter((x) => x.id !== t.id));
      toast({ tone: 'success', title: 'Tournament deleted', message: t.name });
      setConfirm(null);
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({ tone: 'danger', title: "Couldn't delete the tournament", message: 'Try again in a moment.' });
    } finally {
      setDeleting(false);
    }
  };

  const list = activeTab === 'current' ? current : past;
  const confirmSummary = confirm && summaries[confirm.id];
  const confirmFixtures = confirmSummary && (confirmSummary.fixtureDocs ?? confirmSummary.fixturesTotal);

  return (
    <MainLayout>
      <Page>
        <PageHeader
          title={teamAdmin ? 'My Tournament' : 'My Tournaments'}
          subtitle={teamAdmin ? `The tournament you manage as ${currentUser?.teamName || 'team'} admin` : 'Manage and track your pickleball tournaments'}
          actions={superAdmin && <Button as={Link} to="/admin/tournaments/create" icon="plus">Create tournament</Button>}
        />

        {!teamAdmin && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <CountCard label="Total tournaments" value={tournaments.length} icon="trophy" tone="neutral" />
            <CountCard label="Active" value={activeCount} icon="check" tone="success" />
            <CountCard label="Completed" value={past.length} icon="clock" tone="brand" />
          </div>
        )}

        <Tabs
          items={[{ id: 'current', label: 'Current', count: current.length }, { id: 'past', label: 'Past', count: past.length }]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {loading ? (
          <Card><Loading label="Loading tournaments" /></Card>
        ) : list.length === 0 ? (
          <Card>
            <EmptyState
              icon="trophy"
              title={activeTab === 'current' ? 'No current tournaments' : 'No past tournaments'}
              description={
                teamAdmin
                  ? 'No tournament is assigned to your team admin account.'
                  : activeTab === 'current'
                    ? 'Create a tournament to get started.'
                    : 'Completed tournaments appear here.'
              }
              action={activeTab === 'current' && superAdmin && (
                <Button variant="secondary" icon="plus" onClick={() => navigate('/admin/tournaments/create')}>Create tournament</Button>
              )}
            />
          </Card>
        ) : activeTab === 'current' ? (
          <div className="flex flex-col gap-4">
            {current.map((t) => (
              <FeaturedTournament key={t.id} t={t} summary={summaries[t.id]} teamAdmin={teamAdmin} canDelete={canDelete(t)} onDelete={setConfirm} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}>
            {past.map((t) => (
              <PastTournament key={t.id} t={t} summary={summaries[t.id]} teamAdmin={teamAdmin} canDelete={canDelete(t)} onDelete={setConfirm} />
            ))}
          </div>
        )}

        <Dialog
          open={!!confirm}
          onClose={() => !deleting && setConfirm(null)}
          title="Delete tournament?"
          description={confirm && `This removes ${confirm.name}${confirmFixtures ? ` and all ${fmtNumber(confirmFixtures)} fixtures` : ' and its fixtures'}. It cannot be undone.`}
          actions={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" icon="trash" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting' : 'Delete'}</Button>
            </>
          }
        />
      </Page>
    </MainLayout>
  );
}

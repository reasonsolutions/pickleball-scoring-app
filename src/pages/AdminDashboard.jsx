import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/MainLayout';
import {
  Avatar, Badge, Button, Card, DotMatrix, DOT, EmptyState, Loading, Page, PageHeader, StatCard, Table,
} from '../components/admin-ui';
import useLeagueDashboard from '../components/admin-dashboard/useLeagueDashboard';
import {
  buildMatchdays, dayKey, dotsPerTie, fmtDay, fmtNumber, fmtShort, passCount, seasonDots, seasonPosition, weeklySeries,
} from '../components/admin-dashboard/leagueData';

const firstName = (user) => (user?.displayName || '').trim().split(/\s+/)[0] || '';

function TeamName({ name, logo, tone = 'brand', align = 'left' }) {
  return (
    <span className={`flex items-center gap-2 min-w-0 flex-1 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <Avatar name={name} src={logo} size={28} tone={tone} />
      <b className="text-sm font-semibold text-ink-900 truncate">{name}</b>
    </span>
  );
}

function DotLegend() {
  const items = [['done', 'Played'], ['exception', 'Game Breaker'], ['next', 'Next matchday'], ['empty', 'Scheduled']];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-500">
      {items.map(([role, label]) => (
        <span key={role} className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: DOT[role] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const data = useLeagueDashboard();
  const superAdmin = isSuperAdmin();

  const view = useMemo(() => {
    if (data.loading || data.error || !data.tournament) return null;
    const { tournament, fixtures, players, teams, matchDays } = data;
    const matchdays = buildMatchdays(fixtures);
    const pos = seasonPosition(matchdays);
    const logos = Object.fromEntries(teams.map((t) => [t.name, t.logo?.url || null]));

    const total = matchdays.reduce((s, d) => s + d.total, 0);
    const played = matchdays.reduce((s, d) => s + d.completed, 0);
    const pct = total ? Math.round((played / total) * 100) : 0;

    // Passes: total issued this season, and for the next (or latest) match day.
    const passesByDay = matchDays.map((md) => ({ key: dayKey(md.date), date: md.date, issued: passCount(md.passes) }));
    const todayKey = dayKey(new Date());
    const focusPass = passesByDay.find((p) => p.key >= todayKey) || passesByDay[passesByDay.length - 1] || null;

    const newThisWeek = players.filter((p) => {
      const d = p.createdAt?.toDate?.();
      return d && Date.now() - d.getTime() < 7 * 24 * 3600 * 1000;
    }).length;

    return {
      tournament,
      matchdays,
      pos,
      logos,
      total,
      played,
      pct,
      dots: seasonDots(matchdays, pos.next?.key),
      players: players.length,
      newThisWeek,
      playerSeries: weeklySeries(players),
      passesTotal: passesByDay.reduce((s, p) => s + p.issued, 0),
      passSeries: passesByDay.map((p) => p.issued),
      focusPass,
    };
  }, [data]);

  const t = view?.tournament;
  const fixturesPath = t ? `/admin/tournaments/${t.id}/fixtures` : '/admin/tournaments';
  const name = firstName(currentUser);
  const title = name ? `Welcome back, ${name}` : 'Dashboard';

  let subtitle = '';
  if (view?.pos.next) subtitle = `${view.pos.next.label} is on ${fmtDay(view.pos.next.date)} · ${t.name}`;
  else if (t) subtitle = `${t.name} · All matchdays played`;

  return (
    <MainLayout>
      <Page>
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={t && (
            <>
              <Button as={Link} to={`/admin/tournaments/${t.id}`} variant="secondary" icon="trophy">Tournament</Button>
              <Button as={Link} to={fixturesPath} icon="calendar">Manage fixtures</Button>
            </>
          )}
        />

        {data.loading && <Card><Loading label="Loading dashboard" /></Card>}

        {data.error && (
          <Card>
            <EmptyState icon="alert" title="The dashboard couldn't load" description="Check your connection and reload the page." />
          </Card>
        )}

        {!data.loading && !data.error && !t && (
          <Card>
            <EmptyState
              icon="trophy"
              title="No tournament yet"
              description="Create a tournament, or choose the active one in App settings, to see league activity here."
              action={superAdmin && <Button as={Link} to="/admin/tournaments/create" icon="plus">Create tournament</Button>}
            />
          </Card>
        )}

        {view && (
          <>
            {/* KPI row */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <StatCard
                label="Matches played"
                icon="calendar"
                value={fmtNumber(view.played)}
                delta={view.pos.lastPlayed ? String(view.pos.lastPlayed.completed) : null}
                sub={view.pos.lastPlayed ? `on ${view.pos.lastPlayed.label.toLowerCase()}` : 'No matches yet'}
                series={view.matchdays.map((d) => d.completed)}
                onClick={() => navigate(fixturesPath)}
              />
              <StatCard
                label="Registered players"
                icon="users"
                value={fmtNumber(view.players)}
                delta={view.newThisWeek ? String(view.newThisWeek) : null}
                sub={view.newThisWeek ? 'this week' : 'No new players this week'}
                series={view.playerSeries.some(Boolean) ? view.playerSeries : null}
                onClick={() => navigate(superAdmin ? '/admin/players' : `/admin/tournaments/${t.id}/players`)}
              />
              {superAdmin && (
                <StatCard
                  label="Passes issued"
                  icon="ticket"
                  value={fmtNumber(view.passesTotal)}
                  delta={view.focusPass?.issued ? fmtNumber(view.focusPass.issued) : null}
                  sub={view.focusPass ? `for ${fmtDay(view.focusPass.date)}` : 'No match days yet'}
                  series={view.passSeries.length ? view.passSeries : null}
                  onClick={() => navigate('/admin/ticketing')}
                />
              )}
            </div>

            {/* Season progress */}
            <Card
              title="Season progress"
              subtitle={`${view.pos.playedDays} of ${view.matchdays.length} matchdays played`}
              action={<Badge tone="brand">Season {view.pct}% complete</Badge>}
            >
              <div className="text-[40px] font-bold tracking-[-0.02em] leading-none text-ink-900 tabular">
                {fmtNumber(view.played)}
                <span className="text-[26px] text-ink-300"> / {fmtNumber(view.total)}</span>
              </div>
              {view.matchdays.length > 0 ? (
                <>
                  <DotMatrix
                    groups={view.dots}
                    columns={dotsPerTie(view.matchdays)}
                    dot={9}
                    marker={view.pos.markerAfter != null && view.pos.markerAfter < view.matchdays.length - 1
                      ? { after: view.pos.markerAfter, label: `Today · ${fmtShort(new Date())}` }
                      : undefined}
                  />
                  <DotLegend />
                </>
              ) : (
                <p className="text-sm text-ink-500">No fixtures have been created for this tournament.</p>
              )}
            </Card>

            <div className="flex flex-wrap gap-4">
              {/* Upcoming ties */}
              <Card
                title="Upcoming ties"
                subtitle={view.pos.next ? `${fmtDay(view.pos.next.date)} · ${view.pos.next.ties.length} ties` : 'Nothing scheduled'}
                action={<Link to={fixturesPath} className="text-[13px] font-semibold text-brand-600 hover:text-ink-900">View all</Link>}
                className="flex-[1_1_340px]"
              >
                {view.pos.next ? (
                  <div className="flex flex-col">
                    {view.pos.next.ties.map((tie) => (
                      <div key={tie.id} className="flex flex-col gap-2 py-3 border-t border-line-100">
                        <div className="flex items-center gap-2">
                          <TeamName name={tie.team1} logo={view.logos[tie.team1]} />
                          {tie.live ? <Badge tone="danger" dot>Live</Badge> : <Badge>{tie.time || 'TBD'}</Badge>}
                          <TeamName name={tie.team2} logo={view.logos[tie.team2]} tone="neutral" align="right" />
                        </div>
                        <div className="text-xs text-ink-500">
                          {[tie.court, `${tie.matchCount} matches`].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500 border-t border-line-100 pt-3">All ties for this season have been played.</p>
                )}
              </Card>

              {/* Recent results */}
              <Card
                title="Recent results"
                subtitle={view.pos.lastWithResults ? `${view.pos.lastWithResults.label} · ${fmtDay(view.pos.lastWithResults.date)}` : 'No results yet'}
                className="flex-[2_1_480px]"
              >
                {view.pos.lastWithResults ? (
                  <Table
                    rows={view.pos.lastWithResults.ties.filter((tie) => tie.decided)}
                    columns={[
                      {
                        key: 'tie',
                        label: 'Tie',
                        width: 'minmax(0,2.4fr)',
                        primary: true,
                        render: (r) => {
                          const w = r.winner === 'team1' ? r.team1 : r.team2;
                          const l = r.winner === 'team1' ? r.team2 : r.team1;
                          return (
                            <span className="flex gap-1.5 flex-wrap min-w-0">
                              <b className="font-semibold">{w}</b>
                              <span className="text-ink-400">def.</span>
                              <span>{l}</span>
                            </span>
                          );
                        },
                      },
                      {
                        key: 'score',
                        label: 'Score',
                        width: '70px',
                        render: (r) => (
                          <b className="font-semibold tabular">
                            {Math.max(r.wins.team1, r.wins.team2)}–{Math.min(r.wins.team1, r.wins.team2)}
                          </b>
                        ),
                      },
                      { key: 'court', label: 'Court', width: 'minmax(0,1.2fr)', render: (r) => <span className="truncate">{r.court || '—'}</span> },
                      {
                        key: 'gb',
                        label: 'Decided by',
                        width: '130px',
                        render: (r) => (r.breakerPlayed ? <Badge tone="dark">Game Breaker</Badge> : <Badge>Regulation</Badge>),
                      },
                    ]}
                  />
                ) : (
                  <p className="text-sm text-ink-500">Results appear here once the first tie is decided.</p>
                )}
              </Card>
            </div>
          </>
        )}
      </Page>
    </MainLayout>
  );
}

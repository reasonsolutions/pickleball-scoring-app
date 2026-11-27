const matchWinner = (match) => {
  if (match.winner === 'team1' || match.winner === 'team2') return match.winner;
  const a = match.scores?.player1?.game1 || match.scores?.player1?.total || 0;
  const b = match.scores?.player2?.game1 || match.scores?.player2?.total || 0;
  return a > b ? 'team1' : b > a ? 'team2' : null;
};

// A fixture is decided once its regular matches are all completed and the match wins aren't level
export const computeSeasonRecords = (allMatches) => {
  const groups = {};
  allMatches.forEach(m => {
    if (m.fixtureGroupId) (groups[m.fixtureGroupId] ||= []).push(m);
  });
  const tally = {};
  const bump = (team, key) => {
    if (!team) return;
    tally[team] ||= { w: 0, l: 0 };
    tally[team][key]++;
  };
  Object.values(groups).forEach(matches => {
    const regular = matches.filter(m => m.matchTypeLabel !== 'Game Breaker' && m.matchTypeLabel !== 'Dream Breaker');
    if (regular.length === 0 || regular.some(m => m.status !== 'completed')) return;
    const wins = { team1: 0, team2: 0 };
    matches.forEach(m => {
      const w = m.status === 'completed' && matchWinner(m);
      if (w) wins[w]++;
    });
    if (wins.team1 === wins.team2) return;
    const { team1Name, team2Name } = matches[0];
    bump(team1Name, wins.team1 > wins.team2 ? 'w' : 'l');
    bump(team2Name, wins.team2 > wins.team1 ? 'w' : 'l');
  });
  return Object.fromEntries(Object.entries(tally).map(([team, r]) => [team, `${r.w}-${r.l} season`]));
};

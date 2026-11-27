import React, { useEffect, useState } from 'react';

import bgImage from '../assets/title-sponsor/bg.png';
import starImage from '../assets/title-sponsor/star.png';
import leagueLogo from '../assets/title-sponsor/league-logo.png';
import sponsorsImage from '../assets/title-sponsor/sponsors.png';

// Title sponsor screen stays up until this long before the day's first fixture
const LEAD_MINUTES = 30;

const isActive = (match) => match.status === 'live' || match.status === 'in_progress';
const isStarted = (match) => isActive(match) || match.status === 'completed';

// Earliest scheduled start (local time) among the day's matches, or null if none have a time
const getFirstStart = (dateString, matches) => {
  const starts = matches
    .map(match => match.playingTime || match.time)
    .filter(Boolean)
    .map(time => new Date(`${dateString}T${time.length === 5 ? `${time}:00` : time}`))
    .filter(date => !isNaN(date.getTime()));
  return starts.length ? new Date(Math.min(...starts)) : null;
};

// A fixture is decided once either team has won more than 3 of its matches
const WINS_TO_DECIDE = 4;

// Winners are stored as 'player1'/'player2' by the scorer, 'team1'/'team2' in older records
const WINNER_SIDE = { player1: 'team1', team1: 'team1', player2: 'team2', team2: 'team2' };

const isFixtureDone = (fixtureMatches) => {
  const wins = { team1: 0, team2: 0 };
  fixtureMatches.forEach(match => {
    const side = WINNER_SIDE[match.winner];
    if (match.status === 'completed' && side) wins[side]++;
  });
  return wins.team1 >= WINS_TO_DECIDE || wins.team2 >= WINS_TO_DECIDE;
};

// True while the title sponsor screen should replace the normal display:
// before 30 minutes ahead of the next undecided fixture, and after all of the day's fixtures are decided
export function useTitleSponsorWindow(dateString, matches) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  // Any match being played, even in an already decided fixture, brings back the normal display
  if (!matches.length || matches.some(isActive)) return false;

  const fixtures = {};
  matches.forEach(match => {
    const key = match.fixtureGroupId || match.id;
    (fixtures[key] = fixtures[key] || []).push(match);
  });
  const pending = Object.values(fixtures).filter(fixtureMatches => !isFixtureDone(fixtureMatches));
  if (!pending.length) return true;

  // A pending fixture already under way keeps the normal display
  if (pending.some(fixtureMatches => fixtureMatches.some(isStarted))) return false;

  const nextStart = getFirstStart(dateString, pending.flat());
  if (!nextStart) return false;
  return now < nextStart.getTime() - LEAD_MINUTES * 60 * 1000;
}

export default function TitleSponsorScreen() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#1e1e1e' }}>
      <style>{'@keyframes titleSponsorStarSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
      <div style={{ position: 'relative', width: 'min(100vw, 177.78vh)', aspectRatio: '16 / 9', overflow: 'hidden', background: `#333 url(${bgImage}) center / cover no-repeat` }}>
        <div style={{ position: 'absolute', left: '-7.292%', top: '-17.407%', width: '33.125%', pointerEvents: 'none' }}>
          <img src={starImage} alt="" style={{ width: '100%', display: 'block', animation: 'titleSponsorStarSpin 20s linear infinite' }} />
        </div>
        <img
          src={leagueLogo}
          alt="Terminus Centre Court Pickleball League HYD"
          style={{ position: 'absolute', left: '40.365%', top: '6.574%', width: '19.115%' }}
        />
        <img
          src={sponsorsImage}
          alt="Title sponsor Terminus, associate sponsors Vijaya Diagnostic Centre and KLR Transformers, partners Stupa, Johnnie Walker Blonde, Loca Loka, Balaji Jewellery"
          style={{ position: 'absolute', left: '13.594%', top: '47.222%', width: '71.927%' }}
        />
      </div>
    </div>
  );
}

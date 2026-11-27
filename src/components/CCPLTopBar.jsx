import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { parseDate } from '../utils/dateTimeUtils';

const ORANGE = '#e27b46';
const INK = '#0b0b0c';

// Cached across page navigations so the ticker doesn't refetch on every route
let resultsCache = null;

const isBreaker = (m) =>
  m.matchType === 'dreamBreaker' || m.matchTypeLabel === 'Dream Breaker' || m.matchTypeLabel === 'Game Breaker';

const matchWinner = (match) => {
  const s1 = match.scores?.player1 || {};
  const s2 = match.scores?.player2 || {};
  let g1 = 0;
  let g2 = 0;
  for (let i = 1; i <= (match.gamesCount || 3); i++) {
    const a = parseInt(s1[`game${i}`]) || 0;
    const b = parseInt(s2[`game${i}`]) || 0;
    if (a > b) g1++;
    else if (b > a) g2++;
  }
  return g1 > g2 ? 1 : g2 > g1 ? 2 : 0;
};

async function fetchRecentResults() {
  if (resultsCache) return resultsCache;

  const settings = await getDoc(doc(db, 'app-settings', 'mobile-app'));
  const tournamentId = settings.exists() ? settings.data().activeTournamentId : null;
  if (!tournamentId) return [];

  const snap = await getDocs(query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId)));
  const groups = {};
  snap.docs.forEach((d) => {
    const m = { id: d.id, ...d.data() };
    const gid = m.fixtureGroupId || m.id;
    if (!groups[gid]) groups[gid] = { team1Name: m.team1Name, team2Name: m.team2Name, date: m.date, matches: [] };
    groups[gid].matches.push(m);
  });

  const results = [];
  Object.values(groups).forEach((g) => {
    const completed = g.matches.filter((m) => m.status === 'completed' && m.scores);
    // Total wins (shown in the ticker) and regular-match wins (4 of 6 decides a fixture)
    let w1 = 0;
    let w2 = 0;
    let r1 = 0;
    let r2 = 0;
    completed.forEach((m) => {
      const w = matchWinner(m);
      if (w === 1) {
        w1++;
        if (!isBreaker(m)) r1++;
      } else if (w === 2) {
        w2++;
        if (!isBreaker(m)) r2++;
      }
    });
    const decided = r1 >= 4 || r2 >= 4;
    const allDone = g.matches.length > 0 && g.matches.every((m) => m.status === 'completed' || (decided && isBreaker(m)));
    if ((decided || allDone) && g.team1Name && g.team2Name) {
      results.push({ home: g.team1Name, away: g.team2Name, homeScore: w1, awayScore: w2, date: parseDate(g.date) });
    }
  });

  results.sort((a, b) => b.date - a.date);
  resultsCache = results.slice(0, 10);
  return resultsCache;
}

export default function CCPLTopBar({ activeLeague = 'ccpl-s2' }) {
  const [isMobile, setIsMobile] = useState(false);
  const [results, setResults] = useState(resultsCache || []);

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth < 860);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRecentResults()
      .then((r) => !cancelled && setResults(r))
      .catch((error) => console.error('Error fetching ticker results:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const leagues = [
    { label: 'CCPL S2', href: '/ccpl-home', key: 'ccpl-s2' },
    { label: 'CCPL S1', href: '/ccpl-s1', key: 'ccpl-s1' },
    { label: 'CCPL Clubs', href: '/hpl-clubs', key: 'ccpl-clubs' },
  ];

  const showTicker = !isMobile && results.length > 0;

  const tickerItems = results.map((r, k) => (
    <span
      key={k}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 22px', borderRight: '1px solid rgba(11,11,12,.25)' }}
    >
      <span>{r.home}</span>
      <span style={{ background: INK, color: '#fff', padding: '2px 10px', fontWeight: 900 }}>
        {r.homeScore}–{r.awayScore}
      </span>
      <span>{r.away}</span>
    </span>
  ));

  return (
    <>
      <style>{`
        /* Hide scrollbar for top bar while maintaining scroll functionality */
        .ccpl-top-bar::-webkit-scrollbar {
          display: none;
        }
        .ccpl-top-bar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes ccMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .cc-league-tab {
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }

        .cc-league-tab:not(.is-active):hover {
          box-shadow: inset 0 0 0 2px ${ORANGE} !important;
          color: #fff !important;
        }

        .cc-social {
          transition: background 0.2s ease;
        }

        .cc-social:hover {
          background: #232324 !important;
        }
      `}</style>

      <div
        className="ccpl-top-bar"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          background: ORANGE,
          boxSizing: 'border-box',
          height: isMobile ? '50px' : '56px',
          overflowX: 'auto',
          overflowY: 'hidden',
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px' : '10px',
            background: INK,
            padding: isMobile ? '0 26px 0 14px' : '0 34px 0 20px',
            clipPath: 'polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%)'
          }}
        >
          {leagues.map((lg) => {
            const active = lg.key === activeLeague;
            return (
              <a
                key={lg.key}
                href={lg.href}
                className={`cc-league-tab${active ? ' is-active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: isMobile ? '32px' : '38px',
                  padding: isMobile ? '0 14px' : '0 24px',
                  transform: 'skewX(-14deg)',
                  textDecoration: 'none',
                  background: active ? ORANGE : 'transparent',
                  color: active ? INK : '#fff',
                  boxShadow: `inset 0 0 0 2px ${active ? ORANGE : 'rgba(255,255,255,0.35)'}`
                }}
              >
                <span
                  style={{
                    transform: 'skewX(14deg)',
                    fontFamily: "'Zuume Cut', sans-serif",
                    fontWeight: 900,
                    fontStyle: 'italic',
                    fontSize: isMobile ? '19px' : '24px',
                    lineHeight: 1,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {lg.label}
                </span>
              </a>
            );
          })}
        </div>

        {showTicker ? (
          <>
            <div
              style={{
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 14px 0 18px',
                fontFamily: "'Zuume Cut', sans-serif",
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: '20px',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: INK,
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ width: 9, height: 9, background: INK, display: 'inline-block' }}></span>Results
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  whiteSpace: 'nowrap',
                  animation: `ccMarquee ${Math.max(20, results.length * 7)}s linear infinite`,
                  fontFamily: "'Zuume Cut', sans-serif",
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: '21px',
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: INK
                }}
              >
                <div style={{ display: 'flex' }}>{tickerItems}</div>
                <div style={{ display: 'flex' }} aria-hidden="true">{tickerItems}</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, minWidth: '0' }}></div>
        )}

        <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, minWidth: 'min-content' }}>
          <a
            href="https://www.instagram.com/centrecourtpickleballleague/"
            target="_blank"
            rel="noopener noreferrer"
            className="cc-social"
            aria-label="Instagram"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '50px' : '56px',
              background: INK,
              color: '#fff',
              textDecoration: 'none'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@CentreCourtPickleballLeague"
            target="_blank"
            rel="noopener noreferrer"
            className="cc-social"
            aria-label="YouTube"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '50px' : '56px',
              background: INK,
              color: '#fff',
              textDecoration: 'none',
              borderLeft: '1px solid #232324'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.6 7.2c-.25-1-1-1.75-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4c-1 .25-1.75 1-2 2C2 8.9 2 12 2 12s0 3.1.4 4.8c.25 1 1 1.75 2 2 1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4c1-.25 1.75-1 2-2 .4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15.2V8.8l6 3.2-6 3.2z"/>
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}

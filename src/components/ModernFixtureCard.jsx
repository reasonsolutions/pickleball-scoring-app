import React from 'react';
import styles from '../styles/AddFixtures.module.css';

export default function ModernFixtureCard({ fixture, group, onEdit, onDelete, onNavigate, isSuperAdmin }) {
  if (group) {
    // Group fixture card (DreamBreaker style)
    return (
      <div
        className={`${styles.fixtureCard} cursor-pointer`}
        onClick={() => onNavigate && onNavigate(group.id)}
      >
        <div className={styles.fixtureCardHeader}>
          <div>
            <h3 className={styles.fixtureCardTitle}>
              {group.date.toDate().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </h3>
            <div className={styles.fixtureInfo}>
              {group.matches[0]?.venueName && (
                <span className={`${styles.infoBadge} primary`}>
                  📍 {group.matches[0].venueName}
                </span>
              )}
              {group.matches[0]?.court && (
                <span className={styles.infoBadge}>
                  🏟️ {group.matches[0].court}
                </span>
              )}
              <span className={`${styles.infoBadge} primary`}>
                {group.matches.length} matches
              </span>
            </div>
          </div>
          {isSuperAdmin && (
            <button
              className={styles.buttonGhost}
              onClick={(e) => {
                e.stopPropagation();
                onEdit && onEdit(group.matches[0]);
              }}
              title="Edit"
            >
              ✏️
            </button>
          )}
        </div>

        <div className={styles.fixtureCardBody}>
          <div className={styles.teamVsTeam}>
            <div className={styles.teamName}>{group.team1Name}</div>
            <div className={styles.vsText}>VS</div>
            <div className={`${styles.teamName} ${styles.team2}`}>{group.team2Name}</div>
          </div>

          <div className={styles.fixtureInfo}>
            {group.matches.map((match, index) => (
              <span key={index} className={styles.infoBadge}>
                {match.matchTypeLabel === 'Dream Breaker' ? 'Game Breaker' : match.matchTypeLabel}
              </span>
            ))}
          </div>

          <div className="text-center mt-4 text-sm text-gray-500">
            Click to view all matches →
          </div>
        </div>
      </div>
    );
  }

  // Individual fixture card
  return (
    <div className={styles.fixtureCard}>
      <div className={styles.fixtureCardHeader}>
        <div>
          <h3 className={styles.fixtureCardTitle}>
            {fixture.date?.toDate?.().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }) || 'TBD'}
          </h3>
          <div className={styles.fixtureInfo}>
            {fixture.time && (
              <span className={styles.infoBadge}>
                🕐 {fixture.time}
              </span>
            )}
            {fixture.court && (
              <span className={styles.infoBadge}>
                🏟️ {fixture.court}
              </span>
            )}
            {fixture.pool && (
              <span className={styles.infoBadge}>
                Pool {fixture.pool}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <>
              <button
                className={styles.buttonGhost}
                onClick={() => onEdit && onEdit(fixture)}
                title="Edit"
              >
                ✏️
              </button>
              <button
                className={styles.buttonGhost}
                onClick={() => onDelete && onDelete(fixture)}
                title="Delete"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.fixtureCardBody}>
        <div className={styles.teamVsTeam}>
          <div className={styles.teamName}>{fixture.team1Name}</div>
          <div className={styles.vsText}>VS</div>
          <div className={`${styles.teamName} ${styles.team2}`}>{fixture.team2Name}</div>
        </div>

        {(fixture.player1Team1 || fixture.player2Team1 || fixture.player1Team2 || fixture.player2Team2) && (
          <div className={styles.fixtureInfo}>
            {fixture.player1Team1 && (
              <span className={styles.infoBadge}>👤 {fixture.player1Team1}</span>
            )}
            {fixture.player2Team1 && (
              <span className={styles.infoBadge}>👤 {fixture.player2Team1}</span>
            )}
            {fixture.player1Team2 && (
              <span className={styles.infoBadge}>👤 {fixture.player1Team2}</span>
            )}
            {fixture.player2Team2 && (
              <span className={styles.infoBadge}>👤 {fixture.player2Team2}</span>
            )}
          </div>
        )}

        <div className={styles.fixtureInfo}>
          <span className={`${styles.infoBadge} primary`}>
            {fixture.matchTypeLabel}
          </span>
          {fixture.status && (
            <span className={`${styles.statusBadge} ${fixture.status}`}>
              {fixture.status.charAt(0).toUpperCase() + fixture.status.slice(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

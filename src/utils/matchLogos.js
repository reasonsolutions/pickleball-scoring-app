// Per-match logo overrides live in tournament_logos/{tournamentId}/match_logos/{key},
// one document per match, so large sponsor sets don't push the main logos document
// past Firestore's 1 MB limit. Older data may still sit in tournament_logos/{id}.matchLogos.
// Keys combine the display date with the fixture group so the same pairing on
// different days can carry different sponsors.

import { useEffect, useState } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export const MATCH_LOGOS_COLLECTION = 'match_logos';
export const LOGO_LIBRARY_COLLECTION = 'logo_library';

const byRank = (items) => [...(items || [])].sort((a, b) => (a.rank || 0) - (b.rank || 0));

export const getFixtureGroupKey = (fixture) =>
  fixture?.fixtureGroupId || (fixture ? `${fixture.team1Name}_vs_${fixture.team2Name}` : null);

export const getMatchLogoKey = (date, fixture) => {
  const groupKey = getFixtureGroupKey(fixture);
  return date && groupKey ? `${date}|${groupKey}` : null;
};

// Team names can contain "/", which Firestore doc ids can't
export const matchLogosDocRef = (tournamentId, key) =>
  doc(db, 'tournament_logos', tournamentId, MATCH_LOGOS_COLLECTION, encodeURIComponent(key));

export const matchLogosCollectionRef = (tournamentId) =>
  collection(db, 'tournament_logos', tournamentId, MATCH_LOGOS_COLLECTION);

export const logoLibraryCollectionRef = (tournamentId) =>
  collection(db, 'tournament_logos', tournamentId, LOGO_LIBRARY_COLLECTION);

// Live logo set assigned to one match, or null when it uses the defaults
export const useMatchLogoOverride = (tournamentId, date, fixture) => {
  const key = getMatchLogoKey(date, fixture);
  const [override, setOverride] = useState(null);

  useEffect(() => {
    setOverride(null);
    if (!tournamentId || !key) return undefined;
    return onSnapshot(
      matchLogosDocRef(tournamentId, key),
      (snap) => setOverride(snap.exists() ? snap.data() : null),
      (error) => {
        console.error('Error loading match logos:', error);
        setOverride(null);
      }
    );
  }, [tournamentId, key]);

  return override;
};

// Returns the logos a display should show for the given fixture: the match's own
// set if one was assigned, otherwise the tournament-wide defaults.
export const resolveDisplayLogos = (data, date, fixture, matchOverride = null) => {
  const key = getMatchLogoKey(date, fixture);
  const override = matchOverride || (key ? data?.matchLogos?.[key] : null);
  const source = override || data || {};
  return {
    displayLogos: byRank(source.displayLogos),
    bottomLogos: byRank(source.bottomLogos),
    slidingImages: byRank(source.slidingImages)
  };
};

import React from 'react';
import { HalloweenStyles, HalloweenBackdrop, Pumpkin } from './HalloweenTheme';
import { DiwaliStyles, DiwaliBackdrop, DiwaliForeground, Bhoochakra } from './DiwaliTheme';
import { ChildrensDayStyles, ChildrensDayBackdrop, ChildrensDayForeground, Pinwheel } from './ChildrensDayTheme';
import { CinemaStyles, CinemaBackdrop, CinemaForeground, CinemaMarquee, FilmReel } from './CinemaTheme';

// Festive skins for the Main/Side display jumbotron (presentation only).
// The active skin comes from flags on tournament_logos/{tournamentId}, set in the Display Controller.
export const getActiveJumbotronTheme = (settings = {}) => {
  if (settings.cinemaTheme) return 'cinema';
  if (settings.childrensDayTheme) return 'childrensDay';
  if (settings.diwaliTheme) return 'diwali';
  if (settings.halloweenTheme) return 'halloween';
  return 'default';
};

// Colour tokens. The default set matches the regular design exactly.
const DEFAULT_THEME = {
  pageBg: '#05021a',
  canvasBg: '#07021f',
  palette: ['#ff2d78', '#7b2cff', '#ff9a2e', '#2a0a6e'],
  // Colours of the four drifting background blobs; null = palette[0], [1], [2], [0]
  blobColors: null,
  blobOpacity: 1,
  blobBlurBoost: 0,
  vignette: 'radial-gradient(ellipse at 50% 30%,rgba(7,2,31,0) 0%,rgba(7,2,31,.55) 70%,rgba(7,2,31,.9) 100%)',
  logoGlow: 'drop-shadow(0 0 24px rgba(255,80,120,.35))',
  scoreboardBorder: '1px solid rgba(255,255,255,.14)',
  topBar: 'linear-gradient(90deg,#ff2d78,#7b2cff 50%,#ff9a2e)',
  team1Frame: 'linear-gradient(135deg,#ff2d78,#7b2cff)',
  team1FrameGlow: '0 0 50px rgba(255,45,120,.35)',
  team1WonText: 'linear-gradient(180deg,#fff 30%,#ffb3cd)',
  team1WonGlow: 'drop-shadow(0 0 30px rgba(255,45,120,.55))',
  team2Frame: 'linear-gradient(135deg,#ff9a2e,#ff2d78)',
  team2FrameGlow: '0 0 50px rgba(255,154,46,.35)',
  team2WonText: 'linear-gradient(180deg,#fff 30%,#ffd2a6)',
  team2WonGlow: 'drop-shadow(0 0 30px rgba(255,154,46,.5))',
  wonLabel: 'rgba(255,255,255,.6)',
  logoTileBg: '#0b0530',
  centerBg: 'linear-gradient(180deg,rgba(9,3,40,.9),rgba(20,6,60,.9))',
  centerBorder: '1px solid rgba(255,255,255,.12)',
  centerGlow: 'inset 0 0 60px rgba(123,44,255,.35),0 0 80px rgba(123,44,255,.25)',
  pillBg: 'linear-gradient(90deg,#ff2d78 0%,#ff6a3d 55%,#ffb347 100%)',
  pillPadding: '12px 32px',
  pillMargin: 10,
  pillRadius: 999,
  pillFont: "700 24px/1 'Unbounded',sans-serif",
  pillLetterSpacing: '.06em',
  pillTransform: 'uppercase',
  pillColor: '#1a0633',
  pillGlow: '0 0 40px rgba(255,80,120,.45),inset 0 1px 0 rgba(255,255,255,.5)',
  scoreGlow: '0 0 40px rgba(255,255,255,.35)',
  dash: 'linear-gradient(90deg,#ff2d78,#ff9a2e)',
  dashGlow: '0 0 30px rgba(255,80,120,.8)',
  cardBorder: '1px solid rgba(255,255,255,.14)',
  cardLabel: 'linear-gradient(90deg,#ffb3cd,#ffd2a6)',
  upNextBadge: 'rgba(123,44,255,.45)',
  winBg: 'rgba(255,255,255,.14)',
  winBorder: 'rgba(255,255,255,.35)',
  serveDot: '#ffd23a',
};

const THEMES = {
  default: DEFAULT_THEME,
  halloween: {
    ...DEFAULT_THEME,
    pageBg: '#0a0410',
    canvasBg: '#0b0412',
    palette: ['#ff7a1a', '#8a2be2', '#ffb02e', '#2a0a2e'],
    vignette: 'radial-gradient(ellipse at 50% 30%,rgba(11,4,18,0) 0%,rgba(11,4,18,.55) 70%,rgba(11,4,18,.9) 100%)',
    logoGlow: 'drop-shadow(0 0 24px rgba(255,122,26,.35))',
    topBar: 'linear-gradient(90deg,#ff7a1a,#8a2be2 50%,#9dff3a)',
    team1Frame: 'linear-gradient(135deg,#ff7a1a,#8a2be2)',
    team1FrameGlow: '0 0 50px rgba(255,122,26,.35)',
    team1WonText: 'linear-gradient(180deg,#fff 30%,#ffd0a0)',
    team1WonGlow: 'drop-shadow(0 0 30px rgba(255,122,26,.55))',
    team2Frame: 'linear-gradient(135deg,#9dff3a,#ff7a1a)',
    team2FrameGlow: '0 0 50px rgba(157,255,58,.35)',
    team2WonText: 'linear-gradient(180deg,#fff 30%,#d9ffb0)',
    team2WonGlow: 'drop-shadow(0 0 30px rgba(157,255,58,.5))',
    logoTileBg: '#140818',
    centerGlow: 'inset 0 0 60px rgba(138,43,226,.35),0 0 80px rgba(138,43,226,.25)',
    pillBg: 'linear-gradient(90deg,#ff7a1a 0%,#ff6a3d 55%,#ffb347 100%)',
    pillFont: "400 40px/1 'Creepster',cursive",
    pillLetterSpacing: '.08em',
    pillColor: '#1a0610',
    pillGlow: '0 0 40px rgba(255,122,26,.45),inset 0 1px 0 rgba(255,255,255,.5)',
    dash: 'linear-gradient(90deg,#ff7a1a,#9dff3a)',
    dashGlow: '0 0 30px rgba(255,122,26,.8)',
    cardLabel: 'linear-gradient(90deg,#ffd0a0,#d9ffb0)',
    upNextBadge: 'rgba(138,43,226,.45)',
    serveDot: '#9dff3a',
  },
  diwali: {
    ...DEFAULT_THEME,
    pageBg: '#12051f',
    canvasBg: '#12051f',
    palette: ['#ff8a1c', '#e0218a', '#ffd166', '#3a0a2a'],
    blobOpacity: 0.8,
    blobBlurBoost: 10,
    vignette: 'radial-gradient(ellipse at 50% 30%,rgba(18,5,31,0) 0%,rgba(18,5,31,.5) 70%,rgba(18,5,31,.88) 100%)',
    logoGlow: 'drop-shadow(0 0 24px rgba(255,209,102,.4))',
    scoreboardBorder: '1px solid rgba(255,209,102,.22)',
    topBar: 'linear-gradient(90deg,#ff8a1c,#e0218a 50%,#ffd166)',
    team1Frame: 'linear-gradient(135deg,#ff8a1c,#e0218a)',
    team1FrameGlow: '0 0 50px rgba(255,138,28,.4)',
    team1WonText: 'linear-gradient(180deg,#fff 30%,#ffd166)',
    team1WonGlow: 'drop-shadow(0 0 30px rgba(255,209,102,.55))',
    team2Frame: 'linear-gradient(135deg,#ffd166,#e0218a)',
    team2FrameGlow: '0 0 50px rgba(224,33,138,.35)',
    team2WonText: 'linear-gradient(180deg,#fff 30%,#ffb3d9)',
    team2WonGlow: 'drop-shadow(0 0 30px rgba(224,33,138,.5))',
    wonLabel: 'rgba(255,255,255,.65)',
    logoTileBg: '#1c0820',
    centerBg: 'linear-gradient(180deg,rgba(40,6,30,.92),rgba(24,4,40,.92))',
    centerBorder: '1px solid rgba(255,209,102,.25)',
    centerGlow: 'inset 0 0 60px rgba(255,138,28,.22),0 0 80px rgba(224,33,138,.25)',
    pillBg: 'linear-gradient(90deg,#ffb347 0%,#ffd166 50%,#ff8a1c 100%)',
    pillPadding: '12px 34px 10px',
    pillFont: "400 40px/1.1 'Yatra One',cursive",
    pillLetterSpacing: '.04em',
    pillTransform: 'none',
    pillColor: '#3a0718',
    pillGlow: '0 0 40px rgba(255,209,102,.5),inset 0 1px 0 rgba(255,255,255,.6)',
    scoreGlow: '0 0 40px rgba(255,209,102,.4)',
    dash: 'linear-gradient(90deg,#ff8a1c,#e0218a)',
    dashGlow: '0 0 30px rgba(255,138,28,.8)',
    cardBorder: '1px solid rgba(255,209,102,.18)',
    cardLabel: 'linear-gradient(90deg,#ffd166,#ff9ccf)',
    upNextBadge: 'rgba(224,33,138,.45)',
    winBg: 'rgba(255,209,102,.14)',
    winBorder: 'rgba(255,209,102,.45)',
    serveDot: '#ffd166',
  },
  childrensDay: {
    ...DEFAULT_THEME,
    pageBg: '#0a1640',
    canvasBg: '#0a1640',
    palette: ['#ff4d4d', '#2f8cff', '#ffd166', '#14246b'],
    blobColors: ['#2f8cff', '#ff4d4d', '#ffd166', '#5ee6c8'],
    blobOpacity: 0.7,
    blobBlurBoost: 10,
    vignette: 'radial-gradient(ellipse at 50% 30%,rgba(10,22,64,0) 0%,rgba(10,22,64,.5) 70%,rgba(10,22,64,.88) 100%)',
    logoGlow: 'drop-shadow(0 0 24px rgba(255,209,102,.4))',
    scoreboardBorder: '1px solid rgba(255,209,102,.22)',
    topBar: 'linear-gradient(90deg,#ff4d4d,#2f8cff 50%,#ffd166)',
    team1Frame: 'linear-gradient(135deg,#ff4d4d,#2f8cff)',
    team1FrameGlow: '0 0 50px rgba(255,77,77,.4)',
    team1WonText: 'linear-gradient(180deg,#fff 30%,#ffd166)',
    team1WonGlow: 'drop-shadow(0 0 30px rgba(255,209,102,.55))',
    team2Frame: 'linear-gradient(135deg,#ffd166,#2f8cff)',
    team2FrameGlow: '0 0 50px rgba(47,140,255,.35)',
    team2WonText: 'linear-gradient(180deg,#fff 30%,#a8d4ff)',
    team2WonGlow: 'drop-shadow(0 0 30px rgba(47,140,255,.5))',
    wonLabel: 'rgba(255,255,255,.65)',
    logoTileBg: '#0f1d4f',
    centerBg: 'linear-gradient(180deg,rgba(16,30,90,.92),rgba(10,20,64,.92))',
    centerBorder: '1px solid rgba(255,209,102,.25)',
    centerGlow: 'inset 0 0 60px rgba(255,77,77,.22),0 0 80px rgba(47,140,255,.25)',
    pillBg: 'linear-gradient(90deg,#ffe066 0%,#ffd166 50%,#ff4d4d 100%)',
    pillPadding: '12px 34px 10px',
    pillFont: "800 42px/1.1 'Baloo 2',cursive",
    pillLetterSpacing: '.04em',
    pillTransform: 'none',
    pillColor: '#1a2366',
    pillGlow: '0 0 40px rgba(255,209,102,.5),inset 0 1px 0 rgba(255,255,255,.6)',
    scoreGlow: '0 0 40px rgba(255,209,102,.4)',
    dash: 'linear-gradient(90deg,#ff4d4d,#2f8cff)',
    dashGlow: '0 0 30px rgba(255,77,77,.8)',
    cardBorder: '1px solid rgba(255,209,102,.18)',
    cardLabel: 'linear-gradient(90deg,#ffd166,#7fd8ff)',
    upNextBadge: 'rgba(47,140,255,.45)',
    winBg: 'rgba(255,209,102,.14)',
    winBorder: 'rgba(255,209,102,.45)',
    serveDot: '#ffd166',
  },
  cinema: {
    ...DEFAULT_THEME,
    pageBg: '#08102e',
    canvasBg: '#08102e',
    // [red, deep, accent, sky]
    palette: ['#d42a37', '#7a1420', '#5a62e0', '#2e3192'],
    blobColors: ['#5a62e0', '#d42a37', 'transparent', 'transparent'],
    blobOpacity: 0.55,
    blobBlurBoost: 20,
    vignette: 'radial-gradient(ellipse at 50% 35%,rgba(8,16,46,0) 0%,rgba(8,16,46,.5) 70%,rgba(8,16,46,.9) 100%)',
    logoGlow: 'drop-shadow(0 0 24px rgba(90,98,224,.45))',
    scoreboardBorder: '1px solid rgba(90,98,224,.25)',
    topBar: 'linear-gradient(90deg,#d42a37,#5a62e0 50%,#d42a37)',
    team1Frame: 'linear-gradient(135deg,#5a62e0,#d42a37)',
    team1FrameGlow: '0 0 50px rgba(212,42,55,.45)',
    team1WonText: 'linear-gradient(180deg,#fff 30%,#5a62e0)',
    team1WonGlow: 'drop-shadow(0 0 30px rgba(90,98,224,.55))',
    team2Frame: 'linear-gradient(135deg,#d42a37,#5a62e0)',
    team2FrameGlow: '0 0 50px rgba(90,98,224,.35)',
    team2WonText: 'linear-gradient(180deg,#fff 30%,#5a62e0)',
    team2WonGlow: 'drop-shadow(0 0 30px rgba(90,98,224,.55))',
    wonLabel: 'rgba(255,255,255,.65)',
    logoTileBg: '#0c1438',
    centerBg: 'linear-gradient(180deg,rgba(14,24,72,.94),rgba(7,12,40,.94))',
    centerBorder: '1px solid rgba(90,98,224,.3)',
    centerGlow: 'inset 0 0 60px rgba(212,42,55,.28),0 0 80px rgba(90,98,224,.18)',
    pillBg: 'linear-gradient(180deg,#ffffff,#dfe3f5)',
    pillPadding: '10px 30px 8px',
    pillMargin: 0,
    pillRadius: 4,
    pillFont: "400 46px/1.05 'Limelight',serif",
    pillLetterSpacing: '.06em',
    pillColor: '#0c1a40',
    pillGlow: 'inset 0 0 14px rgba(12,26,64,.3)',
    scoreGlow: '0 0 40px rgba(90,98,224,.4)',
    dash: 'linear-gradient(90deg,#d42a37,#5a62e0)',
    dashGlow: '0 0 30px rgba(90,98,224,.7)',
    cardBorder: '1px solid rgba(90,98,224,.2)',
    cardLabel: 'linear-gradient(90deg,#ffffff,#ffffff)',
    upNextBadge: 'rgba(212,42,55,.45)',
    winBg: 'rgba(90,98,224,.14)',
    winBorder: 'rgba(90,98,224,.5)',
    serveDot: '#5a62e0',
  },
};

export const getJumbotronTheme = (name) => ({ name, ...(THEMES[name] || DEFAULT_THEME) });

export const JumbotronThemeStyles = ({ theme }) => {
  if (theme === 'halloween') return <HalloweenStyles />;
  if (theme === 'diwali') return <DiwaliStyles />;
  if (theme === 'childrensDay') return <ChildrensDayStyles />;
  if (theme === 'cinema') return <CinemaStyles />;
  return null;
};

// Decorations drawn over the colour blobs, under the vignette.
export const JumbotronThemeBackdrop = ({ theme, palette }) => {
  if (theme === 'halloween') return <HalloweenBackdrop palette={palette} />;
  if (theme === 'diwali') return <DiwaliBackdrop palette={palette} />;
  if (theme === 'childrensDay') return <ChildrensDayBackdrop palette={palette} />;
  if (theme === 'cinema') return <CinemaBackdrop palette={palette} />;
  return null;
};

// Decorations drawn over the vignette, under the scoreboard content.
export const JumbotronThemeForeground = ({ theme, palette }) => {
  if (theme === 'diwali') return <DiwaliForeground palette={palette} />;
  if (theme === 'childrensDay') return <ChildrensDayForeground palette={palette} />;
  if (theme === 'cinema') return <CinemaForeground palette={palette} />;
  return null;
};

// Optional frame around the match-type pill (cinema marquee sign); other themes render the pill as-is.
export const JumbotronPillFrame = ({ theme, children }) => {
  if (theme === 'cinema') return <CinemaMarquee>{children}</CinemaMarquee>;
  return children;
};

// A 0 score becomes the theme's icon (pumpkin / bhoochakra / pinwheel / film reel); any other value is shown as-is.
export const themedScore = (value, jt, delay = 0) => {
  if (value !== 0 && value !== '0') return value;
  if (jt.name === 'halloween') return <Pumpkin delay={delay} />;
  if (jt.name === 'diwali') return <Bhoochakra delay={delay * 0.35} palette={jt.palette} />;
  if (jt.name === 'childrensDay') return <Pinwheel delay={delay * 0.46} palette={jt.palette} />;
  if (jt.name === 'cinema') return <FilmReel delay={delay * 0.62} palette={jt.palette} />;
  return value;
};

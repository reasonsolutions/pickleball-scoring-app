import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';
import CCPLPartners from '../components/CCPLPartners';
import terminusLogo from '../assets/terminus_ccpl.png';
import CCPLTopBar from '../components/CCPLTopBar';
import { createDateTime } from '../utils/dateTimeUtils';

const ORANGE = '#e27b46';
const INK = '#0b0b0c';
const PAPER = '#f2f0ea';
const ZUUME = "'Zuume Cut', sans-serif";
const SLIDE_INTERVAL = 7; // seconds

// Fill these in once the apps are live; until then the buttons show "Coming soon".
const APP_STORE_URL = '';
const PLAY_STORE_URL = '';

const CHAMPIONS_IMAGE = 'https://res.cloudinary.com/dnfcybtnn/image/upload/v1787660162/mavericks_win_e9swg5.jpg';
const YOUTUBE_CHANNEL = 'https://www.youtube.com/@CentreCourtPickleballLeague';

const articleImage = (a) => a?.featuredImage?.secure_url || a?.featuredImage?.url || '/images/ccpl-news-feature.png';

const formatPublishDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const hideBrokenImage = (e) => {
  e.target.style.display = 'none';
  e.target.parentElement.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #0b0b0c 100%)';
};

// Skewed button shell used across the page
function Skew({ as: Tag = 'span', className, style, innerStyle, children, ...rest }) {
  return (
    <Tag className={className} style={{ display: 'inline-flex', transform: 'skewX(-14deg)', textDecoration: 'none', ...style }} {...rest}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', transform: 'skewX(14deg)', ...innerStyle }}>{children}</span>
    </Tag>
  );
}

const Arrow = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

const eyebrow = (color) => ({ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.12em', textTransform: 'uppercase', color, marginBottom: '8px' });

export default function CCPLHome() {
  const [openRule, setOpenRule] = useState(0);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1000);
  const [countdown, setCountdown] = useState({ days: '0', hours: '00', mins: '00', secs: '00' });
  const [fixtureStarts, setFixtureStarts] = useState([]);
  const [nextFixture, setNextFixture] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  const [featuredArticle, setFeaturedArticle] = useState(null);

  // Hero carousel
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const touchX = useRef(0);

  // Videos
  const [videos, setVideos] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  // Season 1 champions team page
  const [championsTeamPath, setChampionsTeamPath] = useState('/ccpl-teams');

  const pageRef = useRef(null);

  const toggleRule = (i) => {
    setOpenRule(prev => prev === i ? -1 : i);
  };

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth < 1000);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Fetch news articles
  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Fetch all latest articles
        const newsQuery = query(
          collection(db, 'news'),
          orderBy('publishDate', 'desc'),
          limit(4)
        );
        const newsSnapshot = await getDocs(newsQuery);
        const allArticles = newsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Find featured article (first one with featured=true)
        const featured = allArticles.find(article => article.featured === true);
        if (featured) {
          setFeaturedArticle(featured);
          // Set remaining articles (excluding the featured one)
          setNewsArticles(allArticles.filter(article => article.id !== featured.id).slice(0, 3));
        } else {
          // If no featured article, use first as featured and rest as articles
          setFeaturedArticle(allArticles[0] || null);
          setNewsArticles(allArticles.slice(1, 4));
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      }
    };

    fetchNews();
  }, []);

  // Fetch admin-managed featured videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const videosQuery = query(collection(db, 'featuredVideos'), orderBy('createdAt', 'desc'), limit(6));
        const snapshot = await getDocs(videosQuery);
        setVideos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.videoId));
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    };

    fetchVideos();
  }, []);

  // Resolve The Mavericks' team page in the active tournament
  useEffect(() => {
    const fetchChampionsTeam = async () => {
      try {
        const settings = await getDoc(doc(db, 'app-settings', 'mobile-app'));
        const tournamentId = settings.exists() ? settings.data().activeTournamentId : null;
        if (!tournamentId) return;
        const snap = await getDocs(query(collection(db, 'teams'), where('tournamentId', '==', tournamentId)));
        const team = snap.docs.find(d => /mavericks/i.test(d.data().name || ''));
        if (team) setChampionsTeamPath(`/ccpl-teams/${team.id}`);
      } catch (error) {
        console.error('Error fetching champions team:', error);
      }
    };

    fetchChampionsTeam();
  }, []);

  // Start times of every upcoming fixture in the active tournament
  useEffect(() => {
    const fetchFixtureStarts = async () => {
      try {
        const settings = await getDoc(doc(db, 'app-settings', 'mobile-app'));
        const tournamentId = settings.exists() ? settings.data().activeTournamentId : null;
        if (!tournamentId) return;
        const snap = await getDocs(query(collection(db, 'fixtures'), where('tournamentId', '==', tournamentId)));
        const starts = snap.docs
          .map(d => d.data())
          .filter(m => m.date && (m.playingTime || m.time) && m.status !== 'completed')
          .map(m => ({
            start: createDateTime(m.date, m.playingTime || m.time).getTime(),
            team1Name: m.team1Name,
            team2Name: m.team2Name,
          }))
          .filter(f => f.start > 0)
          .sort((a, b) => a.start - b.start);
        setFixtureStarts(starts);
      } catch (error) {
        console.error('Error fetching fixtures for countdown:', error);
      }
    };

    fetchFixtureStarts();
  }, []);

  // Countdown to the next fixture; rolls over to the following one once it starts
  useEffect(() => {
    const calculateCountdown = () => {
      const now = Date.now();
      const next = fixtureStarts.find(f => f.start > now) || null;
      setNextFixture(prev => (prev?.start === next?.start ? prev : next));
      const diff = next ? next.start - now : 0;
      const s = Math.floor(diff / 1000);
      const pad = n => String(n).padStart(2, '0');

      setCountdown({
        days: String(Math.floor(s / 86400)),
        hours: pad(Math.floor(s / 3600) % 24),
        mins: pad(Math.floor(s / 60) % 60),
        secs: pad(s % 60),
      });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [fixtureStarts]);

  const nextFixtureDate = nextFixture ? new Date(nextFixture.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'To be announced';
  const nextFixtureTime = nextFixture ? new Date(nextFixture.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' IST' : '';

  // Fade-up reveal for sections as they scroll into view
  useEffect(() => {
    // data-reveal="1" = waiting, "done" = shown. Re-runs pick up anything still waiting.
    const els = pageRef.current?.querySelectorAll('[data-reveal="1"]') || [];
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.dataset.reveal = 'done';
      e.target.style.opacity = '1';
      e.target.style.transform = 'none';
      io.unobserve(e.target);
    }), { threshold: 0.1 });
    els.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(32px)';
      el.style.transition = 'opacity .7s ease, transform .8s cubic-bezier(.2,.7,.2,1)';
      io.observe(el);
    });
    return () => io.disconnect();
  }, [videos.length, isMobile]);

  // Lightbox keyboard controls
  useEffect(() => {
    if (lightboxIndex < 0) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(-1);
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % videos.length);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i - 1 + videos.length) % videos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, videos.length]);

  const rulesData = [
    { title: 'Registration', body: 'Registration does not guarantee eligibility. Players registered will be evaluated against eligibility criteria and approved accordingly.' },
    { title: 'Player Eligibility', body: 'Players who have registered/participated in the CCPL Hyderabad S1 (formerly HPL S1) and participated in the CCPL Club League S1 (formerly HPL Club League S1), along with players who can provide proof of residence in Hyderabad, are eligible to register.' },
    { title: 'Player Auction Purse', body: 'Each of the eight franchises will be allocated a Player Auction Purse of ₹10,00,000 (Rupees Ten Lakhs). The Auction Purse shall be used exclusively to acquire players through the Player Auction and to constitute a 10-player squad for the season.' },
    { title: 'Schedule', body: 'The Centre Court Pickleball League (CCPL) Season 2 will be held in Hyderabad from 17 October to 12 December 2026, with league fixtures scheduled on Saturdays during this period. The CCPL Season 2 Player Auction will be held on 5 September 2026. The detailed match schedule, venues and timings will be communicated separately by the League.' },
    { title: 'Player Availability', body: 'Selected players must be available for all fixtures they have declared to be available for and honour their team commitments throughout the season. In case of wrong declarations, player will lose the opportunity to participate on the matchday they declare as being unavailable.' },
    { title: 'Practice', body: 'Players will be required to declare the availability for a minimum of 2 practice sessions per week from September 17th until the end of the league.' },
    { title: 'Unselected Players', body: 'All players not selected in the auction form the reserve pool and teams may pick them up in the single transfer window which will open post Matchday 3 before Matchday 4.' },
    { title: 'Rules & Conduct', body: 'All players must follow the league rules, match regulations, code of conduct and decisions of league officials.' },
  ];

  // ---- Hero slides: featured article first, then the latest news ----
  const slides = [featuredArticle, ...newsArticles].filter(Boolean).map((a, k) => ({
    id: a.id,
    tag: k === 0 ? 'Featured' : 'News',
    meta: formatPublishDate(a.publishDate),
    title: a.title,
    sub: a.subtext || '',
    image: articleImage(a),
  }));
  const slideCount = slides.length;
  const current = slideCount ? slideIndex % slideCount : 0;
  const goTo = (n) => {
    if (!slideCount) return;
    setSlideIndex((n + slideCount) % slideCount);
    setCycle(c => c + 1);
  };

  const countdownUnits = [
    { v: countdown.hours, l: 'Hrs' },
    { v: countdown.mins, l: 'Min' },
    { v: countdown.secs, l: 'Sec' },
  ];

  const activeVideo = videos[lightboxIndex];

  return (
    <>
      <style>{`
        .ccpl-container {
          background: ${INK};
          color: #fff;
          font-family: 'Montserrat', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .ccpl-container ::selection { background: ${ORANGE}; color: ${INK}; }
        /* A global stylesheet forces Manrope on spans; follow the parent's font instead */
        .ccpl-container span { font-family: inherit; }

        @keyframes ccFill { from { width: 0; } to { width: 100%; } }
        @keyframes ccFloat { 0%,100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-18px) rotate(-5deg); } }
        @keyframes ccShadow { 0%,100% { transform: scaleX(1); opacity: .28; } 50% { transform: scaleX(.82); opacity: .16; } }

        .cc-btn-orange { background: ${ORANGE}; color: ${INK}; transition: background .2s ease, color .2s ease; }
        .cc-btn-orange:hover { background: #fff; color: ${INK}; }
        .cc-btn-ink { background: ${INK}; color: #fff; transition: background .2s ease, color .2s ease; }
        .cc-btn-ink:hover { background: ${ORANGE}; color: ${INK}; }
        .cc-btn-outline-ink { box-shadow: inset 0 0 0 2px ${INK}; color: ${INK}; transition: background .2s ease, color .2s ease; }
        .cc-btn-outline-ink:hover { background: ${INK}; color: #fff; }
        .cc-btn-outline-light { box-shadow: inset 0 0 0 2px rgba(255,255,255,.35); color: #fff; transition: box-shadow .2s ease; }
        .cc-btn-outline-light:hover { box-shadow: inset 0 0 0 2px ${ORANGE}; color: #fff; }
        .cc-hero-dot:hover { background: rgba(255,255,255,.06) !important; }
        .cc-hero-prev:hover { background: #fff !important; color: ${INK} !important; }
        .cc-hero-next:hover { background: #fff !important; }
        .cc-media:hover { outline: 3px solid ${ORANGE}; outline-offset: -3px; }
        .cc-media img { transition: transform .6s cubic-bezier(.2,.7,.2,1); }
        .cc-media:hover img { transform: scale(1.04); }
        .cc-lb-nav:hover { background: ${ORANGE} !important; }
        .cc-lb-close:hover { background: #fff !important; }
        .cc-lb-link:hover { background: #fff; color: ${INK} !important; }
      `}</style>

      <div className="ccpl-container" ref={pageRef}>
        <CCPLTopBar activeLeague="ccpl-s2" />

        {/* Navigation */}
        <CCPLNavbar activePage="overview" />

        {/* ===== Hero carousel ===== */}
        <section
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
          }}
          style={{ position: 'relative', height: 'calc(100svh - 147px)', minHeight: isMobile ? '560px' : '680px', maxHeight: '960px', overflow: 'hidden', background: INK }}
        >
          {slideCount === 0 && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a1a 0%, #0b0b0c 100%)' }}>
              <div style={{ position: 'absolute', left: '6vw', bottom: isMobile ? '96px' : '120px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(52px,8vw,120px)', lineHeight: .88, textTransform: 'uppercase', color: 'rgba(255,255,255,.4)' }}>
                Loading...
              </div>
            </div>
          )}

          {slides.map((s, k) => {
            const on = k === current;
            return (
              <div key={s.id} style={{ position: 'absolute', inset: 0, transition: 'opacity .9s ease', opacity: on ? 1 : 0, zIndex: on ? 2 : 1, pointerEvents: on ? 'auto' : 'none' }}>
                <div style={{ position: 'absolute', inset: 0, transition: 'transform 8s linear', transform: `scale(${on ? 1.08 : 1})` }}>
                  <img src={s.image} alt="" onError={hideBrokenImage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg,rgba(11,11,12,.92) 0%,rgba(11,11,12,.55) 45%,rgba(11,11,12,.1) 80%),linear-gradient(0deg,rgba(11,11,12,.92) 0%,rgba(11,11,12,0) 40%)' }}></div>
                <div style={{ position: 'absolute', left: '-1vw', top: '2vw', pointerEvents: 'none', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(200px,30vw,480px)', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.14)', transition: 'transform 1.2s cubic-bezier(.2,.7,.2,1),opacity 1s ease', transform: `translateX(${on ? '0px' : '-12vw'})`, opacity: on ? 1 : 0 }}>
                  {String(k + 1).padStart(2, '0')}
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'none', padding: `0 6vw ${isMobile ? '96px' : '120px'}` }}>
                  <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ maxWidth: isMobile ? '100%' : 'calc(100% - 440px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', transition: 'opacity .5s ease .2s,transform .6s cubic-bezier(.2,.7,.2,1) .2s', opacity: on ? 1 : 0, transform: `translateX(${on ? '0px' : '-30px'})` }}>
                        <Skew style={{ background: ORANGE, padding: '8px 16px', flex: 'none' }} innerStyle={{ fontWeight: 800, fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: INK }}>
                          {s.tag}
                        </Skew>
                        {s.meta && <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#fff' }}>{s.meta}</span>}
                      </div>
                      <h1 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', fontSize: s.title.length > 60 ? 'clamp(40px,min(5.4vw,7.5vh),92px)' : 'clamp(52px,min(8vw,11vh),140px)', lineHeight: .88, letterSpacing: '-.005em', textWrap: 'balance', transition: 'clip-path 1s cubic-bezier(.7,0,.2,1) .3s', clipPath: on ? 'inset(-0.25em -0.4em -0.25em -0.25em)' : 'inset(-0.25em 100% -0.25em -0.25em)' }}>
                        {s.title}
                      </h1>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px 28px', marginTop: '26px', transition: 'opacity .6s ease .6s,transform .6s ease .6s', opacity: on ? 1 : 0, transform: `translateY(${on ? '0px' : '16px'})` }}>
                        {s.sub && (
                          <p style={{ margin: 0, color: '#e8e8e8', fontSize: 'clamp(15px,1.4vw,18px)', fontWeight: 500, lineHeight: 1.5, maxWidth: '42ch', borderLeft: `4px solid ${ORANGE}`, paddingLeft: '16px' }}>{s.sub}</p>
                        )}
                        <Skew as={Link} to={`/news/${s.id}`} className="cc-btn-orange" style={{ pointerEvents: 'auto', padding: '15px 28px' }} innerStyle={{ gap: '12px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                          Read Story <Arrow size={18} />
                        </Skew>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Countdown card (desktop) */}
          {!isMobile && (
            <div style={{ position: 'absolute', right: 'calc(max(0px, (100% - 1600px) / 2) + 6vw)', top: '48px', zIndex: 6, width: '380px', background: 'rgba(11,11,12,.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.16)', borderTop: `6px solid ${ORANGE}`, padding: '26px 28px 24px', color: '#fff', boxSizing: 'border-box' }}>
              <CountdownHeader />
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginTop: '10px' }}>
                <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '150px', lineHeight: .8, color: ORANGE }}>{countdown.days}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', paddingBottom: '8px' }}>Days</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '6px', marginTop: '22px' }}>
                {countdownUnits.map(u => <CountdownUnit key={u.l} {...u} />)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,.16)', fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>
                <span>{nextFixtureDate}</span><span>{nextFixtureTime}</span>
              </div>
            </div>
          )}

          {/* Slide selector strip */}
          {slideCount > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5, background: 'rgba(11,11,12,.85)', backdropFilter: 'blur(6px)', borderTop: '1px solid rgba(255,255,255,.12)' }}>
              <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 6vw', display: 'flex', alignItems: 'stretch', boxSizing: 'content-box' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: `repeat(${slideCount},minmax(0,1fr))` }}>
                  {slides.map((s, k) => {
                    const on = k === current;
                    const fillBase = { position: 'absolute', left: 0, top: 0, bottom: 0, background: ORANGE };
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="cc-hero-dot"
                        onClick={() => goTo(k)}
                        style={{ position: 'relative', textAlign: 'left', border: 0, borderRight: '1px solid rgba(255,255,255,.12)', padding: '16px clamp(10px,1.4vw,20px)', cursor: 'pointer', color: '#fff', fontFamily: "'Montserrat', sans-serif", background: on ? 'rgba(255,255,255,.06)' : 'transparent', transition: 'background .3s ease' }}
                      >
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '-1px', height: '3px', background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                          {on && slideCount > 1 ? (
                            <div
                              key={`fill-${k}-${cycle}`}
                              onAnimationEnd={() => goTo(current + 1)}
                              style={{ ...fillBase, width: 0, animation: `ccFill ${SLIDE_INTERVAL}s linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
                            />
                          ) : (
                            <div style={{ ...fillBase, width: on ? '100%' : 0 }} />
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', transition: 'opacity .3s ease', opacity: on ? 1 : .55 }}>
                          <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '24px', color: ORANGE }}>{String(k + 1).padStart(2, '0')}</span>
                          {!isMobile && (
                            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex' }}>
                  <button type="button" className="cc-hero-prev" onClick={() => goTo(current - 1)} aria-label="Previous story" style={{ width: '60px', border: 0, borderRight: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .2s ease,color .2s ease' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M15 5l-7 7 7 7" /></svg>
                  </button>
                  <button type="button" className="cc-hero-next" onClick={() => goTo(current + 1)} aria-label="Next story" style={{ width: '60px', border: 0, background: ORANGE, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .2s ease' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== Countdown (mobile) ===== */}
        {isMobile && (
          <section style={{ background: INK, color: '#fff', padding: '36px 6vw 40px', borderBottom: `6px solid ${ORANGE}` }}>
            <CountdownHeader />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginTop: '14px' }}>
              <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '120px', lineHeight: .8, color: ORANGE }}>{countdown.days}</span>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '6px' }}>
                {countdownUnits.map(u => <CountdownUnit key={u.l} {...u} compact />)}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', fontSize: '12px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>
              <span>{nextFixtureDate}</span><span>{nextFixtureTime}</span>
            </div>
          </section>
        )}

        {/* ===== Season 1 Champions ===== */}
        <section style={{ position: 'relative', background: PAPER, color: INK, padding: 'clamp(64px,8vw,110px) 6vw', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '10px', background: ORANGE, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}></div>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1.3fr)', gap: 'clamp(28px,4vw,56px)', alignItems: 'center' }}>
            <div data-reveal="1">
              <div style={eyebrow('#b3261a')}>Season 1 Champions</div>
              <h2 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(72px,10vw,160px)', lineHeight: .82, letterSpacing: '-.01em' }}>
                The <span style={{ color: ORANGE, fontFamily: ZUUME }}>Mavericks</span>
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '32px' }}>
                <Skew as={Link} to={championsTeamPath} className="cc-btn-ink" style={{ padding: '14px 26px' }} innerStyle={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '21px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  Meet the team <Arrow />
                </Skew>
                <Skew as={Link} to="/ccpl-fixtures" className="cc-btn-outline-ink" style={{ padding: '14px 26px' }} innerStyle={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '21px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  Season 2 Fixtures
                </Skew>
              </div>
            </div>
            <div data-reveal="1" style={{ position: 'relative', aspectRatio: '16/10', border: `2px solid ${INK}`, background: INK, overflow: 'hidden' }}>
              <img src={CHAMPIONS_IMAGE} alt="The Mavericks - Season 1 Champions" onError={hideBrokenImage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', left: 0, bottom: 0, display: 'inline-flex', background: ORANGE, padding: '10px 20px 10px 18px', clipPath: 'polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%)', pointerEvents: 'none' }}>
                <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.06em', textTransform: 'uppercase', color: INK }}>HPL S1 · 2025</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Videos ===== */}
        {videos.length > 0 && (
          <section style={{ position: 'relative', background: INK, color: '#fff', padding: 'clamp(64px,8vw,110px) 6vw' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', marginBottom: 'clamp(28px,3.5vw,48px)' }}>
                <div>
                  <div style={eyebrow(ORANGE)}>Watch</div>
                  <h2 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(64px,8vw,128px)', lineHeight: .85 }}>Videos &amp; Reels</h2>
                </div>
                <Skew as={Link} to="/videos" className="cc-btn-outline-light" style={{ height: '44px', padding: '0 24px', alignItems: 'center' }} innerStyle={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  All Videos <Arrow />
                </Skew>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 1 : 2},minmax(0,1fr))`, gap: 'clamp(12px,1.4vw,20px)' }}>
                {videos.map((v, k) => (
                  <div
                    key={v.id}
                    data-reveal="1"
                    className="cc-media"
                    role="button"
                    tabIndex={0}
                    onClick={() => setLightboxIndex(k)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setLightboxIndex(k); }}
                    style={{ position: 'relative', aspectRatio: '16/9', background: '#161617', overflow: 'hidden', cursor: 'pointer' }}
                  >
                    <img src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`} alt="" onError={hideBrokenImage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', background: 'linear-gradient(to top,rgba(11,11,12,.92),rgba(11,11,12,0))', pointerEvents: 'none' }}></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 16px 7px 12px', background: ORANGE, color: INK, clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)', pointerEvents: 'none', fontSize: '11px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                      <span style={{ width: '7px', height: '7px', background: 'currentColor', display: 'inline-block' }}></span>YouTube
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) skewX(-14deg)', width: '64px', height: '46px', background: ORANGE, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'skewX(14deg)' }}><path d="M7 4l13 8-13 8z" /></svg>
                    </div>
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 18px', pointerEvents: 'none' }}>
                      {v.description && (
                        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.75)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.description}</div>
                      )}
                      <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(24px,2.2vw,34px)', lineHeight: .95, textTransform: 'uppercase', textWrap: 'pretty' }}>{v.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lightbox */}
            {activeVideo && (
              <div onClick={() => setLightboxIndex(-1)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(11,11,12,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px,2vw,32px)', padding: '24px', boxSizing: 'border-box' }}>
                {videos.length > 1 && !isMobile && (
                  <button type="button" className="cc-lb-nav" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + videos.length) % videos.length); }} style={lbNavStyle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M20 12H5M11 6l-6 6 6 6" /></svg>
                  </button>
                )}
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: 'min(1100px, calc((100vh - 200px) * 16 / 9))', maxWidth: '100%' }}>
                  <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%', background: '#000', overflow: 'hidden' }}>
                    <iframe
                      key={activeVideo.id}
                      src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0`}
                      title={activeVideo.title}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: ORANGE, marginBottom: '6px' }}>
                        YouTube{activeVideo.description ? ` · ${activeVideo.description}` : ''}
                      </div>
                      <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(24px,2.4vw,36px)', lineHeight: .95, textTransform: 'uppercase', color: '#fff' }}>{activeVideo.title}</div>
                    </div>
                    <Skew as="a" href={activeVideo.youtubeUrl || YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className="cc-lb-link" style={{ border: '2px solid #fff', color: '#fff', padding: '10px 20px' }} innerStyle={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '18px', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                      Watch on YouTube
                    </Skew>
                  </div>
                </div>
                {videos.length > 1 && !isMobile && (
                  <button type="button" className="cc-lb-nav" aria-label="Next" onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % videos.length); }} style={lbNavStyle}>
                    <Arrow size={20} />
                  </button>
                )}
                <button type="button" className="cc-lb-close" aria-label="Close" onClick={() => setLightboxIndex(-1)} style={{ position: 'absolute', top: '20px', right: '20px', width: '48px', height: '48px', border: 0, background: ORANGE, color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 5l14 14M19 5L5 19" /></svg>
                </button>
              </div>
            )}
          </section>
        )}

        <CCPLPartners />

        {/* ===== Mobile App ===== */}
        <section style={{ position: 'relative', background: PAPER, color: INK, padding: 'clamp(64px,8vw,110px) 6vw', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '38%', height: '10px', background: ORANGE, clipPath: 'polygon(10px 0,100% 0,100% 100%,0 100%)' }}></div>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 'clamp(40px,5vw,80px)', alignItems: 'center' }}>
            <div data-reveal="1">
              <div style={eyebrow('#b3261a')}>CCPL Mobile App</div>
              <h2 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(64px,8vw,128px)', lineHeight: .85, letterSpacing: '-.01em', textWrap: 'balance' }}>
                The league in <span style={{ color: ORANGE, fontFamily: ZUUME }}>your pocket</span>
              </h2>
              <p style={{ margin: '24px 0 0', maxWidth: '46ch', fontSize: 'clamp(15px,1.3vw,18px)', fontWeight: 500, lineHeight: 1.55, borderLeft: `4px solid ${ORANGE}`, paddingLeft: '16px', textWrap: 'pretty' }}>
                Live scores, fixtures, standings and auction updates from every match day, with alerts the moment your team takes the court.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '34px' }}>
                <StoreButton href={APP_STORE_URL} kicker="Download on the" label="App Store" className="cc-btn-ink" />
                <StoreButton href={PLAY_STORE_URL} kicker="Get it on" label="Google Play" className="cc-btn-outline-ink" />
              </div>
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'clamp(480px,48vw,640px)' }}>
              <div style={{ position: 'absolute', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(200px,26vw,400px)', lineHeight: .8, color: 'transparent', WebkitTextStroke: '2px rgba(11,11,12,.12)', pointerEvents: 'none' }}>CCPL</div>
              <div style={{ position: 'absolute', width: 'clamp(240px,24vw,340px)', height: 'clamp(380px,40vw,540px)', background: ORANGE, transform: 'skewX(-14deg) translateX(10%)' }}></div>
              <div style={{ position: 'absolute', bottom: 0, width: 'clamp(180px,18vw,240px)', height: '22px', borderRadius: '50%', background: INK, filter: 'blur(10px)', animation: 'ccShadow 5s ease-in-out infinite' }}></div>
              <div style={{ position: 'relative', width: 'clamp(230px,22vw,300px)', aspectRatio: '9/19', background: INK, borderRadius: 'clamp(34px,3.4vw,46px)', padding: '10px', boxSizing: 'border-box', boxShadow: '0 40px 80px -20px rgba(11,11,12,.55),inset 0 0 0 2px #2a2a2c', animation: 'ccFloat 5s ease-in-out infinite' }}>
                <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 'clamp(26px,2.7vw,37px)', overflow: 'hidden', background: '#161617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
                  <img src={terminusLogo} alt="CCPL" style={{ width: '62%', height: 'auto' }} />
                  <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.08em', textTransform: 'uppercase', color: ORANGE }}>Live Scores</span>
                  <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '32%', height: '24px', borderRadius: '14px', background: INK, pointerEvents: 'none' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <CCPLFooter above={PAPER} />
    </>
  );
}

const lbNavStyle = { flex: 'none', width: '52px', height: '52px', border: 0, background: '#fff', color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' };

function CountdownHeader() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: ORANGE }}>
        <span style={{ width: '8px', height: '8px', background: ORANGE, display: 'inline-block' }}></span>Next Fixture
      </div>
      <div style={{ marginTop: '10px', fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '34px', lineHeight: .95, textTransform: 'uppercase' }}>Days to go until next match</div>
    </>
  );
}

function CountdownUnit({ v, l, compact }) {
  return (
    <div style={{ background: '#fff', color: INK, padding: compact ? '8px 0 6px' : '10px 0 8px', textAlign: 'center', clipPath: compact ? 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' : 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
      <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: compact ? '30px' : '40px', lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: compact ? '.14em' : '.18em', textTransform: 'uppercase', marginTop: compact ? 0 : '2px' }}>{l}</div>
    </div>
  );
}

function StoreButton({ href, kicker, label, className }) {
  const live = Boolean(href);
  return (
    <Skew
      as={live ? 'a' : 'span'}
      {...(live ? { href, target: '_blank', rel: 'noopener noreferrer' } : { 'aria-disabled': true })}
      className={live ? className : undefined}
      style={{
        padding: '12px 26px',
        ...(live ? {} : { boxShadow: `inset 0 0 0 2px rgba(11,11,12,.25)`, color: 'rgba(11,11,12,.45)', cursor: 'default' })
      }}
      innerStyle={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}
    >
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', opacity: .75 }}>{live ? kicker : 'Coming soon to'}</span>
      <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '26px', lineHeight: 1, letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</span>
    </Skew>
  );
}

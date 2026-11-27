import React, { useState, useEffect } from 'react';
import terminusSponsorLogo from '../assets/terminus_title_sponsor.png';
import klrLogo from '../assets/sponsor_klr_transformers.png';
import vijayaLogo from '../assets/sponsor_vijaya_diagnostic.webp';
import johnnieWalkerLogo from '../assets/sponsor_johnnie_walker_blonde.webp';
import locaLokaLogo from '../assets/sponsor_loca_loka.png';
import stupaLogo from '../assets/sponsor_stupa.png';

const ORANGE = '#e27b46';
const INK = '#0b0b0c';
const ZUUME = "'Zuume Cut', sans-serif";

// Partners section. Set `logo` to an image URL to replace the name placeholder;
// `dark: true` puts the logo on a dark tile (for white logos).
const TITLE_SPONSOR = { name: 'Terminus', role: 'Title Sponsor', logo: terminusSponsorLogo, dark: true };
const ASSOCIATE_SPONSORS = [
  // KLR's artwork has wide built-in padding, so it gets a smaller inset
  { name: 'KLR Transformers', role: 'KLR Transformers', logo: klrLogo, inset: '0%' },
  { name: 'Vijaya Diagnostic Centre', role: 'Vijaya Diagnostic Centre', logo: vijayaLogo },
];
const CO_SPONSORS = [
  { name: 'Johnnie Walker Blonde', role: 'Johnnie Walker Blonde', logo: johnnieWalkerLogo, inset: '6%' },
  { name: 'Loca Loka', role: 'Loca Loka', logo: locaLokaLogo },
  { name: 'Stupa', role: 'Stupa', logo: stupaLogo, inset: '6%' },
];

// "Our Partners" sponsor block, shared by the home and passes pages.
// `divider` draws the thin rule at the top, for when it follows another dark section.
export default function CCPLPartners({ divider = true }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1000);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1000);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <style>{`
        .cc-partner { transition: outline-color .2s ease; }
        .cc-partner:hover { outline: 3px solid ${ORANGE}; outline-offset: -3px; }
      `}</style>
    {/* Sized off the viewport height so the whole section fits in 80vh on desktop:
        --cc-s is a sponsor tile; the title tile spans both sponsor rows (--cc-t). */}
    <section style={{ position: 'relative', fontFamily: "'Montserrat', sans-serif", background: INK, color: '#fff', padding: '0 6vw clamp(24px,4vh,48px)', '--cc-s': 'clamp(70px,14vh,170px)', '--cc-t': 'calc(2 * var(--cc-s) + 92px)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', borderTop: divider ? '1px solid rgba(255,255,255,.14)' : 'none', paddingTop: 'clamp(24px,4vh,48px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', marginBottom: isMobile ? '12px' : 'clamp(16px,3vh,32px)' }}>
          <div>
            <div style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '20px', letterSpacing: '.12em', textTransform: 'uppercase', color: ORANGE, marginBottom: '8px' }}>Backed by the best</div>
            <h2 style={{ margin: 0, fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(44px,min(8vw,10vh),112px)', lineHeight: .85 }}>Our Partners</h2>
          </div>
          {!isMobile && <p style={{ margin: 0, maxWidth: '44ch', fontSize: 'clamp(14px,1.2vw,17px)', fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,.85)', borderLeft: `4px solid ${ORANGE}`, paddingLeft: '16px', textWrap: 'pretty' }}>
            Thank you to the partners who make the CCPL possible. Your support puts world-class pickleball on the court and in front of fans across Hyderabad.
          </p>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '16px' : 'clamp(24px,4vw,64px)' }}>
          <div style={{ flex: isMobile ? '1 1 100%' : '0 1 var(--cc-t)', minWidth: 0 }}>
            <PartnerHeading>Title Sponsor</PartnerHeading>
            <PartnerTile partner={TITLE_SPONSOR} inset="14%" caption={TITLE_SPONSOR.name} aspect={isMobile ? '4/1' : '1/1'} />
          </div>

          <div style={{ flex: '1 1 400px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '20px' }}>
            {[['Associate Sponsors', ASSOCIATE_SPONSORS], ['Co-Sponsors', CO_SPONSORS]].map(([heading, group]) => (
              <div key={heading}>
                <PartnerHeading>{heading}</PartnerHeading>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,var(--cc-s)))', gap: 'clamp(10px,1.2vw,16px)' }}>
                  {group.map((p) => (
                    <PartnerTile key={p.name} partner={p} inset={p.inset || '14%'} caption={p.role} aspect={isMobile ? '3/2' : '1/1'} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

function PartnerHeading({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
      <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: '22px', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: '2px', background: ORANGE }}></span>
    </div>
  );
}

function PartnerTile({ partner, inset, caption, aspect = '1/1' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
      <div className="cc-partner" style={{ position: 'relative', aspectRatio: aspect, background: partner.dark ? '#16161a' : '#fff', boxShadow: partner.dark ? 'inset 0 0 0 1px rgba(255,255,255,.14)' : 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {partner.logo ? (
            <img src={partner.logo} alt={partner.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontFamily: ZUUME, fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(22px,2.2vw,32px)', lineHeight: .95, textTransform: 'uppercase', textAlign: 'center', color: 'rgba(11,11,12,.35)' }}>{partner.name}</span>
          )}
        </div>
      </div>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', lineHeight: 1.3, textTransform: 'uppercase', color: 'rgba(255,255,255,.75)' }}>{caption}</div>
    </div>
  );
}

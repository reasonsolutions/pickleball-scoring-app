/**
 * Pass Template Generator (website-issued passes)
 * Page 1: the match day pass ticket. Page 2: Terms & Conditions.
 * Rendered by Puppeteer as A4 landscape (1123 x 794 px at 96 DPI).
 */

const fs = require('fs');
const path = require('path');
const terms = require('./passTerms');

const LOGO_DATA_URL = 'data:image/png;base64,' +
  fs.readFileSync(path.join(__dirname, 'assets', 'terminus_ccpl.png')).toString('base64');

const ORANGE = '#d97b3f';
const DIRECTIONS_URL = 'https://maps.app.goo.gl/64B4wVVaiCDxJ6aR7'; // Centre Court Pickleball Arena

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Shrink long guest names so they stay within two lines
const nameFontSize = (name) => {
  const longest = Math.max(...String(name).split(/\s+/).map(w => w.length), 0);
  if (name.length <= 20 && longest <= 10) return 78;
  if (name.length <= 28 && longest <= 13) return 62;
  if (name.length <= 34) return 48;
  return 42;
};

function renderTerms() {
  const sections = terms.sections.map(section => {
    const blocks = section.blocks.map(block => (block.type === 'list'
      ? `<ul>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : `<p>${escapeHtml(block.text)}</p>`)).join('');
    return `<section><h3>${escapeHtml(section.title)}</h3>${blocks}</section>`;
  }).join('');

  return `
  <div class="page terms">
    <header>
      <div class="t-title">${escapeHtml(terms.title)}</div>
      <div class="t-sub">${escapeHtml(terms.subtitle)}</div>
      <div class="t-venue">${escapeHtml(terms.venue)}</div>
    </header>
    <div class="t-cols">${sections}</div>
    <footer>
      ${terms.footer.map((line, i) => `<div${i === 0 ? ' class="t-strong"' : ''}>${escapeHtml(line)}</div>`).join('')}
    </footer>
  </div>`;
}

/**
 * @param {object} passData
 *   userName, eventName, dateTimeText (e.g. "Sun, Oct 18 · 4:00 PM"), venue,
 *   hostTeam, hostTeamLogoUrl (optional), passCode (e.g. "CCPL-HEIKQ-2"), passNumber, numPasses
 * @param {string} qrCodeDataUrl
 */
function generatePassHTML(passData, qrCodeDataUrl) {
  const {
    userName, eventName, dateTimeText, venue, hostTeam, hostTeamLogoUrl,
    passCode, passNumber, numPasses
  } = passData;

  // With several passes, each is numbered: "Name - 1", "Name - 2", ...
  const baseName = String(userName || 'Guest').trim();
  const suffix = numPasses > 1 ? ` - ${passNumber}` : '';
  const name = baseName + suffix;
  // Keep the last word and the number together so the number never wraps onto its own line
  const words = baseName.split(/\s+/);
  const lastWord = words.pop();
  const nameHtml = `${words.map(escapeHtml).join(' ')}${words.length ? ' ' : ''}<span style="white-space:nowrap;">${escapeHtml(lastWord + suffix)}</span>`;
  // Host team logo sits large on the right of the dark panel, faded in by a left-to-right gradient
  const hostLogo = hostTeamLogoUrl
    ? `<img class="host-watermark" src="${escapeHtml(hostTeamLogoUrl)}" alt=""><div class="host-fade"></div>`
    : '';
  const passCount = numPasses > 1
    ? `<div class="pass-count">Pass ${passNumber} of ${numPasses}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 1123px; height: 794px; overflow: hidden; position: relative; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }

  /* ---------- Page 1: ticket ---------- */
  .ticket-page { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; }
  .ticket { display: flex; width: 940px; height: 530px; border-radius: 24px; overflow: hidden; box-shadow: 0 28px 60px rgba(0,0,0,.22), 0 6px 16px rgba(0,0,0,.10); }
  .main { position: relative; flex: 1; background: #232323; color: #fff; padding: 42px 46px 40px; display: flex; flex-direction: column; border-top: 10px solid #0b0b0c; }
  .main > :not(.host-watermark):not(.host-fade) { position: relative; z-index: 2; }
  .host-watermark { position: absolute; z-index: 0; left: 56.3%; top: 33.5%; width: 222px; height: 222px; object-fit: contain; }
  .host-fade { position: absolute; z-index: 1; inset: 0; background: linear-gradient(to right, #232323 0%, #232323 41%, rgba(35,35,35,.15) 100%); }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { height: 72px; width: auto; display: block; }
  .kind { text-align: right; font-weight: 700; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; line-height: 1.6; }
  .kind .k1 { color: ${ORANGE}; }
  .kind .k2 { color: rgba(255,255,255,.62); }
  .eyebrow { margin-top: 24px; font-size: 15px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.62); }
  .name { margin: 6px 0 22px; font-family: 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; line-height: 1.04; letter-spacing: .005em; max-width: 400px; overflow-wrap: anywhere; }
  .divider { margin-top: auto; padding-top: 0; position: relative; top: -2px; border-top: 1px dashed rgba(255,255,255,.28); }
  .label { font-size: 11px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.55); margin-bottom: 8px; }
  .value { font-size: 17px; font-weight: 600; color: #fff; }
  .row { display: flex; gap: 28px; margin-top: 18px; }
  .row > div { min-width: 0; }

  .directions { display: inline-flex; align-items: center; gap: 12px; padding: 14px 26px; border-radius: 999px; background: #232323; color: #fff; text-decoration: none; font-size: 14px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; box-shadow: 0 10px 24px rgba(0,0,0,.16); }
  .directions .pin { width: 18px; height: 18px; flex: none; }
  .directions .venue { font-weight: 500; letter-spacing: .02em; text-transform: none; color: rgba(255,255,255,.62); }
  .directions .arrow { color: ${ORANGE}; font-size: 16px; }
  .stub { position: relative; width: 366px; background: ${ORANGE}; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .stub::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; border-left: 3px dashed rgba(255,255,255,.95); }
  .qr-box { width: 240px; height: 240px; background: #fff; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px rgba(0,0,0,.18); }
  .qr-box img { width: 206px; height: 206px; display: block; }
  .scan { margin-top: 24px; font-size: 14px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #1d1d1f; }
  .pass-id { margin-top: 6px; font-size: 12px; font-weight: 500; color: rgba(29,29,31,.72); }
  .pass-count { margin-top: 4px; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(29,29,31,.72); }

  /* ---------- Page 2: terms ---------- */
  .terms { padding: 34px 34px 22px; color: #1d1d1f; display: flex; flex-direction: column; }
  .t-title { font-size: 13px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
  .t-sub { font-size: 10px; font-weight: 700; margin-top: 2px; }
  .t-venue { font-size: 8.5px; color: #55555a; margin-top: 3px; }
  .t-cols { flex: 1; margin-top: 16px; column-count: 5; column-gap: 20px; column-fill: auto; font-size: 7.1px; line-height: 1.38; color: #3a3a3e; min-height: 0; }
  .t-cols section { margin-bottom: 9px; }
  .t-cols h3 { font-size: 7.9px; font-weight: 800; color: #1d1d1f; margin: 0 0 3px; break-after: avoid; }
  .t-cols p { margin: 0 0 4px; }
  .t-cols ul { margin: 0 0 4px; padding-left: 11px; }
  .t-cols li { margin: 0; }
  .terms footer { border-top: 1px solid #d4d4d8; padding-top: 9px; margin-top: 8px; font-size: 7.6px; line-height: 1.5; color: #3a3a3e; }
  .terms footer .t-strong { font-weight: 800; color: #1d1d1f; }
</style>
</head>
<body>
  <div class="page ticket-page">
    <div class="ticket">
      <div class="main">
        ${hostLogo}
        <div class="top">
          <img class="brand" src="${LOGO_DATA_URL}" alt="Terminus CCPL HYD">
          <div class="kind"><div class="k1">Match Day Pass</div><div class="k2">General Access</div></div>
        </div>
        <div class="eyebrow">${escapeHtml(eventName)}</div>
        <h1 class="name" style="font-size:${nameFontSize(name)}px;">${nameHtml}</h1>
        <div class="divider"></div>
        <div style="margin-top:18px;">
          <div class="label">Date &amp; Time</div>
          <div class="value">${escapeHtml(dateTimeText)}</div>
        </div>
        <div class="row">
          <div style="flex:1.5; white-space:nowrap;">
            <div class="label">Venue</div>
            <div class="value">${escapeHtml(venue)}</div>
          </div>
          <div style="flex:1;">
            <div class="label">Host Team</div>
            <div class="value">${escapeHtml(hostTeam || '—')}</div>
          </div>
        </div>
      </div>
      <div class="stub">
        <div class="qr-box"><img src="${qrCodeDataUrl}" alt="QR code"></div>
        <div class="scan">Scan at entry</div>
        <div class="pass-id">Pass ID #${escapeHtml(passCode)}</div>
        ${passCount}
      </div>
    </div>
    <a class="directions" href="${DIRECTIONS_URL}">
      <svg class="pin" viewBox="0 0 24 24" fill="none" stroke="${ORANGE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6"/></svg>
      Get directions
      <span class="venue">Centre Court Pickleball Arena</span>
      <span class="arrow">&rarr;</span>
    </a>
  </div>
  ${renderTerms()}
</body>
</html>`;
}

module.exports = { generatePassHTML };

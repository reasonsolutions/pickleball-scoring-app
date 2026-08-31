// This file contains all the step components for CCPL Signup
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.25)',
  color: '#fff',
  fontFamily: "'Montserrat', sans-serif",
  fontSize: '16px',
  padding: '10px 2px',
  outline: 'none'
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)'
};

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  fontSize: '14px'
};

export const Step0PlayerInfo = ({ form, onField, makeRadio, buttonStyle, onVerifyPhone, phoneVerified }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <label style={labelStyle}>
      Full Name
      <input required name="fullName" placeholder="Michael Kohli" value={form.fullName} onChange={onField} style={inputStyle} />
    </label>
    <label style={labelStyle}>
      Name as you would like it displayed by CCPL
      <input name="displayName" placeholder="M. Kohli" value={form.displayName} onChange={onField} style={inputStyle} />
    </label>
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Date of Birth</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input name="dobDay" placeholder="DD" maxLength="2" value={form.dobDay} onChange={onField} style={{ ...inputStyle, width: '52px', textAlign: 'center' }} />
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
        <input name="dobMonth" placeholder="MM" maxLength="2" value={form.dobMonth} onChange={onField} style={{ ...inputStyle, width: '52px', textAlign: 'center' }} />
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
        <input name="dobYear" placeholder="YYYY" maxLength="4" value={form.dobYear} onChange={onField} style={{ ...inputStyle, width: '70px', textAlign: 'center' }} />
      </div>
    </div>
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Gender</span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {makeRadio('gender', ['Male', 'Female']).map((opt, idx) => (
          <button key={idx} type="button" onClick={opt.onClick} style={buttonStyle(opt)}>{opt.label}</button>
        ))}
      </div>
    </div>
    <div>
      <label style={labelStyle}>
        WhatsApp Number
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            required
            type="tel"
            name="whatsapp"
            placeholder="9000000000"
            value={form.whatsapp}
            onChange={onField}
            style={{ ...inputStyle, flex: 1 }}
            maxLength="10"
          />
          {form.whatsapp && form.whatsapp.length === 10 && !phoneVerified && (
            <button
              type="button"
              onClick={onVerifyPhone}
              style={{
                padding: '10px 20px',
                background: '#ee3a24',
                color: '#fff',
                border: 'none',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Verify
            </button>
          )}
          {phoneVerified && (
            <span style={{
              color: '#4ade80',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}>
              ✓ Verified
            </span>
          )}
        </div>
      </label>
    </div>
    <label style={labelStyle}>
      Email Address
      <input required type="email" name="email" placeholder="you@email.com" value={form.email} onChange={onField} style={inputStyle} />
    </label>
    <label style={labelStyle}>
      Password
      <input required type="password" name="password" placeholder="Create a password" value={form.password} onChange={onField} style={inputStyle} />
    </label>
    <label style={labelStyle}>
      City of Current Residence
      <input required name="city" placeholder="Hyderabad" value={form.city} onChange={onField} style={inputStyle} />
    </label>
    <label style={labelStyle}>
      Current Residential Address
      <textarea name="currentAddress" rows="2" placeholder="Flat / street / area / pincode" value={form.currentAddress} onChange={onField} style={textareaStyle}></textarea>
    </label>
    <label style={labelStyle}>
      Permanent Address
      <textarea name="permanentAddress" rows="2" placeholder="Flat / street / area / pincode" value={form.permanentAddress} onChange={onField} style={textareaStyle}></textarea>
    </label>
  </div>
);

export const Step1PlayerIdentity = ({ form, onField, onFile, makeRadio, buttonStyle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Government ID Type</span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {makeRadio('govIdType', ['Aadhaar', 'Passport', 'Driving Licence', 'Voter ID', 'Other']).map((opt, idx) => (
          <button key={idx} type="button" onClick={opt.onClick} style={{ ...buttonStyle(opt), padding: '11px 16px' }}>{opt.label}</button>
        ))}
      </div>
    </div>
    {form.govIdType === 'Other' && (
      <input name="govIdOther" placeholder="Specify ID type" value={form.govIdOther} onChange={onField} style={inputStyle} />
    )}
    <label style={labelStyle}>
      Government ID Number
      <input name="govIdNumber" placeholder="ID number" value={form.govIdNumber} onChange={onField} style={inputStyle} />
    </label>
    {!form.govIdFile ? (
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px dashed rgba(255,255,255,0.3)', padding: '26px', cursor: 'pointer', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Upload Government ID — click to upload</span>
        <input type="file" name="govIdFile" onChange={onFile} accept="image/*,.pdf" style={{ display: 'none' }} />
      </label>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Government ID</div>
          <div style={{ fontSize: '14px', color: '#fff' }}>{form.govIdFile.name}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{(form.govIdFile.size / 1024).toFixed(1)} KB</div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onField({ target: { name: 'govIdFile', value: null } }); }}
          style={{ padding: '8px 16px', background: 'rgba(238, 58, 36, 0.2)', border: '1px solid #ee3a24', color: '#ee3a24', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Remove
        </button>
      </div>
    )}
    <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>The League may independently verify player identity and eligibility at any stage of the competition.</p>
  </div>
);

export const Step2Eligibility = ({ form, makeRadio, accentColor }) => {
  const eligibilityOptions = [
    { value: 's1hpl', label: 'CCPL Season 1 / HPL Season 1', desc: 'I played in, registered to participate in, or was picked into a franchise squad for CCPL Season 1 / HPL Season 1.' },
    { value: 'club', label: 'CCPL Club League Season 1', desc: 'I was picked into a team in CCPL Club League Season 1.' },
    { value: 'residency', label: 'Hyderabad Residency', desc: 'I do not qualify through prior participation but satisfy the Hyderabad residency requirements.' },
  ];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>How are you eligible to register for CCPL Hyderabad Season 2? Select ONE primary route.</p>
      <div>
        {makeRadio('eligibilityRoute', eligibilityOptions).map((opt, idx) => (
          <button key={idx} type="button" onClick={opt.onClick} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '18px 20px', marginBottom: '10px', background: opt.bg, border: `1px solid ${opt.borderColor}`, cursor: 'pointer' }}>
            <span style={{ display: 'block', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '14px', color: opt.color, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>{opt.label}</span>
            <span style={{ display: 'block', fontSize: '13px', lineHeight: 1.5, color: opt.descColor }}>{opt.desc}</span>
          </button>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>The League regulations provide eligibility through prior participation or qualifying Hyderabad residency. Simply registering for CCPL Club League Season 1 without being selected does not independently establish eligibility.</p>
    </div>
  );
};

export const Step3Residency = ({ form, onField, onFile, makeRadio, makeChecklist, buttonStyle, accentColor }) => {
  const residencyDocOptions = [
    'Aadhaar Card', 'Voter ID', 'Passport', 'Driving Licence',
    'Rental Agreement', 'Employment Letter', 'Educational Institution Record',
    'Utility Bill', 'Other document accepted by the League'
  ];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>Complete this section ONLY if registering through Hyderabad Residency.</p>
      
      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Are you currently ordinarily residing in Hyderabad?</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {makeRadio('residing', ['Yes', 'No']).map((opt, idx) => (
            <button key={idx} type="button" onClick={opt.onClick} style={buttonStyle(opt)}>{opt.label}</button>
          ))}
        </div>
      </div>
      
      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Since when have you been residing in Hyderabad?</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input name="residingSinceMonth" placeholder="Month" value={form.residingSinceMonth} onChange={onField} style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
          <input name="residingSinceYear" placeholder="Year" value={form.residingSinceYear} onChange={onField} style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
        </div>
      </div>
      
      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Basis of Hyderabad Residency</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {makeRadio('residencyBasis', ['Permanent Residence', 'Employment', 'Education', 'Rental / Lease', 'Family Residence', 'Other']).map((opt, idx) => (
            <button key={idx} type="button" onClick={opt.onClick} style={{ ...buttonStyle(opt), padding: '11px 16px' }}>{opt.label}</button>
          ))}
        </div>
      </div>
      
      {form.residencyBasis === 'Other' && (
        <input name="residencyBasisOther" placeholder="Specify basis" value={form.residencyBasisOther} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
      )}
      
      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Residency Document Type</span>
        <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>Select the type of document you will upload.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {makeRadio('residencyDocType', residencyDocOptions).map((opt, idx) => (
            <button key={idx} type="button" onClick={opt.onClick} style={{ ...buttonStyle(opt), padding: '11px 16px', fontSize: '12px' }}>{opt.label}</button>
          ))}
        </div>
      </div>
      
      {!form.residencyFile ? (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px dashed rgba(255,255,255,0.3)', padding: '26px', cursor: 'pointer', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Upload Residency Proof — click to upload</span>
          <input type="file" name="residencyFile" onChange={onFile} accept="image/*,.pdf" style={{ display: 'none' }} />
        </label>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Residency Proof</div>
            <div style={{ fontSize: '14px', color: '#fff' }}>{form.residencyFile.name}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{(form.residencyFile.size / 1024).toFixed(1)} KB</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onField({ target: { name: 'residencyFile', value: null } }); }}
            style={{ padding: '8px 16px', background: 'rgba(238, 58, 36, 0.2)', border: '1px solid #ee3a24', color: '#ee3a24', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Remove
          </button>
        </div>
      )}
      
      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>The League Committee may request additional documentation and retains final authority over residency verification.</p>
    </div>
  );
};

export const Step4PickleballProfile = ({ form, onField, makeRadio, buttonStyle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Current DUPR Rating</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '20px' }}>
        <input name="duprDoubles" placeholder="Doubles" value={form.duprDoubles} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
        <input name="duprSingles" placeholder="Singles" value={form.duprSingles} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
      </div>
    </div>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      DUPR Profile / Player ID
      <input name="duprProfile" placeholder="DUPR ID or profile link" value={form.duprProfile} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
    </label>
    
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Primary Playing Discipline</span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {makeRadio('discipline', ["Men's Singles", "Women's Singles", "Men's Doubles", "Women's Doubles", 'Mixed Doubles']).map((opt, idx) => (
          <button key={idx} type="button" onClick={opt.onClick} style={{ ...buttonStyle(opt), padding: '11px 16px' }}>{opt.label}</button>
        ))}
      </div>
    </div>
    
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Playing Preference</span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {makeRadio('preference', ['Singles Specialist', 'Doubles Specialist', 'All-Rounder']).map((opt, idx) => (
          <button key={idx} type="button" onClick={opt.onClick} style={{ ...buttonStyle(opt), padding: '11px 16px' }}>{opt.label}</button>
        ))}
      </div>
    </div>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Years Playing Pickleball
      <input name="yearsPlaying" type="number" min="0" placeholder="e.g. 3" value={form.yearsPlaying} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
    </label>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Clubs / Academies Currently Associated With (Optional)
      <input name="clubs" placeholder="Club or academy name" value={form.clubs} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
    </label>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Previous Pickleball Leagues / Tournaments
      <textarea name="previousLeagues" rows="2" value={form.previousLeagues} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
    </label>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Major Achievements
      <textarea name="achievements" rows="2" value={form.achievements} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
    </label>
  </div>
);

export const Step5PlayerBio = ({ form, onField }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Player Bio — a short description of yourself as a pickleball player
      <textarea name="bio" rows="3" value={form.bio} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
    </label>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Player Strengths
      <textarea name="strengths" rows="2" value={form.strengths} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
    </label>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Playing Style
      <textarea name="playingStyle" rows="2" value={form.playingStyle} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
    </label>
    
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      What would you bring to a CCPL franchise?
      <textarea name="contribution" rows="2" value={form.contribution} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
    </label>
  </div>
);

export const Step6Availability = ({ form, onField, makeRadio, makeChecklist, buttonStyle, accentColor }) => {
  const matchdayItems = [
    { key: 'md1', label: 'Matchday 1 — Saturday, 17 October 2026' },
    { key: 'md2', label: 'Matchday 2 — Saturday, 24 October 2026' },
    { key: 'md3', label: 'Matchday 3 — Saturday, 31 October 2026' },
    { key: 'md4', label: 'Matchday 4 — Saturday, 7 November 2026' },
    { key: 'md5', label: 'Matchday 5 — Saturday, 14 November 2026' },
    { key: 'md6', label: 'Matchday 6 — Saturday, 21 November 2026' },
    { key: 'md7', label: 'Matchday 7 — Saturday, 28 November 2026' },
  ];

  const postseasonItems = [
    { key: 'playoffs', label: 'Playoffs — Saturday, 5 December 2026' },
    { key: 'final', label: 'Championship Final — Saturday, 12 December 2026' },
  ];

  const availabilityDeclItems = [
    'I am making this declaration in good faith and have checked my personal, professional, travel and other commitments before submitting my availability.',
    'If I have not selected a particular Matchday as available, I will be treated as unavailable for that Matchday.',
    'Once the registration period closes, my declared availability will be treated as my official availability commitment for the purpose of player selection and franchise planning.',
    'If my circumstances change after registration, I must immediately inform CCPL and my franchise.',
    'Any request to participate on a Matchday that I originally declared as unavailable will be subject to the approval of the League and my franchise and shall not be guaranteed.',
    'I understand that I may be permitted to make myself available for a maximum of one (1) additional Matchday beyond the Matchdays originally declared as available by me.',
    'Any such additional availability will be entirely at the discretion of the franchise and League and shall not create an obligation on the franchise to select me.',
    'I understand that repeated or material changes to my declared availability may affect my selection, participation, contractual status or eligibility, as determined by the League Committee.',
    'I understand that failure to honour my declared availability without reasonable cause may be treated as a failure to fulfil my League obligations and may result in disciplinary action.',
  ];

  const matchdayList = makeChecklist('matchdays', matchdayItems);
  const matchdaysCheckedCount = matchdayList.filter(d => d.checked).length;
  const postseasonList = makeChecklist('postseasonDates', postseasonItems);
  const availabilityDeclList = makeChecklist('availabilityDecl', availabilityDeclItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.45)' }}>CCPL Season 2 comprises seven League Stage Matchdays, followed by Playoffs and the Championship Final. A player will not be permitted to participate in a Matchday they have declared themself unavailable for.</p>

      <div>
        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accentColor, marginBottom: '4px' }}>7.1 League Stage Availability</span>
        <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>Select EVERY Matchday you are confirmed and committed to.</p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {matchdayList.map((d, idx) => (
            <label key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); d.toggle(); }}>
              <div style={{ position: 'relative', width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0 }}>
                <input type="checkbox" checked={d.checked} onChange={d.toggle} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <div style={{ width: '20px', height: '20px', backgroundColor: d.checked ? accentColor : 'white', border: `2px solid ${d.checked ? accentColor : 'rgba(255,255,255,0.5)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {d.checked && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
                </div>
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
        I confirm that I am available for ___ out of 7 League Stage Matchdays
        <input name="matchdaysConfirmed" type="number" min="0" max="7" value={matchdaysCheckedCount} readOnly style={{ width: '80px', background: 'rgba(255,255,255,0.05)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none', cursor: 'not-allowed' }} />
      </label>

      <div>
        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accentColor, marginBottom: '4px' }}>7.2 Playoff & Final Availability</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {postseasonList.map((d, idx) => (
            <label key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); d.toggle(); }}>
              <div style={{ position: 'relative', width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0 }}>
                <input type="checkbox" checked={d.checked} onChange={d.toggle} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <div style={{ width: '20px', height: '20px', backgroundColor: d.checked ? accentColor : 'white', border: `2px solid ${d.checked ? accentColor : 'rgba(255,255,255,0.5)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {d.checked && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
                </div>
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Selection for a franchise does not guarantee participation in any particular match. Final playing selection remains with the franchise in accordance with the CCPL Competition Regulations.</p>

      <div>
        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accentColor, marginBottom: '4px' }}>7.3 Availability Declaration</span>
        <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'rgba(255,255,255,0.45)' }}>I confirm that the Matchdays selected above represent my genuine and confirmed availability. I understand and agree that:</p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {availabilityDeclList.map((d, idx) => (
            <label key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); d.toggle(); }}>
              <div style={{ position: 'relative', width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0, marginTop: '3px' }}>
                <input type="checkbox" checked={d.checked} onChange={d.toggle} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <div style={{ width: '20px', height: '20px', backgroundColor: d.checked ? accentColor : 'white', border: `2px solid ${d.checked ? accentColor : 'rgba(255,255,255,0.5)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {d.checked && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
                </div>
              </div>
              <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.65)' }}>{d.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Step7MandatoryPractice = ({ form, onField, makeRadio, makeChecklist, buttonStyle, accentColor }) => {
  const practiceDayItems = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const practiceDeclItems = [
    'I understand that two team practice sessions per week are a mandatory commitment from 17 September 2026 onwards.',
    'I will make reasonable arrangements around my personal and professional commitments to attend the required sessions.',
    'I understand that practice sessions may be scheduled by my franchise based on team requirements and may not always fall on my preferred days or times.',
    'I understand that regular non-attendance without reasonable cause may affect my standing within the franchise and may constitute a failure to fulfil my League obligations.',
    'I understand that this commitment applies throughout the relevant CCPL Season 2 preparation and competition period, subject to League-approved exceptions.',
    'I understand that providing an inaccurate availability declaration may affect my eligibility for selection and participation.',
  ];

  const practiceDayList = makeChecklist('practiceDays', practiceDayItems);
  const practiceDeclList = makeChecklist('practiceDecl', practiceDeclItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accentColor, marginBottom: '4px' }}>7A.1 Mandatory Practice</span>
        <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.45)' }}>From 17 September 2026, every contracted CCPL player shall be required to make themselves available for two (2) mandatory team practice sessions per week, to give franchises time to build team combinations and prepare for the season.</p>
      </div>

      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Player Commitment — I confirm that I am available and willing to participate in two mandatory team practice sessions every week from 17 September 2026 onwards.</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {makeRadio('practiceCommit', [
            { value: 'yes', label: 'YES — I confirm my commitment to two mandatory practice sessions per week.' },
            { value: 'no', label: 'NO — I cannot commit to two mandatory practice sessions per week.' }
          ]).map((opt, idx) => (
            <button key={idx} type="button" onClick={opt.onClick} style={{ textAlign: 'left', padding: '11px 16px', background: opt.bg, color: opt.color, border: '1px solid rgba(255,255,255,0.25)', fontFamily: "'Montserrat', sans-serif", fontSize: '13px', cursor: 'pointer' }}>{opt.label}</button>
          ))}
        </div>
      </div>

      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Practice Availability — days generally available</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {practiceDayList.map((d, idx) => (
            <button key={idx} type="button" onClick={d.toggle} style={{ padding: '10px 14px', background: d.bg, color: d.color, border: '1px solid rgba(255,255,255,0.25)', fontFamily: "'Montserrat', sans-serif", fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>{d.label}</button>
          ))}
        </div>
      </div>

      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Preferred Practice Time</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {makeChecklist('practiceTimes', ['Morning', 'Afternoon', 'Evening']).map((d, idx) => (
            <button
              key={idx}
              type="button"
              onClick={d.toggle}
              style={{
                padding: '14px 20px',
                background: d.checked ? accentColor : 'transparent',
                border: `1px solid ${d.checked ? accentColor : 'rgba(255,255,255,0.2)'}`,
                color: d.checked ? '#fff' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
        Any known restrictions on practice availability (Optional)
        <textarea name="practiceRestrictions" rows="2" value={form.practiceRestrictions} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
      </label>

      <div>
        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accentColor, marginBottom: '4px' }}>7A.2 Practice Commitment Declaration</span>
        <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'rgba(255,255,255,0.45)' }}>By selecting YES, I confirm that:</p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {practiceDeclList.map((d, idx) => (
            <label key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); d.toggle(); }}>
              <div style={{ position: 'relative', width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0, marginTop: '3px' }}>
                <input type="checkbox" checked={d.checked} onChange={d.toggle} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <div style={{ width: '20px', height: '20px', backgroundColor: d.checked ? accentColor : 'white', border: `2px solid ${d.checked ? accentColor : 'rgba(255,255,255,0.5)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {d.checked && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
                </div>
              </div>
              <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.65)' }}>{d.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Step8AuctionPreference = ({ form, onField, setField, makeRadio, buttonStyle, accentColor }) => {
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const checkboxClickingRef = useRef(false);

  // Fetch teams when component mounts
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        
        // First, get the active tournament ID from app-settings
        const settingsDoc = await getDocs(collection(db, 'app-settings'));
        let activeTournamentId = null;
        
        if (!settingsDoc.empty) {
          const settings = settingsDoc.docs[0].data();
          activeTournamentId = settings.activeTournamentId;
        }
        
        if (activeTournamentId) {
          // Fetch teams for the active tournament
          const teamsQuery = query(
            collection(db, 'teams'),
            where('tournamentId', '==', activeTournamentId)
          );
          const teamsSnapshot = await getDocs(teamsQuery);
          const teamsList = teamsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
          }));
          setTeams(teamsList.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoadingTeams(false);
      }
    };
    
    fetchTeams();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>I understand that, unless selected through the Pre-Auction process, I may be included in the CCPL Season 2 Player Auction Pool.</p>
        <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
          <div
            style={{ position: 'relative', width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0, marginTop: '3px', cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (checkboxClickingRef.current) return;
              checkboxClickingRef.current = true;
              setTimeout(() => { checkboxClickingRef.current = false; }, 100);
              setField('auctionUnderstand', !form.auctionUnderstand);
            }}
          >
            <input type="checkbox" checked={form.auctionUnderstand} onChange={() => {}} name="auctionUnderstand" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
            <div style={{ width: '20px', height: '20px', backgroundColor: form.auctionUnderstand ? accentColor : 'white', border: `2px solid ${form.auctionUnderstand ? accentColor : 'rgba(255,255,255,0.5)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
              {form.auctionUnderstand && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none' }}>✓</span>}
            </div>
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>I understand and accept.</span>
        </label>
      </div>

      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Pre-Auction Selection — if a franchise wishes to select me before the Auction</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {makeRadio('preAuction', [
            { value: 'willing', label: 'I am willing to be considered for Pre-Auction Selection.' },
            { value: 'not', label: 'I do not wish to be considered for Pre-Auction Selection.' }
          ]).map((opt, idx) => (
            <button key={idx} type="button" onClick={opt.onClick} style={{ textAlign: 'left', padding: '11px 16px', background: opt.bg, color: opt.color, border: '1px solid rgba(255,255,255,0.25)', fontFamily: "'Montserrat', sans-serif", fontSize: '13px', cursor: 'pointer' }}>{opt.label}</button>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Pre-Auction Selection is subject to the separate League process. A player must accept the official request through the League platform for the selection to become valid.</p>
      </div>

      <div>
        <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Is there a particular CCPL franchise you would prefer to represent?</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {makeRadio('franchisePref', ['No preference', 'Yes']).map((opt, idx) => (
            <button key={idx} type="button" onClick={opt.onClick} style={buttonStyle(opt)}>{opt.label}</button>
          ))}
        </div>
      </div>

      {form.franchisePref === 'Yes' && (
        <div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
            Select Franchise
            <select
              name="franchisePrefOther"
              value={form.franchisePrefOther}
              onChange={onField}
              disabled={loadingTeams}
              style={{
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '14px',
                padding: '12px',
                outline: 'none',
                cursor: loadingTeams ? 'wait' : 'pointer'
              }}
            >
              <option value="">{loadingTeams ? 'Loading teams...' : 'Select a franchise'}</option>
              {teams.map(team => (
                <option key={team.id} value={team.name}>{team.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Note: Preferences do not constitute a commitment or guarantee of selection.</p>
    </div>
  );
};

export const Step9MedicalFitness = ({ form, onField, makeRadio, buttonStyle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Do you have any current injury, medical condition or physical limitation that may affect your participation in CCPL Season 2?</span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {makeRadio('medicalCondition', ['No', 'Yes']).map((opt, idx) => (
          <button key={idx} type="button" onClick={opt.onClick} style={buttonStyle(opt)}>{opt.label}</button>
        ))}
      </div>
    </div>

    {form.medicalCondition === 'Yes' && (
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
        If yes, please provide details
        <textarea name="medicalDetails" rows="2" value={form.medicalDetails} onChange={onField} style={{ resize: 'vertical', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '14px', padding: '10px 2px', outline: 'none' }}></textarea>
      </label>
    )}

    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Are you medically fit to participate in competitive pickleball?</span>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {makeRadio('medicallyFit', ['Yes', 'No']).map((opt, idx) => (
          <button key={idx} type="button" onClick={opt.onClick} style={buttonStyle(opt)}>{opt.label}</button>
        ))}
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '20px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
        Emergency Contact Name
        <input name="emergencyName" value={form.emergencyName} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
        Relationship
        <input name="emergencyRelationship" value={form.emergencyRelationship} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
      </label>
    </div>

    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
      Emergency Contact Number
      <input type="tel" name="emergencyNumber" value={form.emergencyNumber} onChange={onField} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', padding: '10px 2px', outline: 'none' }} />
    </label>

    <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>By registering, the player confirms that they are medically fit to participate.</p>
  </div>
);

export const Step10PlayerPhoto = ({ form, onField, onFile, setField, accentColor, openCamera }) => {
  const checkboxClickingRef = useRef(false);
  
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Upload Recent Player Photograph</span>
      <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'rgba(255,255,255,0.4)' }}>
        <strong>Requirements:</strong> Face must be straight, looking at camera, with a plain background. You can upload an existing photo or take a new one using your device camera.
      </p>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        {!form.playerPhoto ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={() => openCamera('playerPhoto')}
              style={{
                height: '100px',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)',
                transition: 'background 0.2s',
                padding: '20px'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📷</span>
                <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                  Take Photo with Camera
                </span>
              </div>
            </button>
            
            <label style={{ height: '100px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📁</span>
                <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                  Upload from Gallery
                </span>
              </div>
              <input type="file" name="playerPhoto" onChange={onFile} accept="image/*" style={{ display: 'none' }} />
            </label>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Player Photograph</div>
            <img
              src={form.playerPhoto instanceof File ? URL.createObjectURL(form.playerPhoto) : form.playerPhoto}
              alt="Player photograph preview"
              style={{ width: '100%', maxWidth: '300px', height: 'auto', maxHeight: '300px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)', display: 'block', marginBottom: '8px' }}
            />
            <div>
              <div style={{ fontSize: '14px', color: '#fff' }}>{form.playerPhoto.name || 'Uploaded photo'}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{form.playerPhoto.size ? (form.playerPhoto.size / 1024).toFixed(1) + ' KB' : ''}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onField({ target: { name: 'playerPhoto', value: null } }); }}
              style={{ padding: '8px 16px', background: 'rgba(238, 58, 36, 0.2)', border: '1px solid #ee3a24', color: '#ee3a24', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', alignSelf: 'flex-start' }}
            >
              Remove & Upload New
            </button>
          </div>
        )}
        <div style={{ width: '120px', flexShrink: 0 }}>
          <img
            src="https://i.pinimg.com/736x/24/16/f0/2416f065537cc43afdb9b0e8e0b48f4c.jpg"
            alt="Reference photo example"
            style={{ width: '100%', height: '220px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)', display: 'block' }}
          />
          <span style={{ display: 'block', marginTop: '6px', fontSize: '9.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Reference</span>
        </div>
      </div>
    </div>

    <div>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Upload Action / Pickleball Photograph (Optional)</span>
      {!form.actionPhoto ? (
        <label style={{ height: '220px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              Click to upload action shot
            </span>
          </div>
          <input type="file" name="actionPhoto" onChange={onFile} accept="image/*" style={{ display: 'none' }} />
        </label>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Action Photograph</div>
          <img
            src={form.actionPhoto instanceof File ? URL.createObjectURL(form.actionPhoto) : form.actionPhoto}
            alt="Action photograph preview"
            style={{ width: '100%', maxWidth: '400px', height: 'auto', maxHeight: '300px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)', display: 'block', marginBottom: '8px' }}
          />
          <div>
            <div style={{ fontSize: '14px', color: '#fff' }}>{form.actionPhoto.name || 'Uploaded photo'}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{form.actionPhoto.size ? (form.actionPhoto.size / 1024).toFixed(1) + ' KB' : ''}</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onField({ target: { name: 'actionPhoto', value: null } }); }}
            style={{ padding: '8px 16px', background: 'rgba(238, 58, 36, 0.2)', border: '1px solid #ee3a24', color: '#ee3a24', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', alignSelf: 'flex-start' }}
          >
            Remove & Upload New
          </button>
        </div>
      )}
    </div>

    <div>
      <p style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>I consent to CCPL using my name, photograph, video footage, statistics, player profile and other relevant likeness for League-related Broadcast, Social Media, Photography, Promotional Content, Advertising / Sponsorship, League Communications, and Digital Platforms.</p>
      <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
        <div
          style={{ position: 'relative', width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0, marginTop: '3px', cursor: 'pointer' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (checkboxClickingRef.current) return;
            checkboxClickingRef.current = true;
            setTimeout(() => { checkboxClickingRef.current = false; }, 100);
            setField('mediaConsent', !form.mediaConsent);
          }}
        >
          <input type="checkbox" checked={form.mediaConsent} onChange={() => {}} name="mediaConsent" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
          <div style={{ width: '20px', height: '20px', backgroundColor: form.mediaConsent ? accentColor : 'white', border: `2px solid ${form.mediaConsent ? accentColor : 'rgba(255,255,255,0.5)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
            {form.mediaConsent && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none' }}>✓</span>}
          </div>
        </div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>I consent.</span>
      </label>
    </div>

    <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>The CCPL regulations provide for League commercial, promotional, broadcast and image rights as part of player registration.</p>
  </div>
  );
};

export const Step11FinalDeclaration = ({ makeChecklist, accentColor }) => {
  const finalDeclItems = [
    'All information provided by me in this registration is true, complete and accurate.',
    'I satisfy the eligibility requirements applicable to CCPL Hyderabad Season 2.',
    'Any residency or eligibility documentation submitted by me is genuine and valid.',
    'I understand that the League Committee may independently verify the information submitted by me.',
    'I understand that submission of this form does not guarantee inclusion in the Official Auction Pool.',
    'I agree to comply with the CCPL Competition Regulations, Operations Handbook, Code of Conduct and all directives issued by the League Committee.',
    'I accept the disciplinary jurisdiction of the CCPL League Committee.',
    'I confirm that I am medically fit to participate in CCPL Season 2.',
    'I agree to remain available as per my declaration for League matches, team activities, media commitments, sponsor obligations and promotional activities.',
    'I grant CCPL the commercial, promotional, broadcast and image rights applicable under the League Regulations.',
    'I understand that providing false, misleading or incomplete information may result in rejection or cancellation of my registration, removal from a franchise squad, suspension or other disciplinary action.',
    'I understand that the decision of the League Committee regarding my eligibility and residency is final and binding.',
  ];

  const finalDeclList = makeChecklist('finalDecl', finalDeclItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>I hereby declare and confirm that:</p>
      {finalDeclList.map((d, idx) => (
        <label key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); d.toggle(); }}>
          <div style={{ position: 'relative', width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0, marginTop: '3px' }}>
            <input type="checkbox" checked={d.checked} onChange={d.toggle} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            <div style={{ width: '20px', height: '20px', backgroundColor: d.checked ? accentColor : 'white', border: `2px solid ${d.checked ? accentColor : 'rgba(255,255,255,0.5)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              {d.checked && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
            </div>
          </div>
          <span style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.65)' }}>{d.label}</span>
        </label>
      ))}
    </div>
  );
};

// Export a simple placeholder for remaining steps
export const StepPlaceholder = ({ stepNumber }) => (
  <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
    <p>Step {stepNumber + 1} content</p>
    <p style={{ fontSize: '14px', marginTop: '20px' }}>Additional form fields for this step will be displayed here.</p>
  </div>
);

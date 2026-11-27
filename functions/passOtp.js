const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const { sendOtpWhatsApp } = require('./sendWhatsAppOTP');

// Website pass requests are verified by WhatsApp OTP before the pass is created:
//   1. requestPassOtp  - validates the form, stores it with an OTP in `pass-otp-requests`
//                        (server-only, no client rules) and sends the OTP on WhatsApp.
//   2. verifyPassOtp   - checks the OTP and only then creates ticketing/{matchId}/passes/{id}.

const REQUESTS = 'pass-otp-requests';
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_PASSES = 6;
// WhatsApp OTP is switched off while the MSG91/Meta number is broken: requestPassOtp then
// creates the pass straight away. Set back to true to require the OTP again.
const WHATSAPP_OTP_ENABLED = false;

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

exports.requestPassOtp = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ status: 'error', message: 'Method not allowed' });
    return;
  }

  try {
    const db = getFirestore();
    const body = request.body || {};
    const matchId = str(body.matchId, 200);
    const name = str(body.name, 120);
    const teamId = str(body.teamId, 200);
    const numPasses = Number(body.numPasses);
    const digits = str(body.phoneNumber, 30).replace(/\D/g, '');
    const phoneDigits = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

    if (!matchId || !name || !teamId || phoneDigits.length !== 10) {
      response.status(400).json({ status: 'error', message: 'Please fill in your name, a valid 10-digit phone number and team.' });
      return;
    }
    if (!str(body.note, 1000)) {
      response.status(400).json({ status: 'error', message: 'Please add a note to the team admin.' });
      return;
    }
    if (!Number.isInteger(numPasses) || numPasses < 1 || numPasses > MAX_PASSES) {
      response.status(400).json({ status: 'error', message: `You can request between 1 and ${MAX_PASSES} passes.` });
      return;
    }

    const matchDoc = await db.collection('ticketing').doc(matchId).get();
    if (!matchDoc.exists) {
      response.status(404).json({ status: 'error', message: 'This match day is no longer available.' });
      return;
    }

    const phoneNumber = `+91${phoneDigits}`;
    const recent = await db.collection(REQUESTS).where('pass.phoneNumber', '==', phoneNumber).get();
    const now = Date.now();
    if (recent.docs.some((d) => now - d.data().createdAt.toMillis() < RESEND_COOLDOWN_MS)) {
      response.status(429).json({ status: 'error', message: 'Please wait 30 seconds before requesting another OTP.' });
      return;
    }

    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const ref = db.collection(REQUESTS).doc();
    const requestData = {
      matchId,
      otp,
      attempts: 0,
      verified: false,
      createdAt: new Date(now),
      expiresAt: new Date(now + OTP_TTL_MS),
      // Same shape the pass is created with (and the mobile app writes)
      pass: {
        name,
        phoneNumber,
        email: str(body.email, 200),
        numPasses,
        team: str(body.team, 200),
        teamId,
        note: str(body.note, 1000),
        userId: str(body.userId, 200),
        source: 'web',
        status: 'pending'
      }
    };

    if (!WHATSAPP_OTP_ENABLED) {
      const created = new Date(now);
      const passRef = db.collection('ticketing').doc(matchId).collection('passes').doc();
      const batch = db.batch();
      batch.set(passRef, { ...requestData.pass, otpVerified: false, createdAt: created, updatedAt: created });
      batch.set(ref, { ...requestData, verified: true, otpSkipped: true, verifiedAt: created, passId: passRef.id });
      await batch.commit();
      response.status(200).json({ status: 'success', requestId: ref.id, passId: passRef.id, otpSkipped: true });
      return;
    }

    await ref.set(requestData);

    try {
      await sendOtpWhatsApp(phoneNumber, otp);
    } catch (error) {
      logger.error('Error sending pass OTP on WhatsApp', error.response?.data || error.message);
      await ref.delete();
      response.status(502).json({ status: 'error', message: 'Could not send the OTP on WhatsApp. Please check the number and try again.' });
      return;
    }

    response.status(200).json({ status: 'success', requestId: ref.id });
  } catch (error) {
    logger.error('requestPassOtp failed', error);
    response.status(500).json({ status: 'error', message: 'Could not send the OTP. Please try again.' });
  }
});

exports.verifyPassOtp = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ status: 'error', message: 'Method not allowed' });
    return;
  }

  try {
    const db = getFirestore();
    const requestId = str(request.body?.requestId, 200);
    const otp = str(request.body?.otp, 10).replace(/\D/g, '');
    if (!requestId || otp.length !== 6) {
      response.status(400).json({ status: 'error', message: 'Please enter the 6-digit OTP.' });
      return;
    }

    const ref = db.collection(REQUESTS).doc(requestId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { code: 404, message: 'This OTP request was not found. Please request a new OTP.' };

      const data = snap.data();
      if (data.verified) return { code: 200, passId: data.passId };
      if (Date.now() > data.expiresAt.toMillis()) return { code: 410, message: 'This OTP has expired. Please request a new one.' };
      if (data.attempts >= MAX_ATTEMPTS) return { code: 429, message: 'Too many incorrect attempts. Please request a new OTP.' };

      if (otp !== data.otp) {
        const left = MAX_ATTEMPTS - data.attempts - 1;
        tx.update(ref, { attempts: data.attempts + 1 });
        return { code: 400, message: left > 0 ? `Incorrect OTP. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.` : 'Too many incorrect attempts. Please request a new OTP.' };
      }

      const now = new Date();
      const passRef = db.collection('ticketing').doc(data.matchId).collection('passes').doc();
      tx.set(passRef, {
        ...data.pass,
        otp: data.otp,
        otpVerified: true,
        otpVerifiedAt: now,
        createdAt: now,
        updatedAt: now
      });
      tx.update(ref, { verified: true, verifiedAt: now, passId: passRef.id });
      return { code: 200, passId: passRef.id };
    });

    if (result.code !== 200) {
      response.status(result.code).json({ status: 'error', message: result.message });
      return;
    }
    response.status(200).json({ status: 'success', passId: result.passId });
  } catch (error) {
    logger.error('verifyPassOtp failed', error);
    response.status(500).json({ status: 'error', message: 'Could not verify the OTP. Please try again.' });
  }
});

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const axios = require("axios");
const FormData = require("form-data");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { generatePassHTML } = require("./passTemplate");

// Pass requests live in ticketing/{eventId}/passes/{passId}.
//
// The mobile app approves by updating a request's status to 'approved', which fires the separate
// generatePassPDF trigger (deployed from the app's project) that sends ONE merged PDF.
//
// The website instead calls this function, which sends ONE PDF + WhatsApp message PER PASS.
// To keep generatePassPDF from also firing, this function never *updates* a request to 'approved':
//   - approve: the pending request is deleted and recreated (same ID) already approved
//   - send:    a new request is created already approved
// generatePassPDF only listens for updates, so neither path triggers it.
//
// The sending itself happens in the background (deliverQueuedPasses), so the website isn't left
// waiting on one long call: each request carries a `delivery` record that tracks it:
//   { jobId, mode, state: 'queued' | 'sending' | 'sent' | 'failed', passesSent, total, error,
//     requestedBy, requestedAt, startedAt, updatedAt, finishedAt }

const MAX_SEND = 6;
const PDF_DELIVERY = 'individual';
const PASS_TIME = '4:00 PM'; // all match day passes are for 4:00 PM
const VENUE = 'Centre Court Pickleball Arena';
// Super admin passes belong to this team (same id the admin panel's Team Allocation uses)
const CCPL_TEAM_ID = 'CCPL_SUPERADMIN_TEAM';
const CCPL_TEAM_NAME = 'CCPL';
// A delivery still 'queued' or 'sending' after this long has died (the sender's timeout is 9 minutes)
const STALE_DELIVERY_MS = 12 * 60 * 1000;

/**
 * Callable from the website (Team Admin > Passes, and the admin panel).
 *   { action: 'approve', userId, eventId, passIds: [...] }
 *   { action: 'send', userId, eventId, name, phoneNumber, numPasses, teamName }
 *   { action: 'resend', userId, eventId, passIds: [...], onlyUnsent? }
 * Super admins (admin panel) can approve any team's requests, and send passes from the CCPL team.
 * Resend sends an approved request's passes again (team admins: only their own team's), reusing
 * the PDFs already uploaded and regenerating any missing (same pass ID, so the same QR codes).
 * With onlyUnsent it sends just the passes the last attempt didn't get to.
 * Approves/sends are written and the delivery queued; this returns right away and
 * deliverQueuedPasses sends the passes. Returns { results: [{ id, name, total, jobId }] }
 */
exports.generateIndividualPassPDFs = onCall({
  region: 'asia-south1',
  timeoutSeconds: 60
}, async (request) => {
  const { action, userId, eventId } = request.data || {};
  if (!['approve', 'send', 'resend'].includes(action) || !userId || !eventId) {
    throw new HttpsError('invalid-argument', 'Missing or invalid action, userId or eventId.');
  }

  const db = admin.firestore();

  const eventDoc = await db.collection('ticketing').doc(eventId).get();
  if (!eventDoc.exists) {
    throw new HttpsError('not-found', 'Match day not found.');
  }
  const eventData = eventDoc.data();
  const passesRef = db.collection('ticketing').doc(eventId).collection('passes');
  const now = admin.firestore.Timestamp.now();
  const jobs = [];

  // The delivery record that queues a request's passes for deliverQueuedPasses
  const queueDelivery = (mode, total, passesSent = 0) => ({
    jobId: crypto.randomUUID(),
    mode,
    state: 'queued',
    total,
    passesSent,
    error: null,
    requestedBy: userId,
    requestedAt: now,
    updatedAt: now
  });

  // Super admins (admin panel > Ticketing) are identified by their signed-in account, not the
  // request body. They can approve any team's pending requests, even past the team's allocation.
  const authUid = request.auth?.uid;
  let isSuperAdmin = false;
  if (authUid && authUid === userId) {
    const adminSnap = await db.collection('users').doc(authUid).get();
    isSuperAdmin = adminSnap.exists && adminSnap.data().role === 'super_admin';
  }

  // Passes left for a team = its allocation - passes already approved for it
  const getPassesLeft = async (teamId) => {
    const allocSnap = await db.collection('ticketing').doc(eventId).collection('allocation')
      .where('teamId', '==', teamId).get();
    const alloc = allocSnap.empty ? {} : allocSnap.docs[0].data();
    const allowance = alloc.allocated || alloc.passAllowance || 0;
    const teamPasses = await passesRef.where('teamId', '==', teamId).get();
    const passesUsed = teamPasses.docs.reduce((sum, d) => sum + (d.data().status === 'approved' ? (d.data().numPasses || 0) : 0), 0);
    return { passesLeft: allowance - passesUsed, teamPasses };
  };

  // A directly sent request (no pass request behind it), already approved
  const buildSendJob = (teamId, team) => {
    const name = String(request.data.name || '').trim();
    const digits = String(request.data.phoneNumber || '').replace(/\D/g, '');
    const numPasses = parseInt(request.data.numPasses, 10);
    if (!name || !digits) {
      throw new HttpsError('invalid-argument', 'Name and phone number are required.');
    }
    if (isNaN(numPasses) || numPasses < 1 || numPasses > MAX_SEND) {
      throw new HttpsError('invalid-argument', `Number of passes must be between 1 and ${MAX_SEND}.`);
    }
    return {
      ref: passesRef.doc(),
      replace: false,
      data: {
        name,
        phoneNumber: digits.length === 10 ? '91' + digits : digits,
        numPasses,
        note: 'Sent directly by admin',
        status: 'approved',
        teamId,
        team,
        userId,
        createdAt: now,
        updatedAt: now,
        actionBy: userId,
        pdfDelivery: PDF_DELIVERY
      },
      delivery: queueDelivery('send', numPasses)
    };
  };

  if (action === 'resend') {
    const passIds = Array.isArray(request.data.passIds) ? [...new Set(request.data.passIds)] : [];
    if (!passIds.length) {
      throw new HttpsError('invalid-argument', 'No passes selected.');
    }
    // Team admins can only resend their own team's passes
    let teamId = null;
    if (!isSuperAdmin) {
      const userSnap = await db.collection('ccpl-users').doc(userId).get();
      const user = userSnap.exists ? userSnap.data() : null;
      if (!user || user.type !== 'team admin' || !user.teamId) {
        throw new HttpsError('permission-denied', 'Only admins can resend passes.');
      }
      teamId = user.teamId;
    }
    const onlyUnsent = !!request.data.onlyUnsent;
    for (const id of passIds) {
      const snap = await passesRef.doc(id).get();
      if (!snap.exists || (teamId && snap.data().teamId !== teamId)) {
        throw new HttpsError('not-found', 'A selected pass was not found. Please refresh and try again.');
      }
      const data = snap.data();
      if (!['approved', 'confirmed'].includes(data.status)) {
        throw new HttpsError('failed-precondition', `${data.name}'s request has not been approved.`);
      }
      if (deliveryInProgress(data.delivery)) {
        throw new HttpsError('failed-precondition', `${data.name}'s passes are still being sent. Please wait for that to finish.`);
      }
      // Older requests without a delivery record kept their progress in passesSent
      const sentBefore = data.delivery ? (data.delivery.passesSent || 0) : (data.passesSent || 0);
      jobs.push({
        ref: snap.ref,
        resend: true,
        data,
        delivery: onlyUnsent && sentBefore < data.numPasses
          ? queueDelivery('retry', data.numPasses, sentBefore)
          : queueDelivery('resend', data.numPasses)
      });
    }
  } else if (isSuperAdmin && action === 'send') {
    // Super admins send from the CCPL team and aren't held to CCPL's allocation
    jobs.push(buildSendJob(CCPL_TEAM_ID, CCPL_TEAM_NAME));
  } else if (isSuperAdmin) {
    const passIds = Array.isArray(request.data.passIds) ? [...new Set(request.data.passIds)] : [];
    if (!passIds.length) {
      throw new HttpsError('invalid-argument', 'No pass requests selected.');
    }
    for (const id of passIds) {
      const snap = await passesRef.doc(id).get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'A selected pass request was not found. Please refresh and try again.');
      }
      if (snap.data().status !== 'pending') {
        throw new HttpsError('failed-precondition', `${snap.data().name}'s request is no longer pending. Please refresh and try again.`);
      }
      jobs.push({
        ref: snap.ref,
        replace: true,
        data: { ...snap.data(), status: 'approved', updatedAt: now, actionBy: userId, pdfDelivery: PDF_DELIVERY },
        delivery: queueDelivery('send', snap.data().numPasses)
      });
    }
  } else {
    // Otherwise the caller must be a team admin; passes are only handled for their own team
    const userSnap = await db.collection('ccpl-users').doc(userId).get();
    const user = userSnap.exists ? userSnap.data() : null;
    if (!user || user.type !== 'team admin' || !user.teamId) {
      throw new HttpsError('permission-denied', 'Only team admins can approve or send passes.');
    }
    const teamId = user.teamId;
    const { passesLeft, teamPasses } = await getPassesLeft(teamId);

    if (action === 'approve') {
      const passIds = Array.isArray(request.data.passIds) ? [...new Set(request.data.passIds)] : [];
      if (!passIds.length) {
        throw new HttpsError('invalid-argument', 'No pass requests selected.');
      }
      for (const id of passIds) {
        const snap = teamPasses.docs.find(d => d.id === id);
        if (!snap) {
          throw new HttpsError('not-found', 'A selected pass request was not found for your team. Please refresh and try again.');
        }
        if (snap.data().status !== 'pending') {
          throw new HttpsError('failed-precondition', `${snap.data().name}'s request is no longer pending. Please refresh and try again.`);
        }
        jobs.push({
          ref: snap.ref,
          replace: true,
          data: { ...snap.data(), status: 'approved', updatedAt: now, actionBy: userId, pdfDelivery: PDF_DELIVERY },
          delivery: queueDelivery('send', snap.data().numPasses)
        });
      }
    } else {
      jobs.push(buildSendJob(teamId, user.team || String(request.data.teamName || '')));
    }

    const needed = jobs.reduce((sum, j) => sum + j.data.numPasses, 0);
    if (needed > passesLeft) {
      throw new HttpsError('failed-precondition', `Not enough passes: this needs ${needed} but only ${passesLeft} are left.`);
    }
  }

  // Write the approved records with their delivery queued; deliverQueuedPasses does the sending
  for (const job of jobs) {
    if (job.resend) {
      await job.ref.update({ delivery: job.delivery });
    } else if (job.replace) {
      await job.ref.delete();
      await createWithRetry(job.ref, { ...job.data, delivery: job.delivery });
    } else {
      await job.ref.create({ ...job.data, delivery: job.delivery });
    }
  }

  return { results: jobs.map(job => ({ id: job.ref.id, name: job.data.name, total: job.data.numPasses, jobId: job.delivery.jobId })) };
});

/**
 * Sends a request's passes in the background whenever its delivery is queued
 * (by generateIndividualPassPDFs). One PDF + WhatsApp message per pass, with progress written
 * to delivery.passesSent after each one so the website can show it live.
 *   mode 'send':   first delivery after approve/send
 *   mode 'resend': every pass again, reusing PDFs already uploaded
 *   mode 'retry':  only the passes the last attempt didn't get to (from delivery.passesSent)
 * The request is already 'approved', so these updates don't trigger generatePassPDF.
 */
exports.deliverQueuedPasses = onDocumentWritten({
  document: 'ticketing/{eventId}/passes/{passId}',
  region: 'asia-south1',
  memory: '1GiB',
  timeoutSeconds: 540,
  concurrency: 1, // one headless Chrome per instance
  maxInstances: 20
}, async (event) => {
  const after = event.data?.after;
  const queued = after?.exists ? after.data().delivery : null;
  if (queued?.state !== 'queued') return;

  const db = admin.firestore();
  const ref = after.ref;

  // Claim the job first, so a duplicate event can never send the same passes twice
  const data = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data() : null;
    if (current?.delivery?.state !== 'queued' || current.delivery.jobId !== queued.jobId) return null;
    tx.update(ref, { 'delivery.state': 'sending', 'delivery.startedAt': new Date(), 'delivery.updatedAt': new Date() });
    return current;
  });
  if (!data) return;

  const { eventId } = event.params;
  const { mode } = data.delivery;
  const total = data.numPasses;
  const pdfUrls = [...(data.pdfUrls || [])];
  let passesSent = mode === 'retry' ? Math.min(data.delivery.passesSent || 0, total) : 0;
  let browser = null;
  let page = null;

  try {
    const eventDoc = await db.collection('ticketing').doc(eventId).get();
    if (!eventDoc.exists) throw new Error('Match day not found.');
    const eventData = eventDoc.data();
    const { eventDate, passDesign } = await passContext(db, eventData);

    for (let i = passesSent; i < total; i++) {
      const passNumber = i + 1;

      if (!pdfUrls[i]) {
        if (!page) {
          browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
          });
          page = await openPassPage(browser);
        }
        const pdfBuffer = await renderPassPDF(page, {
          passId: ref.id,
          eventId,
          userName: data.name,
          eventName: eventData.name,
          eventDate: eventData.date,
          teamName: data.team,
          phoneNumber: data.phoneNumber,
          numPasses: total,
          ...passDesign
        }, passNumber);
        pdfUrls[i] = await uploadPDFToCloudinary(pdfBuffer, `${ref.id}_${passNumber}of${total}`);
        logger.info(`Pass ${passNumber}/${total} for ${ref.id} uploaded to Cloudinary:`, pdfUrls[i]);
      }

      await sendPassWhatsAppNotification({
        phoneNumber: data.phoneNumber,
        userName: data.name,
        eventName: eventData.name,
        eventDate,
        pdfUrl: pdfUrls[i],
        filename: passFileName(data.name, passNumber, total),
        approverName: data.approvedBy || data.approverName || 'Admin'
      });
      passesSent = passNumber;
      // pdfUrl kept as the first pass for existing readers
      await ref.update({ 'delivery.passesSent': passesSent, 'delivery.updatedAt': new Date(), pdfUrls, pdfUrl: pdfUrls[0] });
    }

    await ref.update({
      'delivery.state': 'sent',
      'delivery.error': null,
      'delivery.updatedAt': new Date(),
      'delivery.finishedAt': new Date(),
      passesSent,
      pdfError: null,
      ...(mode === 'send' ? { pdfGeneratedAt: new Date() } : { lastResentAt: new Date(), lastResentBy: data.delivery.requestedBy })
    });
    logger.info(`All ${total} passes for ${ref.id} sent (${mode})`);
  } catch (error) {
    logger.error(`Error delivering passes for ${ref.id} (${mode}):`, error.response?.data || error);
    const message = error.response?.data?.message || error.message;
    await ref.update({
      'delivery.state': 'failed',
      'delivery.error': message,
      'delivery.passesSent': passesSent,
      'delivery.updatedAt': new Date(),
      'delivery.finishedAt': new Date(),
      pdfUrls,
      passesSent,
      pdfError: message,
      pdfErrorAt: new Date(),
      ...(pdfUrls.length ? { pdfUrl: pdfUrls[0] } : {})
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

/**
 * The event date for the WhatsApp message and the design details shown on the pass
 */
async function passContext(db, eventData) {
  const eventDate = new Date(eventData.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Shown on the pass: "Sun, Oct 18 · 4:00 PM" (match day dates are stored as "YYYY-MM-DD")
  const passDateTime = `${new Date(eventData.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })} · ${PASS_TIME}`;

  // Host team logo from teams/{hostTeamId}
  let hostTeamLogoUrl = '';
  if (eventData.hostTeamId) {
    try {
      const hostTeamDoc = await db.collection('teams').doc(eventData.hostTeamId).get();
      hostTeamLogoUrl = hostTeamDoc.exists ? (hostTeamDoc.data().logo?.url || '') : '';
    } catch (error) {
      logger.warn('Could not load host team logo:', error);
    }
  }

  return { eventDate, passDesign: { passDateTime, hostTeam: eventData.hostTeam || '', hostTeamLogoUrl } };
}

/**
 * True while a delivery is waiting or running (and recent enough that it hasn't died)
 */
function deliveryInProgress(delivery) {
  if (!delivery || !['queued', 'sending'].includes(delivery.state)) return false;
  const updatedAt = delivery.updatedAt?.toMillis?.() || 0;
  return Date.now() - updatedAt < STALE_DELIVERY_MS;
}

/**
 * Recreate a deleted request. Retries because the delete has already happened; if it still
 * fails, the full request is logged so it can be restored by hand.
 */
async function createWithRetry(ref, data, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await ref.create(data);
      return;
    } catch (error) {
      logger.error(`Recreating pass request ${ref.path} failed (attempt ${i}/${attempts}):`, error);
      if (i === attempts) {
        logger.error('PASS REQUEST NEEDS MANUAL RESTORE', { path: ref.path, data });
        throw new HttpsError('internal', `Could not save ${data.name}'s approved request. Please contact support.`);
      }
      await new Promise(resolve => setTimeout(resolve, 500 * i));
    }
  }
}

/**
 * A browser page sized to an A4 landscape pass
 */
async function openPassPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({
    width: 1122, // A4 landscape width in pixels at 96 DPI
    height: 793, // A4 landscape height in pixels at 96 DPI
    deviceScaleFactor: 2
  });
  return page;
}

/**
 * Render one pass as an A4 landscape PDF using the HTML pass template.
 * The QR code carries the pass ID and number, so a regenerated pass scans the same.
 */
async function renderPassPDF(page, passData, passNumber) {
  logger.info(`Generating pass ${passNumber} of ${passData.numPasses}...`);

  const qrData = JSON.stringify({
    passId: passData.passId,
    passNumber,
    totalPasses: passData.numPasses,
    eventId: passData.eventId,
    eventName: passData.eventName,
    userName: passData.userName,
    teamName: passData.teamName,
    phoneNumber: passData.phoneNumber,
    eventDate: passData.eventDate,
    timestamp: new Date().toISOString()
  });

  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    width: 400,
    margin: 1,
    color: { dark: '#0A1628', light: '#FFFFFF' }
  });

  const html = generatePassHTML({
    userName: passData.userName,
    eventName: passData.eventName,
    dateTimeText: passData.passDateTime,
    venue: VENUE,
    hostTeam: passData.hostTeam,
    hostTeamLogoUrl: passData.hostTeamLogoUrl,
    passCode: `CCPL-${passData.passId.slice(0, 5).toUpperCase()}-${passNumber}`,
    passNumber,
    numPasses: passData.numPasses
  }, qrCodeDataUrl);

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  return page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
}

/**
 * WhatsApp file name: "Name - 1.pdf", "Name - 2.pdf", ... (just "Name.pdf" for a single pass)
 */
function passFileName(name, passNumber, total) {
  const safeName = String(name || 'CCPL Pass').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'CCPL Pass';
  return total > 1 ? `${safeName} - ${passNumber}.pdf` : `${safeName}.pdf`;
}

/**
 * Upload a PDF to Cloudinary and return its URL
 */
async function uploadPDFToCloudinary(pdfBuffer, name) {
  const cloudName = 'dchlpsvwh';
  const uploadPreset = 'player_photos';

  const formData = new FormData();
  formData.append('file', pdfBuffer, {
    filename: `pass_${name}_${Date.now()}.pdf`,
    contentType: 'application/pdf'
  });
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'passes');
  formData.append('public_id', `pass_${name}_${Date.now()}`);
  formData.append('resource_type', 'raw');

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
    formData,
    { headers: formData.getHeaders() }
  );

  return response.data.secure_url;
}

/**
 * Send a pass PDF via the MSG91 WhatsApp 'passes' template
 */
async function sendPassWhatsAppNotification(data) {
  const authKey = '491825AxYFVkL586a740282P1';
  const templateNamespace = '4a46062d_772c_4791_a468_d2355a43e5d4';
  const integratedNumber = '919381771876';

  const phoneNumber = data.phoneNumber.replace(/\D/g, '');
  const formattedPhone = phoneNumber.length === 10 ? '91' + phoneNumber : phoneNumber;

  const payload = {
    integrated_number: integratedNumber,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: 'passes',
        language: { code: 'en', policy: 'deterministic' },
        namespace: templateNamespace,
        to_and_components: [
          {
            to: [formattedPhone],
            components: {
              header_1: { filename: data.filename, type: 'document', value: data.pdfUrl },
              body_customer_name: { type: 'text', value: data.userName, parameter_name: 'customer_name' },
              body_matchday: { type: 'text', value: data.eventName, parameter_name: 'matchday' },
              body_date: { type: 'text', value: data.eventDate, parameter_name: 'date' },
              body_admin: { type: 'text', value: data.approverName || 'Admin', parameter_name: 'admin' }
            }
          }
        ]
      }
    }
  };

  const response = await axios.post(
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    payload,
    { headers: { 'authkey': authKey, 'Content-Type': 'application/json' } }
  );

  logger.info('WhatsApp notification sent:', response.data);
  return response.data;
}

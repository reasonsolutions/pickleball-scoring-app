// WhatsApp delivery status of an approved pass request.
// The deliverQueuedPasses Cloud Function sends passes in the background and records its progress
// on the request's `delivery` field (see functions/passPDFs.js).

// A delivery still queued/sending after this long has died (the sender's timeout is 9 minutes)
const STALE_MS = 12 * 60 * 1000;

// { state: 'queued' | 'sending' | 'sent' | 'failed' | 'stuck' | 'unknown', sent, total, error }
export function passDelivery(pass) {
  const total = Number(pass.numPasses) || 0;
  const d = pass.delivery;
  if (!d) {
    // Requests sent before background delivery (or by the mobile app's merged PDF)
    if (pass.pdfError) return { state: 'failed', sent: pass.passesSent || 0, total, error: pass.pdfError };
    if (pass.pdfUrls?.length || pass.pdfUrl) return { state: 'sent', sent: total, total };
    return { state: 'unknown', sent: 0, total };
  }
  const info = { state: d.state, sent: d.passesSent || 0, total: d.total || total, error: d.error || '' };
  const updatedAt = d.updatedAt?.toMillis?.() || 0;
  if (isDelivering(info) && Date.now() - updatedAt > STALE_MS) {
    return { ...info, state: 'stuck', error: 'Sending stopped before it finished.' };
  }
  return info;
}

export const isDelivering = (info) => info.state === 'queued' || info.state === 'sending';

// Failed part-way: the passes not yet sent can be retried on their own
export const canRetry = (info) => (info.state === 'failed' || info.state === 'stuck') && info.sent < info.total;

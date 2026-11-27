import {
  ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Output, Quality, WebMOutputFormat,
  canEncodeAudio, canEncodeVideo,
} from 'mediabunny';

// Encodes with the browser's own WebCodecs VP9/Opus encoders (hardware-accelerated where available).
// preset -> target quality; Mediabunny scales the bitrate to the output resolution.
// Bitrate-driven on purpose: Chrome's quantizer (CRF-like) VP9 mode produces files several times larger.
export const PRESETS = {
  balanced: { quality: 'medium', label: 'VP9 · medium' },
  small: { quality: 'low', label: 'VP9 · low' },
  extreme: { quality: 'very-low', label: 'VP9 · very low' },
};

/** Checks that this browser can encode VP9 video and Opus audio. */
export async function checkSupport() {
  if (typeof VideoEncoder === 'undefined') return { vp9: false, opus: false };
  const [vp9, opus] = await Promise.all([
    canEncodeVideo('vp9').catch(() => false),
    canEncodeAudio('opus').catch(() => false),
  ]);
  return { vp9, opus };
}

/**
 * Converts one MP4 File to a WebM Blob.
 * onProgress receives a 0-99 percentage. Returns { promise, cancel }.
 */
export function convertToWebm(file, { preset, height, fps, audio }, onProgress) {
  let conversion = null;
  let cancelled = false;

  const promise = (async () => {
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const target = new BufferTarget();
    const output = new Output({ format: new WebMOutputFormat(), target });
    const quality = new Quality({ quality: (PRESETS[preset] || PRESETS.small).quality, preferBitrate: true });

    conversion = await Conversion.init({
      input,
      output,
      video: async (track) => {
        const opts = { codec: 'vp9', quality, keyFrameInterval: 8, forceTranscode: true };
        if (height > 0 && track.displayHeight > height) opts.height = height;
        if (fps > 0) {
          const { averagePacketRate } = await track.computePacketStats(120);
          if (averagePacketRate > fps + 0.5) opts.frameRate = fps;
        }
        return opts;
      },
      audio: audio === 'none'
        ? { discard: true }
        : {
          codec: 'opus',
          bitrate: audio === 'normal' ? 48000 : 24000,
          numberOfChannels: audio === 'normal' ? 2 : 1,
          sampleRate: 48000,
          forceTranscode: true,
        },
      showWarnings: false,
    });
    if (cancelled) throw new Error('Cancelled');
    if (!conversion.isValid) {
      const why = conversion.discardedTracks.map((t) => `${t.track.type}: ${t.reason}`).join(', ');
      throw new Error(`This file can't be converted in this browser (${why || 'unsupported'})`);
    }

    conversion.onProgress = (p) => onProgress(Math.min(99, Math.round(p * 100)));
    await conversion.execute();
    return new Blob([target.buffer], { type: 'video/webm' });
  })();

  const cancel = () => {
    cancelled = true;
    conversion?.cancel();
  };

  return { promise, cancel };
}

export function bytes(b) {
  if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1e3)) + ' KB';
}

export function seconds(s) {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

export const isMp4 = (f) => /\.mp4$/i.test(f.name) || f.type === 'video/mp4';

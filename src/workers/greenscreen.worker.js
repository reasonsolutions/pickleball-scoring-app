import { processPixels } from '../utils/chromaKey';

self.onmessage = (e) => {
  const { id, width, height, buffer, settings, scale } = e.data;
  try {
    const out = processPixels(new Uint8ClampedArray(buffer), width, height, settings, scale);
    self.postMessage({ id, width, height, buffer: out.buffer }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};

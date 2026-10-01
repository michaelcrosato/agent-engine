import { spectrum } from './fft.ts';

/**
 * Renders a waveform strip (top) and log-frequency spectrogram (bottom) as RGBA8 pixels.
 * Time runs left → right; low frequencies at the bottom. Used by `npm run sfx` previews.
 */
export function spectrogram(
  s: Float32Array,
  sampleRate: number,
  width = 512,
  height = 256,
): Uint8ClampedArray {
  const px = new Uint8ClampedArray(width * height * 4);
  const waveH = Math.floor(height / 4);
  const specH = height - waveH;
  const n = 1024;
  const set = (x: number, y: number, r: number, g: number, b: number) => {
    const i = (y * width + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };
  for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) set(x, y, 12, 12, 16);
  for (let x = 0; x < width; x++) {
    const a = Math.floor((x / width) * s.length);
    const b = Math.max(a + 1, Math.floor(((x + 1) / width) * s.length));
    let lo = 0;
    let hi = 0;
    for (let i = a; i < b && i < s.length; i++) {
      lo = Math.min(lo, s[i]!);
      hi = Math.max(hi, s[i]!);
    }
    const y0 = Math.floor(waveH / 2 - (hi * waveH) / 2);
    const y1 = Math.ceil(waveH / 2 - (lo * waveH) / 2);
    for (let y = Math.max(0, y0); y <= Math.min(waveH - 1, y1); y++) set(x, y, 90, 200, 255);
    const mag = spectrum(s, Math.max(0, Math.min(s.length - n, a)), n);
    for (let y = 0; y < specH; y++) {
      const f = 30 * (sampleRate / 2 / 30) ** (1 - y / specH);
      const bin = Math.min(mag.length - 1, Math.round((f * n) / sampleRate));
      const v = Math.max(0, Math.min(1, (20 * Math.log10(mag[bin]! + 1e-9) + 60) / 70));
      set(x, waveH + y, v * 255, v * v * 200, (1 - v) * v * 400);
    }
  }
  return px;
}

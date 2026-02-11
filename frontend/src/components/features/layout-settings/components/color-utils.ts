// Color utility functions for layout-settings theme controls
// Implements RF-07 (layout configuration per user/tenant)

export const hexToRgb = (hex: string) => {
  if (!hex) return null;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

export const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100; l /= 100; h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1/3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1/3);
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export const rotateHue = (hex: string, deg: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let h = (hsl.h + deg) % 360; if (h < 0) h += 360;
  const rgb2 = hslToRgb(h, hsl.s, hsl.l);
  return rgbToHex(rgb2.r, rgb2.g, rgb2.b);
};

export const adjustLightness = (hex: string, delta: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const l = clamp(hsl.l + delta, 0, 100);
  const rgb2 = hslToRgb(hsl.h, hsl.s, l);
  return rgbToHex(rgb2.r, rgb2.g, rgb2.b);
};

export const luminance = (r: number, g: number, b: number) => {
  const srgb = [r / 255, g / 255, b / 255].map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};

export const contrastRatio = (hex1: string, hex2: string) => {
  const a = hexToRgb(hex1); const b = hexToRgb(hex2);
  if (!a || !b) return 21;
  const L1 = luminance(a.r, a.g, a.b); const L2 = luminance(b.r, b.g, b.b);
  const bright = Math.max(L1, L2); const dark = Math.min(L1, L2);
  return (bright + 0.05) / (dark + 0.05);
};

export const pickTextColorForBackground = (bgHex: string, minContrast = 4.5) => {
  if (!bgHex) return '#000000';
  const cWhite = contrastRatio(bgHex, '#ffffff');
  if (cWhite >= minContrast) return '#ffffff';
  const cBlack = contrastRatio(bgHex, '#000000');
  if (cBlack >= minContrast) return '#000000';
  let attempts = 0; let test = bgHex;
  while (attempts < 8) {
    test = adjustLightness(test, attempts % 2 === 0 ? 6 : -6);
    if (contrastRatio(test, '#ffffff') >= minContrast) return '#ffffff';
    if (contrastRatio(test, '#000000') >= minContrast) return '#000000';
    attempts++;
  }
  return cWhite > cBlack ? '#ffffff' : '#000000';
};

/**
 * Generates a Mantine-compatible color palette (10 shades) from a single hex color.
 * Uses HSL manipulation to create shades.
 */
export function generateColorPalette(hex: string): string[] {
  // Simple hex to RGB conversion
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // RGB to HSL
  const r_norm = r / 255;
  const g_norm = g / 255;
  const b_norm = b / 255;
  const max = Math.max(r_norm, g_norm, b_norm);
  const min = Math.min(r_norm, g_norm, b_norm);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_norm: h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0); break;
      case g_norm: h = (b_norm - r_norm) / d + 2; break;
      case b_norm: h = (r_norm - g_norm) / d + 4; break;
    }
    h /= 6;
  }

  // Generate 10 shades by varying lightness
  // Mantine shades: 0 is lightest, 9 is darkest. 6 / 7 is usually the primary.
  // We'll target the input color to be at index 6.
  const shades: string[] = [];
  
  // Lightness levels for shades 0-9
  const lightnessLevels = [0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
  
  // Shift lightness based on input color's lightness
  const lFactor = l / 0.4; // assume input is roughly shade 6

  for (let i = 0; i < 10; i++) {
    let targetL = lightnessLevels[i] * lFactor;
    // clamp
    targetL = Math.max(0.05, Math.min(0.95, targetL));
    shades.push(hslToHex(h, s, targetL));
  }

  return shades;
}

function hslToHex(h: number, s: number, l: number): string {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function toHex(x: number): string {
  const hex = Math.round(x * 255).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

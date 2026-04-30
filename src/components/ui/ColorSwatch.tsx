interface ColorSwatchProps {
  colorCode: string;
  className?: string;
}

function parseColor(colorCode: string): { r: number; g: number; b: number } | null {
  const value = colorCode.trim().toLowerCase();

  if (/^#([0-9a-f]{3})$/.test(value)) {
    const hex = value.slice(1);
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }

  if (/^#([0-9a-f]{6})$/.test(value)) {
    const hex = value.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  const rgbMatch = value.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  return null;
}

function isLightColor(colorCode: string): boolean {
  const rgb = parseColor(colorCode);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance >= 0.82;
}

export default function ColorSwatch({ colorCode, className = 'w-8 h-8 rounded-md' }: ColorSwatchProps) {
  const light = isLightColor(colorCode);

  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{
        backgroundColor: colorCode,
        border: light ? '1px solid #94a3b8' : '1px solid #cbd5e1',
        boxShadow: light ? 'inset 0 0 0 1px rgba(255,255,255,0.9)' : 'none',
      }}
    />
  );
}

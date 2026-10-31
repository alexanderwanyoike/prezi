function rgb(color: string): [number, number, number] {
  const channels = color.match(/[\d.]+/g)?.map(Number);
  const [red, green, blue] = channels ?? [];
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Expected a rendered RGB colour, received ${color}`);
  }
  return [red / 255, green / 255, blue / 255];
}

export function saturation(color: string): number {
  const channels = rgb(color);
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const difference = maximum - minimum;
  return difference === 0 ? 0 : difference / (1 - Math.abs(maximum + minimum - 1));
}

function luminance(color: string): number {
  const [red, green, blue] = rgb(color).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error('Expected three colour channels');
  }
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

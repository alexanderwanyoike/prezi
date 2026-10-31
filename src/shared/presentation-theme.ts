import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const presentationThemeSchema = z.object({
  background: color,
  foreground: color,
  muted: color,
  accent: color,
  surface: color,
  border: color,
  padding: z.number().int().min(64).max(180),
  bodyFont: z.enum(['manrope', 'plex']),
  monoFont: z.enum(['manrope', 'plex']),
  animation: z.enum(['rise', 'fade', 'none']),
  transitionMs: z.number().int().min(250).max(400),
});
export type PresentationTheme = z.infer<typeof presentationThemeSchema>;
export const defaultPresentationTheme: PresentationTheme = {
  background: '#101513',
  foreground: '#edf2ec',
  muted: '#a5b2a8',
  accent: '#9bbb9f',
  surface: '#162019',
  border: '#36483c',
  padding: 128,
  bodyFont: 'manrope',
  monoFont: 'plex',
  animation: 'rise',
  transitionMs: 300,
};
export function presentationTheme(theme?: PresentationTheme): PresentationTheme {
  return theme ?? defaultPresentationTheme;
}
export function presentationFont(font: PresentationTheme['bodyFont']): string {
  return font === 'plex' ? 'IBM Plex Mono, monospace' : 'Manrope Variable, sans-serif';
}

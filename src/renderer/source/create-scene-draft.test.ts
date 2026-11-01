import { expect, it } from 'vitest';
import { createSceneDraft } from './create-scene-draft';
import { defaultPresentationTheme } from '../../shared/presentation-theme';

it('seeds a new custom scene with the current deck text colour', () => {
  const draft = createSceneDraft(
    { id: crypto.randomUUID(), title: 'A light deck', body: '', layout: 'title', reveals: [] },
    undefined,
    { ...defaultPresentationTheme, foreground: '#18221c' },
  );
  const metadata: unknown = JSON.parse(draft.metadata);
  expect(metadata).toMatchObject({ fields: { ink: { default: '#18221c' } } });
});

it('creates custom scenes without hard-coded show branding', () => {
  const draft = createSceneDraft(
    {
      id: crypto.randomUUID(),
      title: 'Heading',
      body: '',
      layout: 'title',
      reveals: [],
    },
    undefined,
  );
  expect(draft.files[draft.entry]).not.toContain('THE 0SMOSYS SHOW');
});

import { describe, expect, it } from 'vitest';
import { validSceneValues } from './scene-definition';

describe('scene property definitions', () => {
  it('rejects inherited names that were never declared as editable properties', () => {
    expect(validSceneValues({ fields: {} }, { constructor: 'unexpected' })).toBe(false);
    expect(validSceneValues({ fields: {} }, { toString: 'unexpected' })).toBe(false);
  });
});

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { ProjectOwner } from './project-owner';
import { confirmReplacement } from './confirm-replacement';

test('keeps the project open when an agent edits while save-before-close is writing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prezi-concurrent-save-'));
  const owner = new ProjectOwner();
  try {
    owner.edit({
      requestId: 'manual',
      expectedRevision: 0,
      label: 'Manual title',
      operations: [{ type: 'renameProject', name: 'Saved version' }],
    });
    const confirming = confirmReplacement(
      owner,
      () => Promise.resolve(0),
      () => owner.save(join(directory, 'deck.json')),
    );
    await Promise.resolve();
    owner.edit({
      requestId: 'agent',
      expectedRevision: 1,
      label: 'Agent: change during save',
      operations: [{ type: 'renameProject', name: 'New unsaved version' }],
    });
    expect(await confirming).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(owner.snapshot()).toMatchObject({
      dirty: true,
      project: { name: 'New unsaved version' },
    });
    expect(
      await confirmReplacement(
        owner,
        () => Promise.resolve(0),
        () => owner.save(join(directory, 'deck.json')),
      ),
    ).toMatchObject({ ok: true });
    expect(owner.snapshot().dirty).toBe(false);
  } finally {
    await owner.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

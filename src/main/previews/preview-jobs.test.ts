import { expect, it } from 'vitest';
import { ProjectOwner } from '../project/project-owner';
import { RenderWork } from '../source/render-work';
import { PreviewJobs } from './preview-jobs';
import type { Result } from '../../shared/result';
import type { PreviewImage } from '../../shared/preview';

it('captures an immutable snapshot once without changing the deck and cancels queued previews', async () => {
  const owner = new ProjectOwner();
  const initial = owner.snapshot();
  const slide = initial.project.slides[0];
  if (!slide) throw Error('No slide');
  const work = new RenderWork();
  let release: (result: Result<void>) => void = () => undefined;
  const blocking = work.run(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    new AbortController().signal,
  );
  const captured: string[] = [];
  const image: PreviewImage = { dataUrl: 'data:image/jpeg;base64,/9j/', width: 960, height: 540 };
  const jobs = new PreviewJobs(owner, work, (project, id) => {
    captured.push(project.slides.find((item) => item.id === id)?.title ?? 'missing');
    return Promise.resolve({ ok: true, value: image });
  });
  const request = { requestId: 'preview:one', slideId: slide.id, expectedRevision: 0, reveal: 0 };
  const submitted = jobs.submit(request);
  expect(submitted).toMatchObject({ ok: true, value: { state: 'queued' } });
  expect(jobs.submit(request)).toEqual(submitted);
  expect(jobs.submit({ ...request, reveal: 1 })).toMatchObject({
    ok: false,
    error: { code: 'REQUEST_REUSED' },
  });
  jobs.submit({ ...request, requestId: 'preview:cancel' });
  expect(jobs.cancel('preview:cancel')).toMatchObject({ ok: true, value: { state: 'cancelled' } });
  expect(captured).toEqual([]);
  expect(owner.snapshot()).toEqual(initial);
  release({ ok: true, value: undefined });
  await blocking;
  await expect
    .poll(() => jobs.read('preview:one'))
    .toMatchObject({ ok: true, value: { state: 'complete', image, revision: 0 } });
  expect(captured).toEqual([slide.title]);
  expect(owner.snapshot()).toEqual(initial);
  jobs.dispose();
});

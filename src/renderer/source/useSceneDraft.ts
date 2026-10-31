import { useEffect, useRef, useState } from 'react';
import type { EditOperation, Project, Slide } from '../../shared/project';
import type { SceneDraft } from '../../shared/scene-draft';
import { sceneCandidateSchema, validSceneValues } from '../../shared/scene-definition';
import type { SceneJob } from '../../shared/scene-jobs';
import { createSceneDraft } from './create-scene-draft';

export function useSceneDraft(
  project: Project,
  slide: Slide,
  pending: boolean,
  edit: (operations: EditOperation[], label: string) => void,
  flush: () => Promise<void>,
) {
  const stored = project.drafts?.[slide.id];
  const optimistic = useRef(stored);
  if (!pending) optimistic.current = stored;
  const draft = pending ? optimistic.current : stored;
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<SceneJob | null>(null);
  const definition = project.scenes?.[slide.scene?.definitionId ?? ''];
  const conflict = !!draft && draft.baseVersion !== (definition?.version ?? null);
  const active = !!job && ['queued', 'compiling', 'validating'].includes(job.state);
  const jobId = job?.id;
  useEffect(() => {
    if (!active || !jobId) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = (): void => {
      void window.prezi.sceneJob(jobId).then((result) => {
        if (stopped) return;
        if (result.ok) {
          setJob(result.value);
          if (['queued', 'compiling', 'validating'].includes(result.value.state))
            timer = setTimeout(poll, 200);
        } else setError(result.error.message);
      });
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, jobId]);
  function commit(next: SceneDraft | null, label: string): void {
    optimistic.current = next ?? undefined;
    setError(null);
    edit([{ type: 'setSceneDraft', slideId: slide.id, draft: next }], label);
  }
  async function apply(force = false): Promise<void> {
    setError(null);
    await flush();
    const snapshot = await window.prezi.snapshot();
    if (!snapshot.ok) {
      setError(snapshot.error.message);
      return;
    }
    const current = snapshot.value.project.drafts?.[slide.id];
    if (!current) {
      setError('This source draft no longer exists.');
      return;
    }
    let metadata: unknown;
    try {
      metadata = JSON.parse(current.metadata);
    } catch (failure) {
      setError(`definition.json: ${failure instanceof Error ? failure.message : 'Invalid JSON'}`);
      return;
    }
    if (typeof metadata !== 'object' || metadata === null) {
      setError('definition.json must contain the scene name, fields and layers.');
      return;
    }
    const parsed = sceneCandidateSchema.safeParse({
      ...metadata,
      id: current.definitionId,
      source: { entry: current.entry, files: current.files },
    });
    if (!parsed.success) {
      setError(
        `definition.json: ${parsed.error.issues[0]?.message ?? 'The definition is invalid.'}`,
      );
      return;
    }
    const currentSlide = snapshot.value.project.slides.find((item) => item.id === slide.id);
    const properties = Object.fromEntries(
      Object.entries(currentSlide?.scene?.properties ?? {}).filter(([name, value]) =>
        validSceneValues(parsed.data, { [name]: value }),
      ),
    );
    const currentDefinition =
      snapshot.value.project.scenes?.[currentSlide?.scene?.definitionId ?? ''];
    const result = await window.prezi.submitScene({
      requestId: crypto.randomUUID(),
      expectedRevision: snapshot.value.revision,
      expectedDefinitionVersion: force ? (currentDefinition?.version ?? null) : current.baseVersion,
      consumeDraft: true,
      label: 'Apply scene source',
      slideId: slide.id,
      candidate: parsed.data,
      properties,
    });
    if (result.ok) setJob(result.value);
    else setError(result.error.message);
  }
  return {
    draft,
    error,
    job,
    active,
    conflict,
    create: (): SceneDraft => {
      const next = createSceneDraft(slide, definition);
      commit(next, 'Create scene draft');
      return next;
    },
    discard: (): void => {
      commit(null, 'Discard scene draft');
      setJob(null);
    },
    changeFile: (name: string, text: string): void => {
      const { current } = optimistic;
      if (current)
        commit({ ...current, files: { ...current.files, [name]: text } }, 'Edit scene source');
    },
    removeFile: (name: string): void => {
      const { current } = optimistic;
      if (current && name !== current.entry)
        commit(
          {
            ...current,
            files: Object.fromEntries(
              Object.entries(current.files).filter(([path]) => path !== name),
            ),
          },
          'Remove scene source file',
        );
    },
    changeMetadata: (text: string): void => {
      const { current } = optimistic;
      if (current) commit({ ...current, metadata: text }, 'Edit scene definition');
    },
    apply,
    cancel: (): void => {
      if (jobId)
        void window.prezi.cancelSceneJob(jobId).then((result) => {
          if (result.ok) setJob(result.value);
          else setError(result.error.message);
        });
    },
  };
}

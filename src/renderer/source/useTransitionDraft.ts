import { useEffect, useRef, useState } from 'react';
import type { EditOperation, Project } from '../../shared/project';
import type { SceneDraft } from '../../shared/scene-draft';
import type { SceneJob } from '../../shared/scene-jobs';
import type { SceneValues } from '../../shared/scene-definition';
import { transitionCandidateSchema } from '../../shared/transition';
import { createTransitionDraft, readTransitionMetadata } from './transition-draft';

export function useTransitionDraft(
  project: Project,
  pending: boolean,
  edit: (operations: EditOperation[], label: string) => void,
  flush: () => Promise<void>,
) {
  const stored = project.transitionDraft;
  const optimistic = useRef(stored);
  if (!pending) optimistic.current = stored;
  const draft = pending ? optimistic.current : stored;
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<SceneJob | null>(null);
  const conflict = !!draft && draft.baseVersion !== (project.transition?.version ?? null);
  const active = !!job && ['queued', 'compiling', 'validating'].includes(job.state);
  const jobId = job?.id;
  useEffect(() => {
    if (!active || !jobId) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = (): void => {
      void window.prezi.transitionJob(jobId).then((result) => {
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
    edit([{ type: 'setTransitionDraft', draft: next }], label);
  }
  async function apply(force = false): Promise<void> {
    setError(null);
    await flush();
    const snapshot = await window.prezi.snapshot();
    if (!snapshot.ok) {
      setError(snapshot.error.message);
      return;
    }
    const current = snapshot.value.project.transitionDraft;
    if (!current) {
      setError('This transition draft no longer exists.');
      return;
    }
    const metadata = readTransitionMetadata(current.metadata);
    if (!metadata.ok) {
      setError(metadata.error.message);
      return;
    }
    const candidate = transitionCandidateSchema.safeParse({
      ...metadata.value,
      id: current.definitionId,
      source: { entry: current.entry, files: current.files },
    });
    if (!candidate.success) {
      setError(
        `definition.json: ${candidate.error.issues[0]?.message ?? 'Invalid transition definition.'}`,
      );
      return;
    }
    const result = await window.prezi.submitTransition({
      requestId: `transition:${crypto.randomUUID()}`,
      expectedRevision: snapshot.value.revision,
      expectedVersion: force
        ? (snapshot.value.project.transition?.version ?? null)
        : current.baseVersion,
      consumeDraft: true,
      label: 'Apply transition source',
      candidate: candidate.data,
      properties: metadata.value.properties,
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
    apply,
    create: (): SceneDraft => {
      const next = createTransitionDraft(project.transition);
      commit(next, 'Create transition draft');
      return next;
    },
    discard: (): void => {
      commit(null, 'Discard transition draft');
      setJob(null);
    },
    changeFile: (name: string, text: string): void => {
      const { current } = optimistic;
      if (current)
        commit({ ...current, files: { ...current.files, [name]: text } }, 'Edit transition source');
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
          'Remove transition source file',
        );
    },
    changeMetadata: (text: string): void => {
      const { current } = optimistic;
      if (current) commit({ ...current, metadata: text }, 'Edit transition definition');
    },
    changeProperty: (name: string, value: SceneValues[string]): void => {
      const current = optimistic.current ?? createTransitionDraft(project.transition);
      const metadata = readTransitionMetadata(current.metadata);
      if (!metadata.ok) {
        setError(metadata.error.message);
        return;
      }
      commit(
        {
          ...current,
          metadata: JSON.stringify(
            { ...metadata.value, properties: { ...metadata.value.properties, [name]: value } },
            null,
            2,
          ),
        },
        'Edit transition property',
      );
    },
    cancel: (): void => {
      if (jobId)
        void window.prezi.cancelTransitionJob(jobId).then((result) => {
          if (result.ok) setJob(result.value);
          else setError(result.error.message);
        });
    },
  };
}

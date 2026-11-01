import { createContext, useContext } from 'react';
import type { RuntimeDefinition, RuntimeState, RuntimeEvent } from '../shared/scene-runtime';

export interface SceneContext {
  definition: RuntimeDefinition;
  state: RuntimeState;
  emit: (event: RuntimeEvent) => void;
}
export const sceneContext = createContext<SceneContext | null>(null);
export function useScene(): SceneContext {
  const scene = useContext(sceneContext);
  if (!scene) throw new Error('Scene helpers require the scene runtime.');
  return scene;
}

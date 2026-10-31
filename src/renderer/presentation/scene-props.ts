import type { PresentationTheme } from '../../shared/presentation-theme';
import type { Slide } from '../../shared/project';
import type { CustomSceneDefinition } from '../../shared/scene-definition';
import type { SceneEditing } from './SceneText';
import type { CustomSceneEditing } from './CustomScenePlayer';

export interface SceneProps extends Record<string, unknown> {
  slide: Slide;
  theme?: PresentationTheme | undefined;
  reveal: number;
  slideNumber: number;
  slideCount: number;
  editing?: SceneEditing;
  definition?: CustomSceneDefinition | undefined;
  customEditing?: CustomSceneEditing | undefined;
  mediaActive?: boolean;
  mediaAutoplay?: boolean;
}

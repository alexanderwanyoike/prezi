import scene from '../renderer/presentation/SlideScene?raw';
import text from '../renderer/presentation/SceneText?raw';
import media from '../renderer/presentation/SceneMedia?raw';
import player from '../renderer/presentation/ScenePlayer?raw';
import definition from '../renderer/presentation/text-scene-definition?raw';
import textProps from './text-scene?raw';
import mediaProps from './media?raw';
import project from './project?raw';
import styles from '../renderer/styles/presentation.css?raw';

export const builtInSceneSources: Record<string, string> = {
  'renderer/presentation/SlideScene.tsx': scene,
  'renderer/presentation/SceneText.tsx': text,
  'renderer/presentation/SceneMedia.tsx': media,
  'renderer/presentation/ScenePlayer.tsx': player,
  'renderer/presentation/text-scene-definition.ts': definition,
  'renderer/styles/presentation.css': styles,
  'shared/text-scene.ts': textProps,
  'shared/media.ts': mediaProps,
  'shared/project.ts': project,
};

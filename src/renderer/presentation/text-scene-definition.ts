import { textLayers, textScenePropsSchema } from '../../shared/text-scene';
import { SlideScene } from './SlideScene';

export const textSceneDefinition = {
  id: 'text',
  Component: SlideScene,
  propsSchema: textScenePropsSchema,
  layers: textLayers,
} as const;

import { presentationTheme } from '../../shared/presentation-theme';
import type { PresentationTheme } from '../../shared/presentation-theme';
import type { Slide } from '../../shared/project';
import type { CustomSceneDefinition } from '../../shared/scene-definition';
import type { SceneDraft } from '../../shared/scene-draft';

export function createSceneDraft(
  slide: Slide,
  definition: CustomSceneDefinition | undefined,
  theme?: PresentationTheme,
): SceneDraft {
  if (definition)
    return {
      definitionId: definition.id,
      baseVersion: definition.version ?? null,
      entry: definition.source.entry,
      files: { ...definition.source.files },
      metadata: JSON.stringify(
        { name: definition.name, fields: definition.fields, layers: definition.layers },
        null,
        2,
      ),
    };
  return {
    definitionId: crypto.randomUUID(),
    baseVersion: null,
    entry: 'Scene.tsx',
    files: {
      'Scene.tsx': `import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Layer, Text} from 'prezi';
import type {SceneProps} from 'prezi';

export default function Scene({reveal, props, theme}: SceneProps) {
  const opacity = interpolate(useCurrentFrame(), [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background:theme.background, color:props.ink, fontFamily:theme.fontFamily}}>
    <div style={{position:'absolute', left:128, top:120, fontSize:18, letterSpacing:4, color:'#9bbb9f'}}>THE 0SMOSYS SHOW</div>
    <Layer id="heading" style={{position:'absolute',left:128,top:360,width:1600,opacity,fontSize:props.size,lineHeight:1.15,letterSpacing:-3}}><Text property="heading"/></Layer>
    <Layer id="body" style={{position:'absolute',left:128,top:590,width:1600,fontSize:34,color:'#a5b2a8'}}><Text property="body"/></Layer>
    <div style={{position:'absolute',left:128,bottom:92,fontSize:16,color:'#84968a'}}>REVEAL {reveal}</div>
  </AbsoluteFill>;
}`,
    },
    metadata: JSON.stringify(
      {
        name: 'Custom scene',
        fields: {
          heading: { type: 'text', label: 'Heading', default: slide.title },
          body: { type: 'text', label: 'Body', default: slide.body, multiline: true },
          size: { type: 'number', label: 'Type size', default: 96, min: 20, max: 160 },
          ink: {
            type: 'color',
            label: 'Text colour',
            default: presentationTheme(theme).foreground,
          },
        },
        layers: [
          { id: 'heading', label: 'Heading', property: 'heading' },
          { id: 'body', label: 'Body', property: 'body' },
        ],
      },
      null,
      2,
    ),
  };
}

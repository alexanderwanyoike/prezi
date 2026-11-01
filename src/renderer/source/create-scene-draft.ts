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
import {Layer, Text, Media} from 'prezi';
import type {SceneProps} from 'prezi';

export default function Scene({reveal, reveals, hasMedia, props, theme}: SceneProps) {
  const frame = useCurrentFrame();
  const progress = theme.animation === 'none' ? 1 : interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const opacity = reveal === 0 ? progress : 1;
  const width = hasMedia ? 760 : 1600;
  return <AbsoluteFill style={{background:theme.background, color:props.ink, fontFamily:theme.fontFamily}}>
    <div style={{position:'absolute', left:theme.padding, top:120, fontSize:18, letterSpacing:4, color:theme.accent}}>THE 0SMOSYS SHOW</div>
    <Layer id="heading" style={{position:'absolute',left:theme.padding,top:360,width,opacity,fontSize:props.size,lineHeight:1.15,letterSpacing:-3}}><Text property="heading"/></Layer>
    <Layer id="body" style={{position:'absolute',left:theme.padding,top:590,width,fontSize:34,color:theme.muted}}><Text property="body"/></Layer>
    <div style={{position:'absolute',left:theme.padding,top:730,width,fontSize:30,lineHeight:1.7}}>{reveals.slice(0,reveal).map((text,index)=><div key={index} style={{opacity:index===reveal-1?progress:1}}>{text}</div>)}</div>
    {hasMedia && <Media/>}
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

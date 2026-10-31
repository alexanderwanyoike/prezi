import { Player } from '@remotion/player';
import { SlideScene } from './SlideScene';
import type { SceneProps } from './SlideScene';

export const ANIMATION_MS = 400;
export function ScenePlayer({
  scene,
  still = false,
}: {
  scene: SceneProps;
  still?: boolean;
}): React.JSX.Element {
  return (
    <Player
      component={SlideScene}
      inputProps={scene}
      compositionWidth={1920}
      compositionHeight={1080}
      durationInFrames={12}
      fps={30}
      autoPlay={!still}
      initialFrame={still ? 11 : 0}
      loop={false}
      controls={false}
      numberOfSharedAudioTags={0}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      moveToBeginningWhenEnded={false}
      style={{ width: '100%', aspectRatio: '16/9' }}
    />
  );
}

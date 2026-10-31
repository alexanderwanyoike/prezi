import { useEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { textSceneDefinition } from './text-scene-definition';
import type { SceneProps } from './SlideScene';

export const ANIMATION_MS = 400;
export function ScenePlayer({
  scene,
  still = false,
}: {
  scene: SceneProps;
  still?: boolean;
}): React.JSX.Element {
  const player = useRef<PlayerRef>(null);
  useEffect(() => {
    player.current?.pause();
    player.current?.seekTo(still ? 11 : 0);
    if (!still) player.current?.play();
  }, [scene.reveal, still]);
  return (
    <div className="composition-viewport">
      <div className="composition-transform">
        <Player
          ref={player}
          component={textSceneDefinition.Component}
          inputProps={{ ...scene, mediaActive: !still, mediaAutoplay: !still && !scene.editing }}
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
          style={{ width: 1920, height: 1080 }}
        />
      </div>
    </div>
  );
}

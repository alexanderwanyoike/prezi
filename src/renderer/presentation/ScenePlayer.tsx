import { useLayoutEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { CustomScenePlayer } from './CustomScenePlayer';
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
  useLayoutEffect(() => {
    player.current?.pause();
    player.current?.seekTo(still ? 11 : 0);
    if (!still) player.current?.play();
  }, [scene.reveal, still]);
  return (
    <div className="composition-viewport">
      <div className="composition-transform">
        {scene.definition && scene.slide.scene ? (
          <CustomScenePlayer
            key={JSON.stringify([
              scene.definition.code,
              scene.definition.fields,
              scene.definition.layers,
            ])}
            scene={scene}
            definition={scene.definition}
            still={still}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}

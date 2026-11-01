import { useEffect, useLayoutEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { CustomScenePlayer } from './CustomScenePlayer';
import { textSceneDefinition } from './text-scene-definition';
import type { SceneProps } from './SlideScene';

export const ANIMATION_MS = 400;
export function ScenePlayer({
  scene,
  still = false,
  onReady,
}: {
  scene: SceneProps;
  still?: boolean;
  onReady?: (() => void) | undefined;
}): React.JSX.Element {
  const player = useRef<PlayerRef>(null);
  const custom = !!(scene.definition && scene.slide.scene);
  useEffect(() => {
    if (custom || !onReady) return undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(onReady);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [custom, onReady, scene.reveal]);
  useLayoutEffect(() => {
    player.current?.pause();
    player.current?.seekTo(still ? 11 : 0);
    if (!still) player.current?.play();
  }, [scene.reveal, still]);
  return (
    <div className="composition-viewport">
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
          onReady={onReady}
        />
      ) : (
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
      )}
    </div>
  );
}

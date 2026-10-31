import { useState } from 'react';
import { mediaFrame, mediaUrl } from '../../shared/media';
import type { MediaAsset } from '../../shared/media';
import { SceneVideo } from './SceneVideo';

export function SceneMedia({
  media,
  active,
  autoplay,
}: {
  media: MediaAsset;
  active: boolean;
  autoplay: boolean;
}): React.JSX.Element {
  const frame = mediaFrame(media);
  const [failed, setFailed] = useState(false);
  return (
    <div
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
      }}
    >
      {failed && (
        <p role="alert" style={{ fontSize: 28, padding: 30 }}>
          Could not display {media.name}. Locate a replacement in Media properties, or choose a
          supported image or video codec.
        </p>
      )}
      {!failed && media.kind === 'image' && (
        <img
          src={mediaUrl(media.id)}
          alt={media.name}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: media.fit ?? 'contain' }}
          onError={() => {
            setFailed(true);
          }}
        />
      )}
      {!failed && media.kind === 'video' && (
        <SceneVideo
          media={media}
          active={active}
          autoplay={autoplay}
          failed={() => {
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { mediaUrl } from '../../shared/media';
import type { MediaAsset } from '../../shared/media';

export function SceneMedia({ media }: { media: MediaAsset }): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ position: 'absolute', left: 1000, top: 220, width: 792, height: 640 }}>
      {failed && (
        <p role="alert" style={{ fontSize: 28, padding: 30 }}>
          Could not display {media.name}. Check that the file exists and uses a supported image or
          video codec.
        </p>
      )}
      {!failed && media.kind === 'image' && (
        <img
          src={mediaUrl(media.id)}
          alt={media.name}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => {
            setFailed(true);
          }}
        />
      )}
      {!failed && media.kind === 'video' && (
        <video
          src={mediaUrl(media.id)}
          aria-label={media.name}
          muted
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => {
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}

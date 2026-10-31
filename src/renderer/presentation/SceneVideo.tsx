import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { mediaUrl } from '../../shared/media';
import type { MediaAsset } from '../../shared/media';
import { playVideo } from './play-video';

interface Props {
  media: MediaAsset;
  active: boolean;
  autoplay: boolean;
  failed: () => void;
}
export function SceneVideo({ media, active, autoplay, failed }: Props): React.JSX.Element {
  const element = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function play(): void {
    const video = element.current;
    if (!video || !active) return;
    void playVideo(video).then((result) => {
      setError(result.ok ? null : result.error.message);
    });
  }
  useEffect(() => {
    const video = element.current;
    if (!video) return;
    if (!active) video.pause();
    else if (autoplay && media.autoplay !== false)
      void playVideo(video).then((result) => {
        setError(result.ok ? null : result.error.message);
      });
  }, [active, autoplay, media.autoplay]);
  useEffect(() => {
    const video = element.current;
    if (video) {
      video.volume = media.volume ?? 1;
      video.muted = !active || (media.muted ?? true);
    }
  }, [active, media.volume, media.muted]);
  useEffect(() => {
    const video = element.current;
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, []);
  return (
    <div className="scene-video" data-blocked={error !== null}>
      <video
        ref={element}
        src={mediaUrl(media.id)}
        aria-label={media.name}
        muted
        loop={media.loop ?? false}
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: media.fit ?? 'contain' }}
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onEnded={() => {
          setPlaying(false);
        }}
        onError={failed}
      />
      {active && (
        <div className="media-controls" data-media-controls>
          <button
            type="button"
            aria-label={playing ? 'Pause video' : 'Play video'}
            title={playing ? 'Pause video' : 'Play video'}
            onClick={() => {
              if (playing) element.current?.pause();
              else play();
            }}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button
            type="button"
            aria-label="Restart video"
            title="Restart video"
            onClick={() => {
              const video = element.current;
              if (video) {
                video.currentTime = 0;
                play();
              }
            }}
          >
            <RotateCcw />
          </button>
          {error && <span role="status">{error}</span>}
        </div>
      )}
    </div>
  );
}

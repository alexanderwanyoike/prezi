import { Trash2 } from 'lucide-react';
import type { MediaAsset } from '../shared/media';

export function MediaInspector({
  media,
  remove,
}: {
  media: MediaAsset;
  remove: () => void;
}): React.JSX.Element {
  return (
    <div className="inspector-section">
      <span className="eyebrow">MEDIA</span>
      <p className="small" style={{ overflowWrap: 'anywhere' }}>
        {media.name}
      </p>
      <span className="field-hint">
        {media.kind === 'image' ? 'Image' : 'Video'} · Saved beside the project file
      </span>
      <button type="button" onClick={remove}>
        <Trash2 size={14} />
        Remove media
      </button>
    </div>
  );
}

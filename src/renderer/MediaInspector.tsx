import { Trash2 } from 'lucide-react';
import { mediaFrame } from '../shared/media';
import type { MediaAsset, MediaProperties } from '../shared/media';
import { CheckboxField } from './CheckboxField';
import { EditableText } from './EditableText';
import { NumberField } from './NumberField';

interface Props {
  media: MediaAsset;
  update: (patch: MediaProperties) => void;
  remove: () => void;
  locate: () => void;
}
export function MediaInspector({ media, update, remove, locate }: Props): React.JSX.Element {
  const frame = mediaFrame(media);
  const fields = [
    { key: 'x', label: 'Media X', min: 0, max: 1920 - frame.width },
    { key: 'y', label: 'Media Y', min: 0, max: 1080 - frame.height },
    { key: 'width', label: 'Media width', min: 64, max: 1920 - frame.x },
    { key: 'height', label: 'Media height', min: 64, max: 1080 - frame.y },
  ] as const;
  return (
    <div className="inspector-section">
      <span className="eyebrow">MEDIA</span>
      <p className="small" style={{ overflowWrap: 'anywhere' }}>
        {media.name}
      </p>
      <button type="button" onClick={locate}>
        Locate replacement…
      </button>
      <div className="media-frame-fields">
        {fields.map(({ key, label, min, max }) => (
          <NumberField
            key={key}
            label={label}
            value={frame[key]}
            min={min}
            max={max}
            change={(value) => {
              update({ frame: { ...frame, [key]: value } });
            }}
          />
        ))}
      </div>
      <label htmlFor="media-fit">Media fit</label>
      <select
        id="media-fit"
        value={media.fit ?? 'contain'}
        onChange={(event) => {
          update({ fit: event.target.value === 'cover' ? 'cover' : 'contain' });
        }}
      >
        <option value="contain">Contain</option>
        <option value="cover">Cover</option>
      </select>
      {media.kind === 'video' && (
        <>
          <span className="eyebrow">PLAYBACK</span>
          <CheckboxField
            label="Autoplay video"
            value={media.autoplay ?? true}
            change={(autoplay) => {
              update({ autoplay });
            }}
          />
          <CheckboxField
            label="Loop video"
            value={media.loop ?? false}
            change={(loop) => {
              update({ loop });
            }}
          />
          <CheckboxField
            label="Mute video"
            value={media.muted ?? true}
            change={(muted) => {
              update({ muted });
            }}
          />
          <NumberField
            label="Video volume"
            value={media.volume ?? 1}
            min={0}
            max={1}
            step={0.05}
            change={(volume) => {
              update({ volume });
            }}
          />
          <span className="field-hint">
            Autoplay applies when presenting. The editor preview starts paused.
          </span>
        </>
      )}
      <label htmlFor="media-provenance">Media source / attribution</label>
      <EditableText
        id="media-provenance"
        value={media.provenance ?? ''}
        maxLength={2048}
        commit={(provenance) => {
          update({ provenance });
        }}
      />
      <label htmlFor="media-license">Media licence notice</label>
      <EditableText
        id="media-license"
        value={media.license ?? ''}
        maxLength={65536}
        rows={3}
        commit={(license) => {
          update({ license });
        }}
      />
      <button type="button" onClick={remove}>
        <Trash2 size={14} />
        Remove media
      </button>
    </div>
  );
}

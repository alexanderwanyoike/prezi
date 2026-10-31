import { useEffect, useRef } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import type { useUpdates } from './useUpdates';

export function UpdateDialog({
  updates,
  close,
}: {
  updates: ReturnType<typeof useUpdates>;
  close: () => void;
}): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const state = updates.snapshot?.state;
  let message = 'Reading update status…';
  if (state?.stage === 'disabled') message = state.reason;
  if (state?.stage === 'idle') message = 'You can check for a newer stable release.';
  if (state?.stage === 'checking') message = 'Checking for updates…';
  if (state?.stage === 'available') message = `Prezi ${state.version} is available.`;
  if (state?.stage === 'downloading') message = `Downloading Prezi ${state.version}…`;
  if (state?.stage === 'ready') message = `Prezi ${state.version} is downloaded and verified.`;
  if (state?.stage === 'installing') message = 'Preparing to restart Prezi…';
  return (
    <dialog
      ref={dialog}
      className="connection-dialog"
      aria-labelledby="application-updates-title"
      onCancel={close}
    >
      <div className="panel-heading">
        <h2 id="application-updates-title">Application updates</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close application updates"
          onClick={close}
        >
          <X size={16} />
        </button>
      </div>
      <p className="muted">Installed version / {updates.snapshot?.installedVersion ?? '…'}</p>
      <p role="status">{message}</p>
      {state?.stage === 'downloading' && (
        <progress aria-label="Update download" value={state.percent} max={100} />
      )}
      {state?.stage === 'available' && !state.automatic && (
        <p className="muted small">Open the installer for this platform from the release page.</p>
      )}
      {state?.stage === 'ready' && (
        <p className="muted small">
          Save or discard unsaved changes before restarting. You can also keep working and update
          later.
        </p>
      )}
      {updates.error && <p role="alert">{updates.error}</p>}
      {state?.stage === 'idle' && (
        <button
          type="button"
          className="primary"
          onClick={() => {
            updates.run('check');
          }}
        >
          <RefreshCw size={14} />
          Check for updates
        </button>
      )}
      {state?.stage === 'available' && (
        <button
          type="button"
          className="primary"
          onClick={() => {
            updates.run('download');
          }}
        >
          <Download size={14} />
          {state.automatic ? `Download ${state.version}` : 'Open release page'}
        </button>
      )}
      {state?.stage === 'ready' && (
        <button
          type="button"
          className="primary"
          onClick={() => {
            updates.run('install');
          }}
        >
          <RefreshCw size={14} />
          Restart to update
        </button>
      )}
    </dialog>
  );
}

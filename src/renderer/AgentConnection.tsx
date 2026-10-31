import { useEffect, useRef, useState } from 'react';
import { Copy, X } from 'lucide-react';

export function AgentConnection({ close }: { close: () => void }): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('Reading connection…');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    void window.prezi.mcpStatus().then((result) => {
      if (result.ok) {
        setUrl(result.value.url);
        setMessage('Ready on this computer');
      } else {
        setFailed(true);
        setMessage(result.error.message);
      }
    });
  }, []);
  return (
    <dialog
      ref={dialog}
      className="connection-dialog"
      aria-labelledby="agent-connection-title"
      onCancel={close}
    >
      <div className="panel-heading">
        <h2 id="agent-connection-title">Agent connection</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close agent connection"
          onClick={close}
        >
          <X size={16} />
        </button>
      </div>
      <p>
        Connect an MCP client to the presentation you have open. Human and agent edits share the
        same project and undo history.
      </p>
      {url && <code>{url}</code>}
      <p className="muted small">
        The configuration includes a private access token. Keep the app open while using the
        connection.
      </p>
      <p role={failed ? 'alert' : 'status'} className="connection-status">
        <span className="status-dot" />
        {message}
      </p>
      <button
        type="button"
        className="primary"
        disabled={!url}
        onClick={() => {
          void window.prezi.copyMcpConfig().then((result) => {
            setFailed(!result.ok);
            setMessage(result.ok ? 'Connection configuration copied' : result.error.message);
          });
        }}
      >
        <Copy size={14} />
        Copy connection configuration
      </button>
    </dialog>
  );
}

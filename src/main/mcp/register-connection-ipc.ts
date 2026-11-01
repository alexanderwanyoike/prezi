import { clipboard, ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { McpConnection } from './server';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export function registerConnectionIpc(
  window: BrowserWindow,
  connection: Result<McpConnection>,
): void {
  (['status', 'copy'] as const).forEach((command) => {
    ipcMain.handle(`mcp:${command}`, async (event) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame)
        return failure('INVALID_INPUT', 'Untrusted connection request.');
      if (!connection.ok) return connection;
      const { url, token } = connection.value;
      if (command === 'status') return { ok: true, value: { url } };
      try {
        await clipboard.writeText(
          JSON.stringify(
            {
              mcpServers: {
                prezi: { type: 'http', url, headers: { Authorization: `Bearer ${token}` } },
              },
            },
            null,
            2,
          ),
        );
        return { ok: true, value: true };
      } catch {
        return failure('IO_ERROR', 'The connection configuration could not be copied.');
      }
    });
  });
}

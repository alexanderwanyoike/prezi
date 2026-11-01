import { setTimeout as pause } from 'node:timers/promises';
import { app, webContents } from 'electron';
import type { WebFrameMain } from 'electron';
import { failure } from '../../shared/result';
import type { Result } from '../../shared/result';

export class SceneProcesses {
  private readonly records = new Map<
    string,
    { frame: WebFrameMain; pid: number; created: number }
  >();

  track(instance: string, frame: WebFrameMain, editorPid: number): Result<boolean> {
    if (
      frame.detached ||
      frame.osProcessId === editorPid ||
      frame.osProcessId === process.pid ||
      frame.url !== `prezi-scene://${instance}/index.html`
    )
      return failure('INVALID_INPUT', 'An isolated scene renderer is required.');
    const metric = app
      .getAppMetrics()
      .find((item) => item.pid === frame.osProcessId && item.type === 'Tab');
    if (!metric) return failure('NOT_FOUND', 'The scene process is unavailable.');
    this.records.set(instance, { frame, pid: metric.pid, created: metric.creationTime });
    return { ok: true, value: true };
  }

  private async detached(frame: WebFrameMain, attempt = 0): Promise<void> {
    if (frame.detached || attempt >= 100) return;
    await pause(10);
    await this.detached(frame, attempt + 1);
  }

  async stop(instance: string): Promise<Result<boolean>> {
    const record = this.records.get(instance);
    this.records.delete(instance);
    if (!record) return { ok: true, value: false };
    try {
      // Detach first so Chromium does not propagate a page-crash notification to the editor.
      await this.detached(record.frame);
      if (!record.frame.detached)
        return failure('CANCELLED', 'Detach the scene before stopping its renderer.');
      const metric = app
        .getAppMetrics()
        .find(
          (item) =>
            item.pid === record.pid && item.type === 'Tab' && item.creationTime === record.created,
        );
      if (!metric) return { ok: true, value: false };
      const frames = webContents
        .getAllWebContents()
        .filter((contents) => !contents.isDestroyed())
        .flatMap((contents) => contents.mainFrame.framesInSubtree);
      if (
        frames.some(
          (frame) => frame !== record.frame && !frame.detached && frame.osProcessId === record.pid,
        )
      )
        return failure('INVALID_INPUT', 'A shared renderer cannot be stopped as a scene.');
      process.kill(record.pid, 'SIGKILL');
      return { ok: true, value: true };
    } catch {
      return failure('IO_ERROR', 'The scene process could not be stopped.');
    }
  }
}

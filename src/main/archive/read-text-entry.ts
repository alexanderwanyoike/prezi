import type { FileEntry } from '@zip.js/zip.js';

export async function readTextEntry(entry: FileEntry, maximum: number): Promise<string> {
  if (entry.uncompressedSize > maximum)
    throw new Error(`Archive entry is too large: ${entry.filename}`);
  let size = 0;
  let text = '';
  const decoder = new TextDecoder();
  await entry.getData(
    new WritableStream<Uint8Array>({
      write(chunk) {
        size += chunk.byteLength;
        if (size > maximum) throw new Error(`Archive entry is too large: ${entry.filename}`);
        text += decoder.decode(chunk, { stream: true });
      },
      close() {
        text += decoder.decode();
      },
    }),
    { checkSignature: true },
  );
  return text;
}

import { BlobReader } from '@zip.js/zip.js';

export class BoundedBlobReader extends BlobReader {
  override readUint8Array(index: number, length: number): Promise<Uint8Array> {
    // zip.js reads its directory in one range, so bound that allocation before it happens.
    if (length > 8 * 1024 * 1024) throw new Error('Archive metadata exceeds the 8 MiB limit.');
    return super.readUint8Array(index, length);
  }
}

import { configure } from '@zip.js/zip.js';

configure({ useWebWorkers: false, maxWorkers: 1, chunkSize: 64 * 1024 });

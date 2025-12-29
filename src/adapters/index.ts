import type { ChangeAdapter, AdapterOptions } from './adapter';
import { GitAdapter } from './git';
import { FileAdapter } from './file';

export type { ChangeAdapter, AdapterOptions };
export { GitAdapter, FileAdapter };

export type AdapterType = 'git' | 'file';

export function createAdapter(type: AdapterType, options: AdapterOptions = {}): ChangeAdapter {
  switch (type) {
    case 'git':
      return new GitAdapter(options);
    case 'file':
      return new FileAdapter(options);
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}

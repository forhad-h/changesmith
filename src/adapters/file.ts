import { readFileSync, existsSync } from 'fs';
import { BaseAdapter, AdapterOptions } from './adapter';

/**
 * File adapter - reads changes from a file
 */
export class FileAdapter extends BaseAdapter {
  name = 'file';
  private filePath: string;

  constructor(options: AdapterOptions) {
    super(options);

    if (!options.input) {
      throw new Error('File adapter requires --input option with file path');
    }

    this.filePath = options.input;
  }

  async validate(): Promise<boolean> {
    return existsSync(this.filePath);
  }

  async getChanges(): Promise<string> {
    try {
      if (!existsSync(this.filePath)) {
        throw new Error(`File not found: ${this.filePath}`);
      }

      const content = readFileSync(this.filePath, 'utf-8');

      if (!content.trim()) {
        throw new Error(`File is empty: ${this.filePath}`);
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to read file: ${error}`);
    }
  }
}

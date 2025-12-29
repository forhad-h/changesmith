/**
 * Base adapter interface for change input sources
 * Allows the tool to be provider-agnostic (git, file, etc.)
 */
export interface ChangeAdapter {
  name: string;
  getChanges(): Promise<string>;
  validate(): Promise<boolean>;
}

export interface AdapterOptions {
  input?: string;
  [key: string]: any;
}

export abstract class BaseAdapter implements ChangeAdapter {
  abstract name: string;
  protected options: AdapterOptions;

  constructor(options: AdapterOptions = {}) {
    this.options = options;
  }

  abstract getChanges(): Promise<string>;
  abstract validate(): Promise<boolean>;
}

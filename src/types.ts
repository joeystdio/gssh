export interface PathsData {
  sshDir: string;
  profilesDir: string;
  activeFile: string;
}

export interface GitAuthorData {
  name: string;
  email: string;
}

export interface KeyPairData {
  privPath: string;
  pubPath: string;
  basename: string;
}

export interface ProfileInfo {
  name: string;
  keyType: string;
  hasPub: boolean;
  hasAuthor: boolean;
}

export interface ExistingKey {
  keyType: string;
  privPath: string;
  pubPath: string;
}

export class GsshError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'GsshError';
  }
}

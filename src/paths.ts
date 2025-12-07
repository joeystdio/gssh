import { homedir } from 'os';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import type { PathsData } from './types.js';

export class Paths implements PathsData {
  public readonly sshDir: string;
  public readonly profilesDir: string;
  public readonly activeFile: string;

  constructor() {
    const home = homedir();
    this.sshDir = join(home, '.ssh');
    this.profilesDir = join(this.sshDir, 'profiles');
    this.activeFile = join(this.sshDir, 'git-ssh-active.txt');
  }

  async ensureDirectories(): Promise<void> {
    await mkdir(this.sshDir, { recursive: true });
    await mkdir(this.profilesDir, { recursive: true });
  }
}

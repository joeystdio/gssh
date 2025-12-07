import { readFile, access } from 'fs/promises';
import { execa } from 'execa';
import type { GitAuthorData } from './types.js';
import { GsshError } from './utils/errors.js';

export class GitAuthor implements GitAuthorData {
  constructor(
    public readonly name: string,
    public readonly email: string
  ) {}

  static async parseFromFile(path: string): Promise<GitAuthor | null> {
    try {
      await access(path);
    } catch {
      return null;
    }

    const content = await readFile(path, 'utf-8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return null;
    }

    // Single line: "Name <email>" format
    if (lines.length === 1) {
      const match = lines[0].match(/^(.+?)\s*<([^>]+)>$/);
      if (match) {
        return new GitAuthor(match[1].trim(), match[2].trim());
      }
      return new GitAuthor(lines[0], '');
    }

    // Two lines: name then email
    return new GitAuthor(lines[0], lines[1]);
  }

  async set(local: boolean): Promise<void> {
    if (local) {
      // Check for .git directory
      try {
        await access('.git');
      } catch {
        throw new GsshError(
          'Not inside a Git repo (no .git). Aborting local git config change.'
        );
      }
    }

    const scope = local ? '--local' : '--global';

    if (this.email) {
      await execa('git', ['config', scope, 'user.email', this.email]);
    }
    if (this.name) {
      await execa('git', ['config', scope, 'user.name', this.name]);
    }

    const scopeLabel = local ? 'LOCAL' : 'GLOBAL';
    console.log(`Set ${scopeLabel} git user to '${this.name}' <${this.email}>`);
  }
}

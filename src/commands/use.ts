import chalk from 'chalk';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { Paths } from '../paths.js';
import { GitAuthor } from '../git-author.js';
import { KeyPair } from '../keypair.js';
import { GsshError } from '../utils/errors.js';
import { getProfiles } from './shared.js';

export async function useCommand(
  profileName: string,
  options: { local?: boolean }
): Promise<void> {
  const paths = new Paths();
  await paths.ensureDirectories();

  const profiles = await getProfiles(paths);
  if (!profiles.includes(profileName)) {
    throw new GsshError(
      `Profile '${profileName}' not found under ${paths.profilesDir}`
    );
  }

  const profilePath = join(paths.profilesDir, profileName);
  const keypair = await KeyPair.resolve(profilePath);

  if (!keypair) {
    throw new GsshError(
      `Profile '${profileName}' doesn't contain id_ed25519 or id_rsa`
    );
  }

  // Copy SSH keys
  await keypair.copyToSsh(paths.sshDir);

  // Set git author
  const authorFile = join(profilePath, 'git_author.txt');
  const author = await GitAuthor.parseFromFile(authorFile);

  if (author) {
    await author.set(options.local || false);
  } else {
    console.log(
      chalk.yellow(
        'No git_author.txt found or parsed; skipping git author change.'
      )
    );
  }

  // Mark as active
  await writeFile(paths.activeFile, profileName);
  console.log(`Switched profile -> ${chalk.green(profileName)}`);
}

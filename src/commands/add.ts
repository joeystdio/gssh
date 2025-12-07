import chalk from 'chalk';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { execa } from 'execa';
import { Paths } from '../paths.js';
import { GsshError } from '../utils/errors.js';
import { prompt } from '../utils/prompts.js';
import { exists } from '../keypair.js';

export async function addCommand(profileName: string): Promise<void> {
  const paths = new Paths();
  await paths.ensureDirectories();

  const profilePath = join(paths.profilesDir, profileName);

  if (await exists(profilePath)) {
    throw new GsshError(`Profile already exists: ${profileName}`);
  }

  await mkdir(profilePath, { recursive: true });

  try {
    // Get git author info
    const name = await prompt('Enter Git author name: ');
    const email = await prompt('Enter Git author email: ');

    if (!name || !email) {
      await rm(profilePath, { recursive: true });
      throw new GsshError('Name and email are required');
    }

    // Write git_author.txt
    const authorContent = `${name} <${email}>`;
    await writeFile(join(profilePath, 'git_author.txt'), authorContent);

    // Generate SSH key
    const keyPath = join(profilePath, 'id_ed25519');
    console.log(`Generating ed25519 keypair in ${profilePath} ...`);

    const result = await execa('ssh-keygen', [
      '-t',
      'ed25519',
      '-f',
      keyPath,
      '-C',
      email,
      '-N',
      ''
    ]);

    if (result.exitCode !== 0) {
      await rm(profilePath, { recursive: true });
      throw new GsshError('Failed to generate SSH key');
    }

    console.log(chalk.green(`Profile '${profileName}' created.`));
  } catch (error) {
    // Clean up on error
    if (await exists(profilePath)) {
      await rm(profilePath, { recursive: true }).catch(() => {});
    }
    throw error;
  }
}

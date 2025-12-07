import chalk from 'chalk';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { Paths } from '../paths.js';
import { KeyPair, exists } from '../keypair.js';
import { GsshError } from '../utils/errors.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { getActiveProfileName } from './shared.js';

export async function pubkeyCommand(): Promise<void> {
  const paths = new Paths();
  await paths.ensureDirectories();

  const activeName = await getActiveProfileName(paths);
  if (!activeName) {
    throw new GsshError(
      "No active profile detected. Use 'gssh use <profile>' to activate one."
    );
  }

  const profilePath = join(paths.profilesDir, activeName);
  const keypair = await KeyPair.resolve(profilePath);

  if (!keypair) {
    throw new GsshError(
      `Active profile '${activeName}' doesn't contain SSH keys`
    );
  }

  if (!(await exists(keypair.pubPath))) {
    throw new GsshError(`Public key not found for profile '${activeName}'`);
  }

  const pubkeyContent = await readFile(keypair.pubPath, 'utf-8');

  console.log(chalk.cyan(`Public key for profile '${activeName}':`));
  console.log();
  console.log(pubkeyContent.trim());
  console.log();

  // Try to copy to clipboard
  if (await copyToClipboard(pubkeyContent.trim())) {
    console.log(chalk.green('✓ Public key copied to clipboard!'));
  } else {
    console.log(
      chalk.yellow(
        'Note: Could not copy to clipboard. Copy the key above manually.'
      )
    );
  }
}

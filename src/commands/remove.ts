import chalk from 'chalk';
import { join } from 'path';
import { readFile, rm, unlink } from 'fs/promises';
import { Paths } from '../paths.js';
import { GsshError } from '../utils/errors.js';
import { prompt, confirm } from '../utils/prompts.js';
import { exists } from '../keypair.js';
import { getProfiles } from './shared.js';
import { useCommand } from './use.js';

export async function removeCommand(profileName: string): Promise<void> {
  const paths = new Paths();
  await paths.ensureDirectories();

  const profilePath = join(paths.profilesDir, profileName);

  if (!(await exists(profilePath))) {
    throw new GsshError(`Profile not found: ${profileName}`);
  }

  // Check if active
  let isActive = false;
  if (await exists(paths.activeFile)) {
    const active = await readFile(paths.activeFile, 'utf-8');
    isActive = active.trim() === profileName;
  }

  if (isActive) {
    console.log(
      chalk.yellow(
        `Warning: '${profileName}' is currently the active profile!`
      )
    );
    const shouldDelete = await confirm(
      'Are you sure you want to delete the active profile?',
      false
    );

    if (!shouldDelete) {
      console.log('Aborted.');
      return;
    }

    // Offer to switch to another profile
    const otherProfiles = (await getProfiles(paths)).filter(
      (p) => p !== profileName
    );

    if (otherProfiles.length > 0) {
      console.log();
      console.log(chalk.cyan('Available profiles to switch to:'));
      for (const p of otherProfiles) {
        console.log(`  - ${p}`);
      }
      console.log();
      const switchTo = await prompt(
        'Enter profile name to switch to (or leave blank to have no active profile): '
      );

      if (switchTo && otherProfiles.includes(switchTo)) {
        await rm(profilePath, { recursive: true });
        console.log(`Removed profile ${profileName}`);
        await useCommand(switchTo, { local: false });
        return;
      } else if (switchTo) {
        console.log(
          chalk.yellow('Invalid profile name. Removing without switching.')
        );
      }
    }
  } else {
    const shouldDelete = await confirm(
      `Delete profile ${profileName}?`,
      false
    );

    if (!shouldDelete) {
      console.log('Aborted.');
      return;
    }
  }

  await rm(profilePath, { recursive: true });
  console.log(`Removed profile ${profileName}`);

  if (await exists(paths.activeFile)) {
    await unlink(paths.activeFile).catch(() => {});
    console.log(chalk.yellow('No active profile set.'));
  }
}

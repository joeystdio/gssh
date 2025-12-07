import chalk from 'chalk';
import { join, basename } from 'path';
import { readFile, mkdir, writeFile, copyFile } from 'fs/promises';
import type { Paths } from '../paths.js';
import type { ExistingKey } from '../types.js';
import { GsshError } from '../utils/errors.js';
import { prompt, confirm } from '../utils/prompts.js';
import { KeyPair, exists } from '../keypair.js';
import { getProfiles } from './shared.js';

export async function checkAndOfferImport(paths: Paths): Promise<void> {
  const profiles = await getProfiles(paths);

  // Only offer import if no profiles exist
  if (profiles.length > 0) {
    return;
  }

  const existingKeys = await detectExistingKeys(paths);

  if (existingKeys.length === 0) {
    return;
  }

  // Check if any of the existing keys are unmanaged
  for (const key of existingKeys) {
    const isManaged = await isKeyManaged(paths, key.pubPath);

    if (!isManaged) {
      // Found an unmanaged key, offer to import it
      try {
        await importExistingKey(paths, key);
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red(`Failed to import key: ${error.message}`));
        }
      }
      // Only import one key at a time for simplicity
      break;
    }
  }
}

async function detectExistingKeys(paths: Paths): Promise<ExistingKey[]> {
  const existingKeys: ExistingKey[] = [];

  // Check for common key types
  const keyTypes = [
    { name: 'id_ed25519', type: 'ed25519' },
    { name: 'id_rsa', type: 'rsa' },
    { name: 'id_ecdsa', type: 'ecdsa' }
  ];

  for (const { name, type } of keyTypes) {
    const privPath = join(paths.sshDir, name);
    const pubPath = join(paths.sshDir, `${name}.pub`);

    if (await exists(privPath)) {
      existingKeys.push({
        keyType: type,
        privPath,
        pubPath
      });
    }
  }

  return existingKeys;
}

async function isKeyManaged(paths: Paths, keyPubPath: string): Promise<boolean> {
  if (!(await exists(keyPubPath))) {
    return false;
  }

  const currentPub = await readFile(keyPubPath, 'utf-8');
  const profiles = await getProfiles(paths);

  for (const profileName of profiles) {
    const profilePath = join(paths.profilesDir, profileName);
    const keypair = await KeyPair.resolve(profilePath);

    if (keypair && (await exists(keypair.pubPath))) {
      const profilePub = await readFile(keypair.pubPath, 'utf-8');
      if (currentPub.trim() === profilePub.trim()) {
        return true;
      }
    }
  }

  return false;
}

async function importExistingKey(
  paths: Paths,
  key: ExistingKey
): Promise<void> {
  console.log();
  console.log(
    chalk.yellow(`Found existing ${key.keyType} key not managed by gssh!`)
  );
  console.log(`Private key: ${key.privPath}`);
  if (await exists(key.pubPath)) {
    console.log(`Public key:  ${key.pubPath}`);
  } else {
    console.log(chalk.yellow('Warning: No public key found'));
  }
  console.log();

  const shouldImport = await confirm(
    'Would you like to import this key into a new profile?',
    false
  );

  if (!shouldImport) {
    console.log('Skipped.');
    return;
  }

  const profileName = await prompt('Enter profile name for this key: ');

  if (!profileName) {
    throw new GsshError('Profile name cannot be empty');
  }

  const profilePath = join(paths.profilesDir, profileName);
  if (await exists(profilePath)) {
    throw new GsshError(`Profile '${profileName}' already exists`);
  }

  // Get git author info
  const name = await prompt('Enter Git author name: ');
  const email = await prompt('Enter Git author email: ');

  if (!name || !email) {
    throw new GsshError('Name and email are required');
  }

  // Create profile directory
  await mkdir(profilePath, { recursive: true });

  // Write git_author.txt
  const authorContent = `${name} <${email}>`;
  await writeFile(join(profilePath, 'git_author.txt'), authorContent);

  // Copy keys to profile
  const keyBasename = basename(key.privPath);
  const destPriv = join(profilePath, keyBasename);
  const destPub = destPriv + '.pub';

  await copyFile(key.privPath, destPriv);

  if (await exists(key.pubPath)) {
    await copyFile(key.pubPath, destPub);
  }

  console.log();
  console.log(
    chalk.green(`Successfully imported key into profile '${profileName}'`)
  );
  console.log();

  // Ask if they want to mark it as active
  const markActive = await confirm('Mark this profile as active?', true);

  if (markActive) {
    await writeFile(paths.activeFile, profileName);
    console.log(chalk.green('Profile marked as active.'));
  }
}

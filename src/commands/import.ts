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

  // Check and import all unmanaged keys
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
    }
  }
}

async function detectExistingKeys(paths: Paths): Promise<ExistingKey[]> {
  const existingKeys: ExistingKey[] = [];
  const { readdir } = await import('fs/promises');

  // Read all files in the SSH directory
  const files = await readdir(paths.sshDir);

  // Pattern to match SSH private key files
  const keyPatterns = [
    { regex: /^id_ed25519(_.*)?$/, type: 'ed25519' },
    { regex: /^id_rsa(_.*)?$/, type: 'rsa' },
    { regex: /^id_ecdsa(_.*)?$/, type: 'ecdsa' }
  ];

  for (const file of files) {
    // Skip public keys and other files
    if (file.endsWith('.pub') || file.endsWith('.old') || file.endsWith('.bak')) {
      continue;
    }

    for (const { regex, type } of keyPatterns) {
      if (regex.test(file)) {
        const privPath = join(paths.sshDir, file);
        const pubPath = join(paths.sshDir, `${file}.pub`);

        // Only include if it's actually a file (not a directory)
        if (await exists(privPath)) {
          existingKeys.push({
            keyType: type,
            privPath,
            pubPath
          });
        }
        break;
      }
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

  // Extract suggested profile name from key filename
  const keyBasename = basename(key.privPath);
  const suggestedProfileName = extractProfileNameFromKey(keyBasename);

  const profileName = await prompt(
    `Enter profile name for this key${suggestedProfileName ? ` [${suggestedProfileName}]` : ''}: `,
    suggestedProfileName
  );

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

  // Normalize key name to standard format (id_ed25519, id_rsa, or id_ecdsa)
  const normalizedKeyName = normalizeKeyName(keyBasename);
  const destPriv = join(profilePath, normalizedKeyName);
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

function extractProfileNameFromKey(keyName: string): string {
  // Extract suffix from key names like "id_ed25519_work" -> "work"
  const match = keyName.match(/^id_(ed25519|rsa|ecdsa)_(.+)$/);
  if (match && match[2]) {
    return match[2];
  }
  // For keys without suffix (e.g., "id_ed25519"), suggest "default"
  if (/^id_(ed25519|rsa|ecdsa)$/.test(keyName)) {
    return 'default';
  }
  return '';
}

function normalizeKeyName(keyName: string): string {
  // Normalize "id_ed25519_work" -> "id_ed25519"
  // Normalize "id_rsa_personal" -> "id_rsa"
  // etc.
  if (keyName.startsWith('id_ed25519')) {
    return 'id_ed25519';
  }
  if (keyName.startsWith('id_rsa')) {
    return 'id_rsa';
  }
  if (keyName.startsWith('id_ecdsa')) {
    return 'id_ecdsa';
  }
  return keyName; // Fallback to original name if no match
}

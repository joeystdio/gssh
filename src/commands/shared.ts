import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { Paths } from '../paths.js';
import type { ProfileInfo } from '../types.js';
import { KeyPair, exists } from '../keypair.js';

export async function getProfiles(paths: Paths): Promise<string[]> {
  if (!(await exists(paths.profilesDir))) {
    return [];
  }

  const entries = await readdir(paths.profilesDir, { withFileTypes: true });
  const profiles: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const profilePath = join(paths.profilesDir, entry.name);

      // Check if it has required files
      const hasAuthor = await exists(join(profilePath, 'git_author.txt'));
      const hasEd25519 = await exists(join(profilePath, 'id_ed25519'));
      const hasRsa = await exists(join(profilePath, 'id_rsa'));

      if (hasAuthor || hasEd25519 || hasRsa) {
        profiles.push(entry.name);
      }
    }
  }

  profiles.sort();
  return profiles;
}

export async function getProfileInfo(
  paths: Paths,
  profileName: string
): Promise<ProfileInfo> {
  const profilePath = join(paths.profilesDir, profileName);
  const keypair = await KeyPair.resolve(profilePath);

  const keyType = keypair ? keypair.basename : 'no';
  const hasPub = keypair ? await exists(keypair.pubPath) : false;
  const hasAuthor = await exists(join(profilePath, 'git_author.txt'));

  return {
    name: profileName,
    keyType,
    hasPub,
    hasAuthor
  };
}

export async function getActiveProfileName(paths: Paths): Promise<string | null> {
  // 1. Check marker file
  if (await exists(paths.activeFile)) {
    const active = await readFile(paths.activeFile, 'utf-8');
    if (active.trim()) {
      return active.trim();
    }
  }

  // 2. Fallback: match public keys
  return detectActiveFromPubkey(paths);
}

export async function detectActiveFromPubkey(paths: Paths): Promise<string | null> {
  const profiles = await getProfiles(paths);

  for (const profileName of profiles) {
    const profilePath = join(paths.profilesDir, profileName);
    const keypair = await KeyPair.resolve(profilePath);

    if (!keypair || !(await exists(keypair.pubPath))) {
      continue;
    }

    const profilePub = await readFile(keypair.pubPath, 'utf-8');
    const targetPub = join(paths.sshDir, keypair.basename) + '.pub';

    if (await exists(targetPub)) {
      const currentPub = await readFile(targetPub, 'utf-8');
      if (currentPub.trim() === profilePub.trim()) {
        return profileName;
      }
    }
  }

  return null;
}

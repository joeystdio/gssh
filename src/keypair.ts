import { join } from 'path';
import { access, copyFile, chmod, constants, unlink } from 'fs/promises';
import { platform } from 'os';
import type { KeyPairData } from './types.js';

export class KeyPair implements KeyPairData {
  constructor(
    public readonly privPath: string,
    public readonly pubPath: string,
    public readonly basename: string
  ) {}

  static async resolve(profilePath: string): Promise<KeyPair | null> {
    // Prefer ed25519 then rsa
    const ed25519Priv = join(profilePath, 'id_ed25519');
    const rsaPriv = join(profilePath, 'id_rsa');

    const hasEd25519 = await exists(ed25519Priv);
    if (hasEd25519) {
      return new KeyPair(ed25519Priv, ed25519Priv + '.pub', 'id_ed25519');
    }

    const hasRsa = await exists(rsaPriv);
    if (hasRsa) {
      return new KeyPair(rsaPriv, rsaPriv + '.pub', 'id_rsa');
    }

    return null;
  }

  async copyToSsh(sshDir: string): Promise<void> {
    const targetPriv = join(sshDir, this.basename);
    const targetPub = targetPriv + '.pub';

    // Remove all managed key types to avoid conflicts (ignore errors)
    const keyTypes = ['id_ed25519', 'id_rsa', 'id_ecdsa'];
    for (const keyType of keyTypes) {
      await unlink(join(sshDir, keyType)).catch(() => {});
      await unlink(join(sshDir, `${keyType}.pub`)).catch(() => {});
    }

    // Copy private key
    await copyFile(this.privPath, targetPriv);

    // Copy public key if exists
    if (await exists(this.pubPath)) {
      await copyFile(this.pubPath, targetPub);
    }

    // Set permissions on Unix-like systems
    if (platform() !== 'win32') {
      await chmod(targetPriv, 0o600);
      if (await exists(targetPub)) {
        await chmod(targetPub, 0o644);
      }
    }
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export { exists };

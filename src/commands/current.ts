import chalk from 'chalk';
import { Paths } from '../paths.js';
import { detectActiveFromPubkey } from './shared.js';
import { exists } from '../keypair.js';

export async function currentCommand(): Promise<void> {
  const paths = new Paths();
  await paths.ensureDirectories();

  // Prefer active file
  if (await exists(paths.activeFile)) {
    const { readFile } = await import('fs/promises');
    const active = await readFile(paths.activeFile, 'utf-8');
    if (active.trim()) {
      console.log(`Active (marker): ${chalk.green(active.trim())}`);
      return;
    }
  }

  // Fallback to public key matching
  const detected = await detectActiveFromPubkey(paths);
  if (detected) {
    console.log(`Active (detected from public key): ${chalk.green(detected)}`);
    return;
  }

  console.log('No active profile detected.');
}

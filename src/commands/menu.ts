import chalk from 'chalk';
import { Paths } from '../paths.js';
import { getActiveProfileName } from './shared.js';
import { currentCommand } from './current.js';
import { pubkeyCommand } from './pubkey.js';
import { checkAndOfferImport } from './import.js';

export async function showMenuCommand(): Promise<void> {
  const paths = new Paths();
  await paths.ensureDirectories();

  await checkAndOfferImport(paths);

  console.log();
  console.log(chalk.cyan('gssh - SSH + Git author profile manager'));
  console.log();
  console.log(chalk.yellow('Usage:'));
  console.log('  gssh                      Show current/active profile');
  console.log('  gssh list                 List all profiles');
  console.log(
    '  gssh use <profile>        Switch SSH key + set Git author globally'
  );
  console.log(
    '  gssh use <profile> -l     Switch SSH key + set Git author locally (current repo only)'
  );
  console.log('  gssh add <profile>        Create a new profile');
  console.log('  gssh remove <profile>     Delete a profile');
  console.log('  gssh current              Show current/active profile');
  console.log(
    '  gssh pubkey               Display current public key (for GitHub, etc.)'
  );
  console.log();
  console.log(
    chalk.gray(`Profiles are stored in: ${paths.profilesDir}`)
  );
  console.log();
  console.log(
    chalk.gray(
      'Note: SSH keys are always system-wide. The -l flag only affects Git author config.'
    )
  );
  console.log();

  await currentCommand();

  // Also show pubkey if there's an active profile
  const activeName = await getActiveProfileName(paths);
  if (activeName) {
    console.log();
    try {
      await pubkeyCommand();
    } catch {
      // Ignore errors showing pubkey
    }
  }
}

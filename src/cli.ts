import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { useCommand } from './commands/use.js';
import { addCommand } from './commands/add.js';
import { removeCommand } from './commands/remove.js';
import { currentCommand } from './commands/current.js';
import { pubkeyCommand } from './commands/pubkey.js';
import { showMenuCommand } from './commands/menu.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('gssh')
    .description('SSH + Git author profile manager')
    .version('0.1.0');

  program
    .command('list')
    .description('List all profiles')
    .action(async () => {
      await listCommand();
    });

  program
    .command('use <profile>')
    .description('Switch to a profile')
    .option('-l, --local', 'Set git config locally (current repo only)')
    .action(async (profile: string, options: { local?: boolean }) => {
      await useCommand(profile, options);
    });

  program
    .command('add <profile>')
    .description('Add a new profile')
    .action(async (profile: string) => {
      await addCommand(profile);
    });

  program
    .command('remove <profile>')
    .description('Remove a profile')
    .action(async (profile: string) => {
      await removeCommand(profile);
    });

  program
    .command('current')
    .description('Show current active profile')
    .action(async () => {
      await currentCommand();
    });

  program
    .command('pubkey')
    .description('Display the current public key')
    .action(async () => {
      await pubkeyCommand();
    });

  // Default action (no command)
  program.action(async () => {
    await showMenuCommand();
  });

  return program;
}

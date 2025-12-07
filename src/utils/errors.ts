import chalk from 'chalk';
import { GsshError } from '../types.js';

export { GsshError };

export function handleError(error: unknown): void {
  if (error instanceof GsshError) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red(`Unknown error: ${String(error)}`));
  }
}

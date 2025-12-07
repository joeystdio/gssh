#!/usr/bin/env node
import { createProgram } from './cli.js';
import { handleError } from './utils/errors.js';

async function main(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  handleError(error);
  process.exit(1);
});

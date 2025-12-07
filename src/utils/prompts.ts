import { createInterface } from 'readline';

export async function prompt(question: string, defaultValue = ''): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed || defaultValue);
    });
  });
}

export async function confirm(
  question: string,
  defaultYes = false
): Promise<boolean> {
  const suffix = defaultYes ? ' (Y/n): ' : ' (y/N): ';
  const answer = await prompt(question + suffix);

  if (answer === '') {
    return defaultYes;
  }

  const lower = answer.toLowerCase();
  return lower === 'y' || lower === 'yes';
}

import { platform } from 'os';
import { execa } from 'execa';

interface ClipboardCommand {
  cmd: string;
  args?: string[];
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const commands = getClipboardCommands();

  for (const { cmd, args } of commands) {
    try {
      const child = execa(cmd, args || [], {
        input: text,
        reject: false
      });
      const result = await child;
      if (result.exitCode === 0) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

function getClipboardCommands(): ClipboardCommand[] {
  const plat = platform();

  if (plat === 'darwin') {
    return [{ cmd: 'pbcopy' }];
  }

  if (plat === 'win32') {
    return [{ cmd: 'clip' }];
  }

  // Linux - try multiple options
  return [
    { cmd: 'xclip', args: ['-selection', 'clipboard'] },
    { cmd: 'xsel', args: ['-b', '-i'] },
    { cmd: 'wl-copy' }
  ];
}

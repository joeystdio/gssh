import { platform } from 'os';

export function isWindows(): boolean {
  return platform() === 'win32';
}

export function isMacOS(): boolean {
  return platform() === 'darwin';
}

export function isLinux(): boolean {
  return platform() === 'linux';
}

export function isUnix(): boolean {
  return !isWindows();
}

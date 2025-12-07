import { Paths } from '../paths.js';
import { getProfiles, getProfileInfo } from './shared.js';
import { checkAndOfferImport } from './import.js';

export async function listCommand(): Promise<void> {
  const paths = new Paths();
  await paths.ensureDirectories();

  await checkAndOfferImport(paths);

  const profiles = await getProfiles(paths);

  if (profiles.length === 0) {
    console.log(`No profiles found in ${paths.profilesDir}`);
    return;
  }

  console.log(
    'PROFILE'.padEnd(20),
    'KEY'.padEnd(8),
    'PUB'.padEnd(6),
    'AUTHOR'
  );

  for (const name of profiles) {
    const info = await getProfileInfo(paths, name);
    console.log(
      name.padEnd(20),
      info.keyType.padEnd(8),
      (info.hasPub ? 'yes' : 'no').padEnd(6),
      info.hasAuthor ? 'yes' : 'no'
    );
  }
}

import { VaultStore } from '../../vault/store';
import { formatTable } from '../utils';

export function listCommand(tag: string | undefined, password: string): void {
  const store = new VaultStore(password);

  try {
    const secrets = store.listSecrets(tag);

    if (secrets.length === 0) {
      console.log(tag ? `No secrets found with tag "${tag}".` : 'No secrets in vault.');
      return;
    }

    const rows = secrets.map(s => [s.name, s.description, s.tags.join(', ')]);
    console.log(formatTable(rows, ['NAME', 'DESCRIPTION', 'TAGS']));
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

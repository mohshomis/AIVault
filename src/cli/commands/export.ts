import { VaultStore } from '../../vault/store';
import { formatTable } from '../utils';

export function exportCommand(json: boolean, tag: string | undefined, password: string): void {
  const store = new VaultStore(password);

  try {
    const secrets = store.listSecrets(tag);

    if (json) {
      console.log(JSON.stringify(secrets, null, 2));
    } else {
      if (secrets.length === 0) {
        console.log('No secrets to export.');
        return;
      }
      const rows = secrets.map(s => [s.name, s.description, s.tags.join(', ')]);
      console.log(formatTable(rows, ['NAME', 'DESCRIPTION', 'TAGS']));
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

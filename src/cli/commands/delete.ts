import { VaultStore } from '../../vault/store';
import { promptConfirm } from '../utils';

export async function deleteCommand(name: string, password: string): Promise<void> {
  const store = new VaultStore(password);

  const confirm = await promptConfirm(`Are you sure you want to delete ${name}? (y/N): `);
  if (!confirm) {
    console.log('Aborted.');
    return;
  }

  try {
    const deleted = store.deleteSecret(name);
    if (deleted) {
      console.log(`\n✓ Secret ${name} deleted`);
    } else {
      console.error(`Error: Secret ${name} not found.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

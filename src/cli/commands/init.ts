import { VaultStore } from '../../vault/store';
import { promptHidden } from '../utils';

export async function initCommand(): Promise<void> {
  console.log('Initializing AIVault...\n');

  const password = await promptHidden('Set master password: ');
  if (!password) {
    console.error('Error: Password cannot be empty.');
    process.exit(1);
  }

  const confirm = await promptHidden('Confirm master password: ');
  if (password !== confirm) {
    console.error('Error: Passwords do not match.');
    process.exit(1);
  }

  try {
    const store = new VaultStore(password);
    store.init();
    console.log('\n✓ Vault initialized at ~/.aivault/');
    console.log('  Use "aivault set <NAME> --desc <description>" to add secrets.');
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

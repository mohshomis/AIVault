import { VaultStore } from '../../vault/store';
import { promptHidden, promptConfirm } from '../utils';

export async function setCommand(
  name: string,
  description: string,
  tags: string[],
  password: string,
  force: boolean = false
): Promise<void> {
  const store = new VaultStore(password);

  // Check if secret already exists
  const existing = store.getSecret(name);
  if (existing && !force) {
    const overwrite = await promptConfirm(`Secret ${name} already exists. Overwrite? (y/N): `);
    if (!overwrite) {
      console.log('Aborted.');
      return;
    }
  }

  const value = await promptHidden(`Enter value for ${name}: `);
  if (!value) {
    console.error('Error: Secret value cannot be empty.');
    process.exit(1);
  }

  try {
    store.setSecret(name, value, description, tags);
    console.log(`\n✓ Secret ${name} saved`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

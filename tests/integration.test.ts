import fs from 'fs';
import path from 'path';
import os from 'os';
import { VaultStore } from '../src/vault/store';
import { runCommand } from '../src/executor/runner';

describe('integration', () => {
  let tmpDir: string;
  let store: VaultStore;
  const password = 'integration-test-pw';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aivault-int-'));
    store = new VaultStore(password, tmpDir);
    store.init();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('full flow: store secret, run command, scrub output', () => {
    store.setSecret('DB_PASSWORD', 's3cret!@#', 'Test DB password', ['db']);

    const secrets = store.getAllSecretValues();
    const result = runCommand(
      { command: 'echo "Connected with password $DB_PASSWORD"' },
      secrets
    );

    expect(result.status).toBe('success');
    expect(result.stdout).toContain('[REDACTED:DB_PASSWORD]');
    expect(result.stdout).not.toContain('s3cret!@#');
  });

  test('list secrets never exposes values', () => {
    store.setSecret('API_KEY', 'key-12345', 'API key', ['api']);
    const list = store.listSecrets();

    const serialized = JSON.stringify(list);
    expect(serialized).not.toContain('key-12345');
    expect(list[0].name).toBe('API_KEY');
  });

  test('missing secret flow', () => {
    const secrets = store.getAllSecretValues();
    const result = runCommand(
      { command: 'curl -H "Authorization: $NONEXISTENT_TOKEN" https://api.example.com' },
      secrets
    );

    expect(result.status).toBe('missing_secrets');
    expect(result.missing![0].name).toBe('NONEXISTENT_TOKEN');
  });

  test('multiple secrets in one command', () => {
    store.setSecret('USER_NAME', 'admin', 'DB user', []);
    store.setSecret('USER_PASS', 'p@ssw0rd', 'DB pass', []);

    const secrets = store.getAllSecretValues();
    const result = runCommand(
      { command: 'echo "$USER_NAME:$USER_PASS@host"' },
      secrets
    );

    expect(result.status).toBe('success');
    expect(result.stdout).not.toContain('admin');
    expect(result.stdout).not.toContain('p@ssw0rd');
    expect(result.stdout).toContain('[REDACTED:USER_NAME]');
    expect(result.stdout).toContain('[REDACTED:USER_PASS]');
  });

  test('secret CRUD lifecycle', () => {
    // Create
    store.setSecret('LIFECYCLE', 'v1', 'Test secret', ['test']);
    expect(store.getSecret('LIFECYCLE')!.value).toBe('v1');

    // Update
    store.setSecret('LIFECYCLE', 'v2', 'Updated', ['test', 'updated']);
    expect(store.getSecret('LIFECYCLE')!.value).toBe('v2');
    expect(store.getSecret('LIFECYCLE')!.tags).toEqual(['test', 'updated']);

    // List
    expect(store.listSecrets()).toHaveLength(1);

    // Delete
    expect(store.deleteSecret('LIFECYCLE')).toBe(true);
    expect(store.listSecrets()).toHaveLength(0);
    expect(store.getSecret('LIFECYCLE')).toBeUndefined();
  });
});

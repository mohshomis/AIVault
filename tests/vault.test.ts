import fs from 'fs';
import path from 'path';
import os from 'os';
import { encrypt, decrypt } from '../src/vault/crypto';
import { VaultStore } from '../src/vault/store';
import { isValidSecretName } from '../src/vault/types';

describe('crypto', () => {
  const password = 'test-master-password';

  test('encrypt and decrypt round-trip', () => {
    const data = JSON.stringify({ secrets: [{ name: 'TEST', value: 'secret123' }] });
    const encrypted = encrypt(data, password);
    const decrypted = decrypt(encrypted, password);
    expect(decrypted).toBe(data);
  });

  test('decrypt with wrong password throws', () => {
    const data = 'hello world';
    const encrypted = encrypt(data, password);
    expect(() => decrypt(encrypted, 'wrong-password')).toThrow();
  });

  test('encrypted payload is not plaintext', () => {
    const data = 'sensitive data';
    const encrypted = encrypt(data, password);
    expect(encrypted.toString('utf8')).not.toContain(data);
  });

  test('different encryptions produce different ciphertexts', () => {
    const data = 'same data';
    const enc1 = encrypt(data, password);
    const enc2 = encrypt(data, password);
    expect(enc1.equals(enc2)).toBe(false);
  });

  test('rejects truncated payload', () => {
    expect(() => decrypt(Buffer.from('short'), password)).toThrow('too short');
  });
});

describe('isValidSecretName', () => {
  test('valid names', () => {
    expect(isValidSecretName('GITHUB_TOKEN')).toBe(true);
    expect(isValidSecretName('AWS_ACCESS_KEY_ID')).toBe(true);
    expect(isValidSecretName('A')).toBe(true);
    expect(isValidSecretName('X1')).toBe(true);
  });

  test('invalid names', () => {
    expect(isValidSecretName('github_token')).toBe(false);
    expect(isValidSecretName('1STARTS_WITH_NUMBER')).toBe(false);
    expect(isValidSecretName('HAS SPACE')).toBe(false);
    expect(isValidSecretName('HAS-DASH')).toBe(false);
    expect(isValidSecretName('')).toBe(false);
  });
});

describe('VaultStore', () => {
  let tmpDir: string;
  const password = 'test-password-123';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aivault-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('init creates vault file', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    expect(fs.existsSync(path.join(tmpDir, 'vault.enc'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'config.json'))).toBe(true);
  });

  test('init twice throws', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    expect(() => store.init()).toThrow('already initialized');
  });

  test('set and get secret', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    store.setSecret('MY_TOKEN', 'secret-value', 'A test token', ['test']);

    const secret = store.getSecret('MY_TOKEN');
    expect(secret).toBeDefined();
    expect(secret!.name).toBe('MY_TOKEN');
    expect(secret!.value).toBe('secret-value');
    expect(secret!.description).toBe('A test token');
    expect(secret!.tags).toEqual(['test']);
  });

  test('set rejects invalid name', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    expect(() => store.setSecret('bad-name', 'val', 'desc')).toThrow('Invalid secret name');
  });

  test('overwrite existing secret', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    store.setSecret('TOKEN', 'old', 'desc', []);
    store.setSecret('TOKEN', 'new', 'updated desc', ['updated']);

    const secret = store.getSecret('TOKEN');
    expect(secret!.value).toBe('new');
    expect(secret!.description).toBe('updated desc');
    expect(secret!.tags).toEqual(['updated']);
  });

  test('list secrets returns metadata only', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    store.setSecret('A_KEY', 'val1', 'Key A', ['a']);
    store.setSecret('B_KEY', 'val2', 'Key B', ['b']);

    const list = store.listSecrets();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ name: 'A_KEY', description: 'Key A', tags: ['a'] });
    expect((list[0] as any).value).toBeUndefined();
  });

  test('list secrets with tag filter', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    store.setSecret('A_KEY', 'val1', 'Key A', ['aws']);
    store.setSecret('B_KEY', 'val2', 'Key B', ['github']);

    const filtered = store.listSecrets('aws');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('A_KEY');
  });

  test('delete secret', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    store.setSecret('TO_DELETE', 'val', 'desc', []);

    expect(store.deleteSecret('TO_DELETE')).toBe(true);
    expect(store.getSecret('TO_DELETE')).toBeUndefined();
  });

  test('delete nonexistent secret returns false', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    expect(store.deleteSecret('NOPE')).toBe(false);
  });

  test('getAllSecretValues returns map', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    store.setSecret('K1', 'v1', 'd1', []);
    store.setSecret('K2', 'v2', 'd2', []);

    const map = store.getAllSecretValues();
    expect(map.get('K1')).toBe('v1');
    expect(map.get('K2')).toBe('v2');
  });

  test('wrong password fails to read', () => {
    const store = new VaultStore(password, tmpDir);
    store.init();
    store.setSecret('X', 'val', 'desc', []);

    const wrongStore = new VaultStore('wrong-password', tmpDir);
    expect(() => wrongStore.listSecrets()).toThrow();
  });
});

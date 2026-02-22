import fs from 'fs';
import path from 'path';
import os from 'os';
import { encrypt, decrypt } from './crypto';
import { Secret, SecretMetadata, VaultData, isValidSecretName } from './types';

const AIVAULT_DIR = path.join(os.homedir(), '.aivault');
const VAULT_FILE = path.join(AIVAULT_DIR, 'vault.enc');
const CONFIG_FILE = path.join(AIVAULT_DIR, 'config.json');

export class VaultStore {
  private password: string;
  private vaultDir: string;
  private vaultFile: string;
  private configFile: string;

  constructor(password: string, vaultDir?: string) {
    this.password = password;
    this.vaultDir = vaultDir || AIVAULT_DIR;
    this.vaultFile = path.join(this.vaultDir, 'vault.enc');
    this.configFile = path.join(this.vaultDir, 'config.json');
  }

  isInitialized(): boolean {
    return fs.existsSync(this.vaultFile);
  }

  init(): void {
    if (!fs.existsSync(this.vaultDir)) {
      fs.mkdirSync(this.vaultDir, { recursive: true, mode: 0o700 });
    }

    if (this.isInitialized()) {
      throw new Error('Vault already initialized. Use "aivault set" to add secrets.');
    }

    const emptyVault: VaultData = { secrets: [] };
    this.writeVault(emptyVault);

    const config = { version: '0.1.0', created_at: new Date().toISOString() };
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
  }

  private readVault(): VaultData {
    if (!this.isInitialized()) {
      throw new Error('Vault not initialized. Run "aivault init" first.');
    }
    const raw = fs.readFileSync(this.vaultFile);
    const json = decrypt(raw, this.password);
    return JSON.parse(json) as VaultData;
  }

  private writeVault(data: VaultData): void {
    const json = JSON.stringify(data, null, 2);
    const encrypted = encrypt(json, this.password);
    fs.writeFileSync(this.vaultFile, encrypted, { mode: 0o600 });
  }

  setSecret(name: string, value: string, description: string, tags: string[] = []): void {
    if (!isValidSecretName(name)) {
      throw new Error(`Invalid secret name "${name}". Must be uppercase letters, numbers, and underscores only, starting with a letter.`);
    }

    const vault = this.readVault();
    const now = new Date().toISOString();
    const existing = vault.secrets.findIndex(s => s.name === name);

    if (existing >= 0) {
      vault.secrets[existing] = {
        ...vault.secrets[existing],
        value,
        description,
        tags,
        updated_at: now,
      };
    } else {
      vault.secrets.push({
        name,
        value,
        description,
        tags,
        created_at: now,
        updated_at: now,
      });
    }

    this.writeVault(vault);
  }

  getSecret(name: string): Secret | undefined {
    const vault = this.readVault();
    return vault.secrets.find(s => s.name === name);
  }

  listSecrets(tag?: string): SecretMetadata[] {
    const vault = this.readVault();
    let secrets = vault.secrets;

    if (tag) {
      secrets = secrets.filter(s => s.tags.includes(tag));
    }

    return secrets.map(s => ({
      name: s.name,
      description: s.description,
      tags: s.tags,
    }));
  }

  deleteSecret(name: string): boolean {
    const vault = this.readVault();
    const index = vault.secrets.findIndex(s => s.name === name);

    if (index < 0) {
      return false;
    }

    vault.secrets.splice(index, 1);
    this.writeVault(vault);
    return true;
  }

  getAllSecrets(): Secret[] {
    const vault = this.readVault();
    return vault.secrets;
  }

  getAllSecretValues(): Map<string, string> {
    const vault = this.readVault();
    const map = new Map<string, string>();
    for (const secret of vault.secrets) {
      map.set(secret.name, secret.value);
    }
    return map;
  }
}

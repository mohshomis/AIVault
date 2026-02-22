#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VaultStore } from './vault/store';
import { createServer } from './server';

async function main() {
  const password = process.env.AIVAULT_MASTER_PASSWORD;

  if (!password) {
    console.error('Error: AIVAULT_MASTER_PASSWORD environment variable is required.');
    console.error('Set it in your MCP client config or export it in your shell.');
    process.exit(1);
  }

  const store = new VaultStore(password);

  if (!store.isInitialized()) {
    console.error('Vault not initialized. Run "aivault init" first.');
    process.exit(1);
  }

  const server = createServer(store);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

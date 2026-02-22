#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VaultStore } from './vault/store';
import { createServer } from './server';

async function main() {
  const password = process.env.AIVAULT_MASTER_PASSWORD || undefined;
  const store = password ? new VaultStore(password) : undefined;

  const server = createServer(store);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

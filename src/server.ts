import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { VaultStore } from './vault/store';
import { runCommand } from './executor/runner';
import { isValidSecretName } from './vault/types';

function vaultError(store: VaultStore | undefined): string | null {
  if (!store) {
    return 'AIVAULT_MASTER_PASSWORD environment variable is not set. Please set it in your MCP server config.';
  }
  if (!store.isInitialized()) {
    return 'Vault not initialized. Please run "aivault init" in your terminal first.';
  }
  return null;
}

export function createServer(store: VaultStore | undefined): McpServer {
  const server = new McpServer({
    name: 'aivault',
    version: '0.1.0',
  });

  // Tool 1: list_secrets
  server.tool(
    'list_secrets',
    'List available secrets (names, descriptions, tags only — never values). Use this to discover what credentials are available.',
    { tag: z.string().optional().describe('Optional tag to filter secrets by (e.g., "project-x")') },
    async ({ tag }) => {
      const err = vaultError(store);
      if (err) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', message: err }) }], isError: true };
      }
      try {
        const secrets = store!.listSecrets(tag);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ secrets }, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', message: e.message }) }], isError: true };
      }
    }
  );

  // Tool 2: run_command
  server.tool(
    'run_command',
    'Execute a shell command with secrets injected as environment variables. Reference secrets using $SECRET_NAME syntax. Output is scrubbed of any secret values before returning.',
    {
      command: z.string().describe('The shell command to execute. Reference secrets using $SECRET_NAME syntax.'),
      working_directory: z.string().optional().describe('Optional working directory. Defaults to home directory.'),
      timeout_seconds: z.number().optional().default(30).describe('Optional timeout in seconds. Defaults to 30, max 300.'),
    },
    async ({ command, working_directory, timeout_seconds }) => {
      const err = vaultError(store);
      if (err) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', message: err }) }], isError: true };
      }
      try {
        const secretValues = store!.getAllSecretValues();
        const result = runCommand({ command, working_directory, timeout_seconds }, secretValues);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          isError: result.status === 'error',
        };
      } catch (e: any) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', message: e.message }) }], isError: true };
      }
    }
  );

  // Tool 3: request_secret
  server.tool(
    'request_secret',
    'Request a secret that does not exist yet. Returns a user-friendly message the AI can relay to the user.',
    {
      name: z.string().describe('The proposed name for the secret (e.g., GITHUB_TOKEN)'),
      reason: z.string().describe('Why the AI needs this secret'),
      suggested_description: z.string().optional().describe('A suggested description for the secret'),
    },
    async ({ name, reason, suggested_description }) => {
      if (!isValidSecretName(name)) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              status: 'error',
              message: `Invalid secret name "${name}". Must be uppercase letters, numbers, and underscores only, starting with a letter.`,
            }),
          }],
          isError: true,
        };
      }

      const desc = suggested_description || reason;
      const message = `Please add the secret by running:\n\n  aivault set ${name} --desc "${desc}"\n\nYou will be prompted to enter the value securely. Once added, I can continue with the task.`;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ status: 'secret_requested', message, name, reason }, null, 2),
        }],
      };
    }
  );

  return server;
}

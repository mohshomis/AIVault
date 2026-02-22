#!/usr/bin/env node
import { initCommand } from './commands/init';
import { setCommand } from './commands/set';
import { listCommand } from './commands/list';
import { deleteCommand } from './commands/delete';
import { exportCommand } from './commands/export';
import { promptHidden } from './utils';

async function getPassword(): Promise<string> {
  const envPassword = process.env.AIVAULT_MASTER_PASSWORD;
  if (envPassword) return envPassword;
  return promptHidden('Master password: ');
}

function parseArgs(args: string[]): { command: string; positional: string[]; flags: Record<string, string> } {
  const command = args[0] || 'help';
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      flags[key] = value;
    } else {
      positional.push(args[i]);
    }
  }

  return { command, positional, flags };
}

function printHelp(): void {
  console.log(`
AIVault — Secure secret management for AI agents

Usage:
  aivault init                                    Initialize vault with master password
  aivault set <NAME> --desc "description" [--tags "tag1,tag2"]  Add or update a secret
  aivault list [--tag "tag"]                      List secrets (names only, never values)
  aivault delete <NAME>                           Delete a secret
  aivault export-descriptions [--json] [--tag "tag"]  Export secret metadata

Environment:
  AIVAULT_MASTER_PASSWORD    Master password (avoids interactive prompt)
`);
}

async function main(): Promise<void> {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));

  switch (command) {
    case 'init':
      await initCommand();
      break;

    case 'set': {
      const name = positional[0];
      if (!name) {
        console.error('Usage: aivault set <NAME> --desc "description" [--tags "tag1,tag2"]');
        process.exit(1);
      }
      const desc = flags.desc || flags.description;
      if (!desc) {
        console.error('Error: --desc is required.');
        process.exit(1);
      }
      const tags = flags.tags ? flags.tags.split(',').map(t => t.trim()) : [];
      const password = await getPassword();
      await setCommand(name, desc, tags, password);
      break;
    }

    case 'list': {
      const password = await getPassword();
      listCommand(flags.tag, password);
      break;
    }

    case 'delete': {
      const name = positional[0];
      if (!name) {
        console.error('Usage: aivault delete <NAME>');
        process.exit(1);
      }
      const password = await getPassword();
      await deleteCommand(name, password);
      break;
    }

    case 'export-descriptions': {
      const password = await getPassword();
      exportCommand(flags.json === 'true', flags.tag, password);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

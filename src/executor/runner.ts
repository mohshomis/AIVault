import { execSync } from 'child_process';
import os from 'os';
import { parseSecretReferences } from './parser';
import { scrubOutput } from '../scrubber/scrubber';

const MAX_TIMEOUT = 300;
const DEFAULT_TIMEOUT = 30;

export interface RunCommandInput {
  command: string;
  working_directory?: string;
  timeout_seconds?: number;
}

export interface RunCommandResult {
  status: 'success' | 'missing_secrets' | 'error';
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  missing?: Array<{ name: string; message: string }>;
}

export function runCommand(
  input: RunCommandInput,
  secretValues: Map<string, string>
): RunCommandResult {
  const { command, working_directory, timeout_seconds } = input;

  // Parse secret references from the command
  const referencedSecrets = parseSecretReferences(command);

  // Check for missing secrets
  const missing = referencedSecrets.filter(name => !secretValues.has(name));
  if (missing.length > 0) {
    return {
      status: 'missing_secrets',
      missing: missing.map(name => ({
        name,
        message: `This secret is not in the vault. Please ask the user to add it using: aivault set ${name} --desc "description of what this secret is for"`,
      })),
    };
  }

  // Build environment with secrets injected
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  for (const [name, value] of secretValues) {
    env[name] = value;
  }

  const timeout = Math.min(Math.max(1, timeout_seconds ?? DEFAULT_TIMEOUT), MAX_TIMEOUT) * 1000;
  const cwd = working_directory || os.homedir();

  try {
    const stdout = execSync(command, {
      cwd,
      env,
      timeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/sh',
    });

    const scrubbedStdout = scrubOutput(stdout || '', secretValues);

    return {
      status: 'success',
      exit_code: 0,
      stdout: scrubbedStdout,
      stderr: '',
    };
  } catch (err: any) {
    const stdout = scrubOutput(err.stdout?.toString() || '', secretValues);
    const stderr = scrubOutput(err.stderr?.toString() || '', secretValues);

    return {
      status: 'error',
      exit_code: err.status ?? 1,
      stdout,
      stderr: stderr || err.message,
    };
  }
}

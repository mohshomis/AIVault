import { parseSecretReferences } from '../src/executor/parser';
import { runCommand } from '../src/executor/runner';

describe('parser', () => {
  test('parses single secret reference', () => {
    expect(parseSecretReferences('echo $MY_TOKEN')).toEqual(['MY_TOKEN']);
  });

  test('parses multiple references', () => {
    const refs = parseSecretReferences('curl -H "Authorization: $TOKEN" $API_URL/endpoint');
    expect(refs).toContain('TOKEN');
    expect(refs).toContain('API_URL');
  });

  test('deduplicates references', () => {
    const refs = parseSecretReferences('echo $TOKEN $TOKEN');
    expect(refs).toEqual(['TOKEN']);
  });

  test('ignores lowercase variables', () => {
    expect(parseSecretReferences('echo $home')).toEqual([]);
  });

  test('returns empty for no references', () => {
    expect(parseSecretReferences('echo hello')).toEqual([]);
  });

  test('handles adjacent text', () => {
    expect(parseSecretReferences('prefix$MY_KEY/suffix')).toEqual(['MY_KEY']);
  });
});

describe('runner', () => {
  test('executes simple command', () => {
    const result = runCommand(
      { command: 'echo hello' },
      new Map()
    );
    expect(result.status).toBe('success');
    expect(result.stdout?.trim()).toBe('hello');
  });

  test('returns missing secrets when referenced secret not in vault', () => {
    const result = runCommand(
      { command: 'echo $MISSING_SECRET' },
      new Map()
    );
    expect(result.status).toBe('missing_secrets');
    expect(result.missing).toHaveLength(1);
    expect(result.missing![0].name).toBe('MISSING_SECRET');
  });

  test('injects secrets as env vars and scrubs output', () => {
    const secrets = new Map([['TEST_VAR', 'injected_value']]);
    const result = runCommand(
      { command: 'echo $TEST_VAR' },
      secrets
    );
    expect(result.status).toBe('success');
    // The secret value is injected but then scrubbed from output
    expect(result.stdout).toContain('[REDACTED:TEST_VAR]');
    expect(result.stdout).not.toContain('injected_value');
  });

  test('scrubs secret values from output', () => {
    const secrets = new Map([['MY_SECRET', 'super_secret_123']]);
    const result = runCommand(
      { command: 'echo "The value is super_secret_123"' },
      secrets
    );
    expect(result.status).toBe('success');
    expect(result.stdout).toContain('[REDACTED:MY_SECRET]');
    expect(result.stdout).not.toContain('super_secret_123');
  });

  test('handles command failure', () => {
    const result = runCommand(
      { command: 'exit 1' },
      new Map()
    );
    expect(result.status).toBe('error');
    expect(result.exit_code).toBe(1);
  });

  test('respects working directory', () => {
    const result = runCommand(
      { command: 'pwd', working_directory: '/tmp' },
      new Map()
    );
    expect(result.status).toBe('success');
    // /tmp may resolve to /private/tmp on macOS
    expect(result.stdout?.trim()).toMatch(/\/?tmp$/);
  });

  test('enforces timeout', () => {
    const result = runCommand(
      { command: 'sleep 10', timeout_seconds: 1 },
      new Map()
    );
    expect(result.status).toBe('error');
  });

  test('caps timeout at 300 seconds', () => {
    // Just verify it doesn't throw for large values — the cap is internal
    const result = runCommand(
      { command: 'echo ok', timeout_seconds: 9999 },
      new Map()
    );
    expect(result.status).toBe('success');
  });
});

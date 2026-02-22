import { scrubOutput } from '../src/scrubber/scrubber';

describe('scrubber', () => {
  test('replaces secret values with redacted placeholder', () => {
    const secrets = new Map([['MY_TOKEN', 'abc123']]);
    const output = 'Token is abc123 and done.';
    expect(scrubOutput(output, secrets)).toBe('Token is [REDACTED:MY_TOKEN] and done.');
  });

  test('replaces multiple occurrences', () => {
    const secrets = new Map([['KEY', 'secret']]);
    const output = 'secret and secret again';
    expect(scrubOutput(output, secrets)).toBe('[REDACTED:KEY] and [REDACTED:KEY] again');
  });

  test('replaces multiple different secrets', () => {
    const secrets = new Map([
      ['A', 'alpha'],
      ['B', 'beta'],
    ]);
    const output = 'alpha and beta';
    expect(scrubOutput(output, secrets)).toBe('[REDACTED:A] and [REDACTED:B]');
  });

  test('handles longest-first replacement', () => {
    const secrets = new Map([
      ['SHORT', 'abc'],
      ['LONG', 'abcdef'],
    ]);
    const output = 'value is abcdef here';
    const result = scrubOutput(output, secrets);
    expect(result).toBe('value is [REDACTED:LONG] here');
  });

  test('scrubs URL-encoded values', () => {
    const secrets = new Map([['DB_URL', 'user:p@ss@host']]);
    const urlEncoded = encodeURIComponent('user:p@ss@host');
    const output = `Connecting to ${urlEncoded}`;
    expect(scrubOutput(output, secrets)).toBe('Connecting to [REDACTED:DB_URL]');
  });

  test('scrubs Base64-encoded values', () => {
    const secrets = new Map([['TOKEN', 'mysecretvalue']]);
    const b64 = Buffer.from('mysecretvalue').toString('base64');
    const output = `Encoded: ${b64}`;
    expect(scrubOutput(output, secrets)).toBe('Encoded: [REDACTED:TOKEN]');
  });

  test('returns empty string for empty input', () => {
    const secrets = new Map([['K', 'v']]);
    expect(scrubOutput('', secrets)).toBe('');
  });

  test('returns original if no secrets', () => {
    expect(scrubOutput('hello world', new Map())).toBe('hello world');
  });

  test('handles special regex characters in secret values', () => {
    const secrets = new Map([['REGEX_SECRET', 'value.with+special(chars)']]);
    const output = 'Found: value.with+special(chars) end';
    expect(scrubOutput(output, secrets)).toBe('Found: [REDACTED:REGEX_SECRET] end');
  });
});

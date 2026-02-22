/**
 * Parse $SECRET_NAME references from a command string.
 * Matches $UPPER_CASE_NAME patterns that follow env var naming conventions.
 */
export function parseSecretReferences(command: string): string[] {
  const regex = /\$([A-Z][A-Z0-9_]*)\b/g;
  const names = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(command)) !== null) {
    names.add(match[1]);
  }

  return Array.from(names);
}

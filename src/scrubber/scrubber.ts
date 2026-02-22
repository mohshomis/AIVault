/**
 * Scrub secret values from output text.
 * Replaces any occurrence of a secret value (or common encodings) with [REDACTED:SECRET_NAME].
 * Processes longest values first to prevent partial matches.
 */
export function scrubOutput(output: string, secretValues: Map<string, string>): string {
  if (!output || secretValues.size === 0) {
    return output;
  }

  // Sort by value length descending to prevent partial match issues
  const entries = Array.from(secretValues.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  let scrubbed = output;

  for (const [name, value] of entries) {
    if (!value) continue;

    const redacted = `[REDACTED:${name}]`;

    // Replace raw value
    scrubbed = replaceAll(scrubbed, value, redacted);

    // Replace URL-encoded version
    const urlEncoded = encodeURIComponent(value);
    if (urlEncoded !== value) {
      scrubbed = replaceAll(scrubbed, urlEncoded, redacted);
    }

    // Replace Base64-encoded version
    const base64Encoded = Buffer.from(value).toString('base64');
    if (base64Encoded !== value) {
      scrubbed = replaceAll(scrubbed, base64Encoded, redacted);
    }
  }

  return scrubbed;
}

function replaceAll(str: string, search: string, replacement: string): string {
  // Escape special regex characters in the search string
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), replacement);
}

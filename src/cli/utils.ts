import readline from 'readline';

export function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Mute output for hidden input
    const stdout = process.stdout;
    let muted = false;

    const originalWrite = stdout.write.bind(stdout);
    stdout.write = ((chunk: any, ...args: any[]) => {
      if (muted) {
        // Only suppress the echoed characters, not our prompt
        return true;
      }
      return originalWrite(chunk, ...args);
    }) as any;

    rl.question(question, (answer) => {
      muted = false;
      stdout.write = originalWrite;
      stdout.write('\n');
      rl.close();
      resolve(answer);
    });

    muted = true;
  });
}

export function promptConfirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

export function formatTable(rows: string[][], headers: string[]): string {
  const allRows = [headers, ...rows];
  const colWidths = headers.map((_, i) =>
    Math.max(...allRows.map(row => (row[i] || '').length))
  );

  const formatRow = (row: string[]) =>
    row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('  ');

  const headerLine = formatRow(headers);
  const separator = colWidths.map(w => '-'.repeat(w)).join('  ');

  return [headerLine, separator, ...rows.map(formatRow)].join('\n');
}

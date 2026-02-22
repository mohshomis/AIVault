import http from 'http';
import { VaultStore } from '../../vault/store';

const PORT = 7470;

function html(store: VaultStore, message?: string): string {
  let secrets: Array<{ name: string; description: string; tags: string[] }> = [];
  try {
    secrets = store.listSecrets();
  } catch { }

  const rows = secrets.map(s => `
    <tr>
      <td><code>${esc(s.name)}</code></td>
      <td>${esc(s.description)}</td>
      <td>${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</td>
      <td>
        <form method="POST" action="/delete" style="margin:0">
          <input type="hidden" name="name" value="${esc(s.name)}">
          <button type="submit" class="btn-delete" onclick="return confirm('Delete ${esc(s.name)}?')">Delete</button>
        </form>
      </td>
    </tr>`).join('');

  const banner = message ? `<div class="banner">${esc(message)}</div>` : '';

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AIVault Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; padding: 2rem; }
  h1 { font-size: 1.6rem; margin-bottom: .3rem; }
  .subtitle { color: #8b949e; margin-bottom: 1.5rem; font-size: .9rem; }
  .banner { background: #1a7f37; color: #fff; padding: .6rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; color: #8b949e; font-size: .8rem; text-transform: uppercase; padding: .5rem .8rem; border-bottom: 1px solid #30363d; }
  td { padding: .7rem .8rem; border-bottom: 1px solid #21262d; }
  code { background: #1c2128; padding: .15rem .4rem; border-radius: 4px; font-size: .85rem; color: #79c0ff; }
  .tag { background: #1f6feb33; color: #58a6ff; padding: .1rem .5rem; border-radius: 10px; font-size: .75rem; }
  .empty { color: #8b949e; text-align: center; padding: 2rem; }
  form.add { display: grid; grid-template-columns: 1fr 2fr 1fr 1fr auto; gap: .6rem; align-items: end; }
  label { font-size: .8rem; color: #8b949e; display: block; margin-bottom: .2rem; }
  input[type="text"], input[type="password"] { width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: .5rem .7rem; border-radius: 6px; font-size: .85rem; }
  input:focus { outline: none; border-color: #58a6ff; }
  .btn { background: #238636; color: #fff; border: none; padding: .55rem 1.2rem; border-radius: 6px; cursor: pointer; font-size: .85rem; }
  .btn:hover { background: #2ea043; }
  .btn-delete { background: transparent; color: #f85149; border: 1px solid #f8514933; padding: .3rem .8rem; border-radius: 6px; cursor: pointer; font-size: .8rem; }
  .btn-delete:hover { background: #f8514922; }
  .count { color: #8b949e; font-size: .85rem; }
  @media (max-width: 700px) { form.add { grid-template-columns: 1fr; } }
</style>
</head><body>
  <h1>🔐 AIVault Dashboard</h1>
  <p class="subtitle">Manage your secrets securely. Values are never displayed.</p>
  ${banner}

  <div class="card">
    <h2 style="font-size:1rem;margin-bottom:1rem;">Add Secret</h2>
    <form class="add" method="POST" action="/add">
      <div><label>Name</label><input type="text" name="name" placeholder="GITHUB_TOKEN" required pattern="[A-Z][A-Z0-9_]*"></div>
      <div><label>Description</label><input type="text" name="description" placeholder="GitHub PAT for repos" required></div>
      <div><label>Value</label><input type="password" name="value" placeholder="••••••••" required></div>
      <div><label>Tags (comma-separated)</label><input type="text" name="tags" placeholder="github, vcs"></div>
      <div><label>&nbsp;</label><button type="submit" class="btn">Add</button></div>
    </form>
  </div>

  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 style="font-size:1rem;">Secrets</h2>
      <span class="count">${secrets.length} secret${secrets.length !== 1 ? 's' : ''}</span>
    </div>
    ${secrets.length === 0
      ? '<p class="empty">No secrets yet. Add one above.</p>'
      : `<table><thead><tr><th>Name</th><th>Description</th><th>Tags</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
    }
  </div>
</body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split('&')) {
    const [key, ...rest] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
  }
  return params;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
  });
}

export function dashboardCommand(password: string): void {
  const store = new VaultStore(password);

  if (!store.isInitialized()) {
    console.error('Vault not initialized. Run "aivault init" first.');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    if (req.method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store));
      return;
    }

    if (req.method === 'POST' && url === '/add') {
      const body = await readBody(req);
      const params = parseBody(body);
      const { name, description, value, tags } = params;

      let msg: string;
      try {
        const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        store.setSecret(name, value, description, tagList);
        msg = `Secret ${name} saved`;
      } catch (err: any) {
        msg = `Error: ${err.message}`;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store, msg));
      return;
    }

    if (req.method === 'POST' && url === '/delete') {
      const body = await readBody(req);
      const params = parseBody(body);
      const { name } = params;

      let msg: string;
      if (store.deleteSecret(name)) {
        msg = `Secret ${name} deleted`;
      } else {
        msg = `Secret ${name} not found`;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store, msg));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n🔐 AIVault Dashboard running at http://localhost:${PORT}\n`);
    console.log('Press Ctrl+C to stop.\n');
  });
}

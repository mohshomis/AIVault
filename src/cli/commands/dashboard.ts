import http from 'http';
import { VaultStore } from '../../vault/store';

const PORT = 7470;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function html(store: VaultStore, message?: string, editName?: string): string {
  let secrets: Array<{ name: string; description: string; tags: string[] }> = [];
  try { secrets = store.listSecrets(); } catch { }

  const editSecret = editName ? store.getSecret(editName) : undefined;

  const rows = secrets.map(s => `
    <tr>
      <td><code>${esc(s.name)}</code></td>
      <td>${esc(s.description)}</td>
      <td>${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ') || '<span class="muted">—</span>'}</td>
      <td class="actions">
        <a href="/edit?name=${encodeURIComponent(s.name)}" class="btn-icon" title="Edit">Edit</a>
        <form method="POST" action="/delete" style="display:inline">
          <input type="hidden" name="name" value="${esc(s.name)}">
          <button type="submit" class="btn-icon btn-danger" onclick="return confirm('Delete ${esc(s.name)}?')" title="Delete">Delete</button>
        </form>
      </td>
    </tr>`).join('');

  const banner = message ? `<div class="banner">${esc(message)}</div>` : '';

  const editForm = editSecret ? `
    <div class="card">
      <div class="card-header">
        <h2>Edit: ${esc(editSecret.name)}</h2>
        <a href="/" class="btn-secondary">Cancel</a>
      </div>
      <form method="POST" action="/update">
        <input type="hidden" name="name" value="${esc(editSecret.name)}">
        <div class="form-grid-edit">
          <div><label>Description</label><input type="text" name="description" value="${esc(editSecret.description)}" required></div>
          <div><label>New Value (leave blank to keep current)</label><input type="password" name="value" placeholder="Leave blank to keep unchanged"></div>
          <div><label>Tags</label><input type="text" name="tags" value="${esc(editSecret.tags.join(', '))}" placeholder="comma-separated"></div>
        </div>
        <div class="form-meta">
          <span class="muted">Created: ${editSecret.created_at.split('T')[0]}</span>
          <span class="muted">Updated: ${editSecret.updated_at.split('T')[0]}</span>
        </div>
        <button type="submit" class="btn">Save Changes</button>
      </form>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AIVault</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; padding: 2rem; max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: .2rem; }
  h2 { font-size: 1rem; }
  .subtitle { color: #8b949e; margin-bottom: 1.5rem; font-size: .85rem; }
  .banner { background: #1a7f37; color: #fff; padding: .5rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: .85rem; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.2rem; margin-bottom: 1.2rem; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; color: #8b949e; font-size: .75rem; text-transform: uppercase; letter-spacing: .5px; padding: .5rem .6rem; border-bottom: 1px solid #30363d; }
  td { padding: .6rem; border-bottom: 1px solid #21262d; font-size: .85rem; }
  code { background: #1c2128; padding: .1rem .35rem; border-radius: 3px; font-size: .8rem; color: #79c0ff; }
  .tag { background: #1f6feb22; color: #58a6ff; padding: .1rem .45rem; border-radius: 10px; font-size: .7rem; margin-right: .3rem; }
  .muted { color: #484f58; font-size: .8rem; }
  .empty { color: #8b949e; text-align: center; padding: 2rem; font-size: .85rem; }
  .actions { white-space: nowrap; }
  label { font-size: .75rem; color: #8b949e; display: block; margin-bottom: .2rem; }
  input[type="text"], input[type="password"], input[type="search"] { width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: .45rem .6rem; border-radius: 6px; font-size: .8rem; }
  input:focus { outline: none; border-color: #58a6ff; }
  .btn { background: #238636; color: #fff; border: none; padding: .45rem 1rem; border-radius: 6px; cursor: pointer; font-size: .8rem; margin-top: .8rem; }
  .btn:hover { background: #2ea043; }
  .btn-secondary { background: transparent; color: #8b949e; border: 1px solid #30363d; padding: .35rem .8rem; border-radius: 6px; cursor: pointer; font-size: .8rem; text-decoration: none; }
  .btn-secondary:hover { color: #e6edf3; border-color: #8b949e; }
  .btn-icon { color: #8b949e; background: none; border: 1px solid #30363d; padding: .2rem .6rem; border-radius: 4px; cursor: pointer; font-size: .75rem; text-decoration: none; margin-right: .3rem; }
  .btn-icon:hover { color: #e6edf3; border-color: #8b949e; }
  .btn-danger { color: #f85149; border-color: #f8514933; }
  .btn-danger:hover { background: #f8514922; border-color: #f85149; }
  .form-grid { display: grid; grid-template-columns: 1fr 2fr 1fr 1fr; gap: .5rem; align-items: end; }
  .form-grid-edit { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
  .form-grid-edit > div:first-child { grid-column: 1 / -1; }
  .form-meta { display: flex; gap: 1.5rem; margin-top: .8rem; }
  .search-bar { margin-bottom: 1rem; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .count { color: #8b949e; font-size: .8rem; }
  @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } .form-grid-edit { grid-template-columns: 1fr; } }
</style>
</head><body>
  <h1>AIVault</h1>
  <p class="subtitle">Manage your secrets. Values are never displayed.</p>
  ${banner}
  ${editForm}

  <div class="card">
    <details${editName ? '' : ' open'}>
      <summary style="cursor:pointer;font-size:.9rem;margin-bottom:.8rem;color:#8b949e;">Add New Secret</summary>
      <form method="POST" action="/add">
        <div class="form-grid">
          <div><label>Name</label><input type="text" name="name" placeholder="GITHUB_TOKEN" required pattern="[A-Z][A-Z0-9_]*"></div>
          <div><label>Description</label><input type="text" name="description" placeholder="GitHub PAT for repos" required></div>
          <div><label>Value</label><input type="password" name="value" placeholder="secret value" required></div>
          <div><label>Tags</label><input type="text" name="tags" placeholder="github, vcs"></div>
        </div>
        <button type="submit" class="btn">Add Secret</button>
      </form>
    </details>
  </div>

  <div class="card">
    <div class="toolbar">
      <h2>Secrets</h2>
      <span class="count">${secrets.length} secret${secrets.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="search-bar">
      <input type="search" id="search" placeholder="Filter by name, description, or tag..." oninput="filterTable()">
    </div>
    ${secrets.length === 0
      ? '<p class="empty">No secrets yet. Add one above.</p>'
      : `<table id="secrets-table"><thead><tr><th>Name</th><th>Description</th><th>Tags</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
    }
  </div>

  <script>
  function filterTable() {
    const q = document.getElementById('search').value.toLowerCase();
    const rows = document.querySelectorAll('#secrets-table tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  }
  </script>
</body></html>`;
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

function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf('?');
  if (idx < 0) return {};
  const params: Record<string, string> = {};
  for (const pair of url.slice(idx + 1).split('&')) {
    const [key, ...rest] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
  }
  return params;
}

export function dashboardCommand(password: string): void {
  const store = new VaultStore(password);

  if (!store.isInitialized()) {
    console.error('Vault not initialized. Run "aivault init" first.');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    const pathname = url.split('?')[0];

    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store));
      return;
    }

    if (req.method === 'GET' && pathname === '/edit') {
      const query = parseQuery(url);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store, undefined, query.name));
      return;
    }

    if (req.method === 'POST' && pathname === '/add') {
      const body = await readBody(req);
      const params = parseBody(body);
      let msg: string;
      try {
        const tagList = params.tags ? params.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        store.setSecret(params.name, params.value, params.description, tagList);
        msg = `Secret ${params.name} saved`;
      } catch (err: any) {
        msg = `Error: ${err.message}`;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store, msg));
      return;
    }

    if (req.method === 'POST' && pathname === '/update') {
      const body = await readBody(req);
      const params = parseBody(body);
      let msg: string;
      try {
        const existing = store.getSecret(params.name);
        if (!existing) {
          msg = `Secret ${params.name} not found`;
        } else {
          const newValue = params.value || existing.value;
          const tagList = params.tags ? params.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
          store.setSecret(params.name, newValue, params.description, tagList);
          msg = `Secret ${params.name} updated`;
        }
      } catch (err: any) {
        msg = `Error: ${err.message}`;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store, msg));
      return;
    }

    if (req.method === 'POST' && pathname === '/delete') {
      const body = await readBody(req);
      const params = parseBody(body);
      const deleted = store.deleteSecret(params.name);
      const msg = deleted ? `Secret ${params.name} deleted` : `Secret ${params.name} not found`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html(store, msg));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\nAIVault Dashboard running at http://localhost:${PORT}\n`);
    console.log('Press Ctrl+C to stop.\n');
  });
}

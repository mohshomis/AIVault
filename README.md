# 🔐 AIVault

**Stop pasting API keys into AI chat.**

AIVault is an [MCP server](https://modelcontextprotocol.io) that lets AI agents use your credentials **without ever seeing them**. The AI references secrets by name (`$GITHUB_TOKEN`), AIVault injects the real values at runtime, and scrubs them from the output before the AI sees anything.

Works with **Claude Desktop**, **Kiro**, **Cursor**, **Windsurf**, and any MCP-compatible client.

---

## The Problem

Every day, developers paste API keys, database passwords, and tokens directly into AI chat. This is a massive security risk — those secrets end up in logs, training data, and who knows where else.

## The Solution

```
You:    "Deploy my app to AWS"
AI:     calls run_command → "aws s3 cp ./build s3://my-bucket"
AIVault: ✅ Injects $AWS_ACCESS_KEY_ID and $AWS_SECRET_ACCESS_KEY as env vars
         ✅ Runs the command
         ✅ Scrubs any leaked secrets from output
         ✅ Returns clean result to AI
AI:     "Done! All files uploaded to S3."
```

The AI never sees your actual credentials. Ever.

---

## Quick Start

### 1. Install

```bash
npm install -g aivault-mcp
```

### 2. Initialize your vault

```bash
aivault init
```

### 3. Add your secrets

```bash
aivault set GITHUB_TOKEN --desc "GitHub PAT for repo access" --tags "github"
aivault set AWS_ACCESS_KEY_ID --desc "AWS access key" --tags "aws"
```

### 4. Connect to your AI tool

Add to your MCP config:

```json
{
  "mcpServers": {
    "aivault": {
      "command": "npx",
      "args": ["-y", "aivault-mcp"],
      "env": {
        "AIVAULT_MASTER_PASSWORD": "your-master-password"
      }
    }
  }
}
```


| AI Tool | Config File Location |
|---------|---------------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| Kiro | `~/.kiro/settings/mcp.json` |
| Cursor | `.cursor/mcp.json` in your project |
| Windsurf | `~/.windsurf/mcp.json` |

### 5. Done! Ask your AI to use your secrets

> "Check how many users are in my database"

The AI will call `list_secrets`, find your `DB_URL`, run the query with `run_command`, and return scrubbed results.

---

## Web Dashboard

Manage secrets visually instead of the CLI:

```bash
aivault dashboard
```

Opens a local web UI at `http://localhost:7470` where you can add, view, and delete secrets from your browser.

---

## How It Works

```
User ←→ AI (Claude, Kiro, Cursor, etc.)
              ↓
         MCP Protocol
              ↓
     ┌─────────────────┐
     │  AIVault MCP     │
     │                  │
     │  Secret Store    │  ← AES-256-GCM encrypted local file
     │  Executor        │  ← Injects secrets as env vars
     │  Scrubber        │  ← Removes secret values from output
     └─────────────────┘
```

### MCP Tools

| Tool | What it does |
|------|-------------|
| `list_secrets` | Shows available secrets (name + description only, **never values**) |
| `run_command` | Runs a shell command with secrets injected as env vars, output scrubbed |
| `request_secret` | AI asks the user to add a missing secret |

### Security

- 🔒 **Encrypted at rest** — AES-256-GCM with PBKDF2 key derivation (100k iterations, SHA-512)
- 🚫 **AI never sees values** — only names, descriptions, and tags
- 🧹 **Output always scrubbed** — raw, URL-encoded, and Base64-encoded values are all caught
- 💉 **Env var injection only** — secrets are never interpolated into command strings (prevents shell injection)
- ⏱️ **Timeout enforcement** — commands are killed after 30s (configurable, max 300s)
- 🏠 **100% local** — no cloud, no network, no telemetry

---

## CLI Reference

```bash
aivault init                              # Set up vault with master password
aivault set <NAME> --desc "..." [--tags "a,b"]  # Add or update a secret
aivault list [--tag "..."]                # List secrets (never shows values)
aivault delete <NAME>                     # Remove a secret
aivault dashboard                         # Open web UI
aivault export-descriptions [--json]      # Export metadata for docs/sharing
```

Set `AIVAULT_MASTER_PASSWORD` env var to skip password prompts.

---

## Example Interactions

**Using a database:**
> You: "How many orders were placed today?"
> AI → `run_command`: `psql $DB_URL -c "SELECT COUNT(*) FROM orders WHERE date = CURRENT_DATE"`
> Result: `count: 847` (connection string scrubbed)

**Deploying code:**
> You: "Push my Docker image to ECR"
> AI → `run_command`: `aws ecr get-login-password | docker login ... && docker push`
> AWS credentials injected via env vars, never visible to AI

**Missing credential:**
> You: "Send a Slack notification"
> AI → `request_secret`: "I need a SLACK_WEBHOOK_URL. Please run: `aivault set SLACK_WEBHOOK_URL --desc 'Slack webhook'`"

---

## License

MIT

---

Built by [Mohammed Shomis](https://github.com/mohshomis) with ❤️ for developers who care about security.

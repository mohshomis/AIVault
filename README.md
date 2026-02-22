# AIVault

Secure secret management for AI agents. AIVault is an MCP server that lets AI use your credentials without ever seeing the actual values.

The AI references secrets by name (e.g., `$GITHUB_TOKEN`), and AIVault injects real values at execution time, runs the command, scrubs any leaked secrets from the output, and returns clean results.

## Quick Start

```bash
# Install
npm install -g aivault-mcp

# Initialize vault
aivault init

# Add a secret
aivault set GITHUB_TOKEN --desc "GitHub PAT for repo access" --tags "github,vcs"

# List secrets (never shows values)
aivault list
```

## MCP Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "aivault": {
      "command": "npx",
      "args": ["-y", "aivault-mcp"],
      "env": {
        "AIVAULT_MASTER_PASSWORD": ""
      }
    }
  }
}
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `list_secrets` | List available secrets (metadata only, never values) |
| `run_command` | Execute a command with secrets injected as env vars, output scrubbed |
| `request_secret` | Request a secret that doesn't exist yet |

## CLI Commands

| Command | Description |
|---------|-------------|
| `aivault init` | Initialize vault with master password |
| `aivault set <NAME> --desc "..." [--tags "..."]` | Add or update a secret |
| `aivault list [--tag "..."]` | List secrets |
| `aivault delete <NAME>` | Delete a secret |
| `aivault export-descriptions [--json]` | Export metadata |

## Security

- Secrets never leave your machine — no cloud, no network
- AI never sees values — only names, descriptions, and tags
- Output is always scrubbed before returning to AI
- Vault encrypted at rest with AES-256-GCM + PBKDF2
- Secrets injected as env vars, never interpolated into commands
- Timeout enforcement on all commands

## License

MIT

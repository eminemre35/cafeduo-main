# Skills and MCP Setup

Last updated: 2026-02-05

## Installed Skills
- `doc`
- `gh-fix-ci`
- `playwright`
- `render-deploy`
- `security-best-practices`

Notes:
- These are installed under `~/.codex/skills`.
- Restart Codex to ensure new skills are fully available in all sessions.

## Configured MCP Servers
- `openaiDeveloperDocs`
  - Transport: `streamable_http`
  - URL: `https://developers.openai.com/mcp`
- `context7`
  - Transport: `stdio`
  - Command: `npx -y @upstash/context7-mcp`
- `playwright-mcp`
  - Transport: `stdio`
  - Command: `npx -y @playwright/mcp@latest`
- `filesystem`
  - Transport: `stdio`
  - Command: `npx -y @modelcontextprotocol/server-filesystem /home/emin/cafeduo-main /home/emin/cafeduo-main/docs`

## Pending Optional MCP
- `postgres-cafeduo` can be added when a valid `DATABASE_URL` is available:
  - `codex mcp add postgres-cafeduo -- npx -y @modelcontextprotocol/server-postgres "postgresql://USER:PASS@HOST:5432/DB"`

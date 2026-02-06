# Skills + MCP Research Notes

Last updated: 2026-02-06

## Scope

- Goal: find practical, high-impact skills/MCP servers for CafeDuo until production deploy.
- Priority: official/maintained sources first.

## Source Highlights

- OpenAI Skills catalog (`openai/skills`) confirms curated/system skill workflow and install path.
  - https://github.com/openai/skills
- Official MCP Registry is in preview and provides namespace verification + standardized metadata.
  - https://modelcontextprotocol.io/registry/about
- Official MCP reference server repository lists maintained reference servers and points to registry for broader discovery.
  - https://github.com/modelcontextprotocol/servers
- MCP transport spec confirms `stdio` and `streamable-http` as standard transports.
  - https://modelcontextprotocol.io/specification/2025-11-25/basic/transports

## Recommended Skill Additions (for this repo)

1. `cloudflare-deploy`
   - Domain cutover, DNS, CDN/WAF hardening path for production.
2. `sentry`
   - Error tracking rollout and release health workflow.
3. `gh-address-comments`
   - Faster PR iteration during stabilization and launch.
4. `develop-web-game`
   - Game-loop tuning and faster content iteration.

## Recommended MCP Additions (for this repo)

1. `postgres-cafeduo` (`@modelcontextprotocol/server-postgres`)
   - DB schema/query inspection during bug triage and release checks.
2. `fetch` reference server (`@modelcontextprotocol/server-fetch`)
   - Controlled web content extraction for docs/spec validation.
3. `git` reference server (`@modelcontextprotocol/server-git`)
   - Structured repository inspection for release diffs and audits.
4. `time` reference server (`@modelcontextprotocol/server-time`)
   - TZ-safe scheduling/cron checks for production operations.

## Practical Guardrails

- Prefer maintained servers listed by official MCP sources.
- For remote MCP, enforce auth + origin validation (per spec security warning).
- Keep production secrets out of MCP command args; inject via env vars.

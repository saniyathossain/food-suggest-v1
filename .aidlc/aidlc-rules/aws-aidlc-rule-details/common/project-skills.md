# Project Skills Index — Shell Console

**ALWAYS LOAD THIS FILE** at workflow start. These skills extend AI-DLC for this codebase.

## Skill location
Skills live in `.claude/skills/<name>/SKILL.md` (Codex and other agents see the same files through `.agents/skills`). Load the relevant skill before designing or generating code in that domain.

| Skill | Load when |
|-------|-----------|
| `go-backend` | any Go work: handlers, probes, collector, store, tenancy, tests |
| `react-frontend` | any UI work in `ui/` (React 19, TypeScript, Vite, Tailwind); Next.js projects |
| `devops-cloud` | DigitalOcean / AWS / GCP / VPS, Docker, deploy templates, zero-downtime rollouts |
| `security-practices` | auth, roles, tenant isolation, secrets, SSRF, ssh, email, any security review |
| `networking` | ssh jump/multiplexing, DNS, TLS, load balancers, firewalls, egress |
| `database-management` | MySQL / Valkey / PostgreSQL probes, the console's SQLite schema and migrations |
| `software-architecture` | new components, cross-cutting changes, ADRs, workflow planning |
| `server-operations` | maintenance runbooks, alerts, incidents on the servers the console watches |

## Before touching code
- Read `CLAUDE.md` (hard rules) and `.claude/instructions/core-knowledge.md`.
- Read the matching doc in `docs/` (architecture, monitoring, deploy, saas, security, operations, development, api).
- Current state and decisions: `aidlc-docs/aidlc-state.md`, `docs/STATUS.md`.

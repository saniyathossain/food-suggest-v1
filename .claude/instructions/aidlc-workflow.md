# AI-DLC workflow — Pathya

This repo follows the **AWS AI-Driven Development Life Cycle (AI-DLC)** rules ([awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows), MIT-0), vendored at `0.1.8` (`.aidlc/aidlc-rules/VERSION`), the same set Shell Console uses.

## Session start
1. Load `.aidlc/aidlc-rules/aws-aidlc-rules/core-workflow.md`.
2. Load `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`, `common/question-format-guide.md` (under `.aidlc-rule-details/`).
3. Read `aidlc-docs/aidlc-state.md`, resume from the recorded stage.
4. Load only the rule details of the current phase.

## Rules
- Questions go in `.md` files with `[Answer]:` tags, never in chat. Stop at every gate.
- One folder per feature: `aidlc-docs/<feature>-<yyyy-mm-dd>/` with `requirements.md`, `plan.md`, `verification.md` (+ `*-questions.md`).
- Update `aidlc-state.md` at the end of every stage. `aidlc-docs/audit.md` is session-local (git-ignored).
- Patterns borrowed from Shell Console (`joint/shellconsole`): plan/feature matrix as data, paywall blur, RBAC module, admin data views. Borrow structure, never names or content.

## Depth
- Small fix: construction only, still tested and verified.
- Feature: one-page inception + construction.
- Cross-cutting (auth, RBAC, billing, analytics/consent): full inception, security extension on.

## Definition of done
Rust `cargo test` + frontend typecheck/build green in Docker; tunables in `docker/.envs/app.env.example`; UI words in `src/lang/{en,bn}.ts`; errors JSON with request id; verified in the browser at desktop + mobile, light + dark.

# AI Agents Guide & Autonomous Workflows

> **Status:** Active / Authoritative Baseline  
> **Target Environment:** Antigravity 2.0 / Multi-Agent Coding Framework  
> **Skill Directives:** `google-antigravity-sdk`, `agy-customizations`, `modern-web-guidance`  
> **Last Updated:** October 2026

---

## 01 Overview

This guide defines how autonomous AI agents collaborate on the A11ytica Pro (`accessibility-auditor`) codebase. By specifying clear roles, tooling boundaries, verification protocols, and safety guardrails, multiple autonomous agents can execute parallel features, refactors, and audits without collisions or regressions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR / ROOT AGENT                       │
│    Receives user intent · Formulates plan · Dispatches subagents       │
│                                    │                                   │
│          ┌─────────────────────────┴─────────────────────────┐         │
│          │                                                   │         │
│          ▼                                                   ▼         │
│ ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ │   CODE AGENT     │       │    DOCS AGENT    │       │    TEST AGENT    │
│ │ Implements logic │       │ Updates PRD, DB, │       │ Validates types, │
│ │ & React UI       │       │ Arch & API specs │       │ runs builds & QA │
│ └──────────────────┘       └──────────────────┘       └──────────────────┘
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02 Specialized Agent Roles

| Agent Role | Primary Purpose | Key Tools & Skills | Trigger & Scope |
| :--- | :--- | :--- | :--- |
| **Architect / Code Agent** | Implement features, refactor routes, optimize database queries | `view_file`, `replace_file_content`, `run_command`, `design-taste-frontend` | On-demand for feature requests, bug fixes, or performance tuning. |
| **Documentation Agent** | Maintain synchronization between code, schemas, PRD, and docs | `write_to_file`, `replace_file_content`, `impeccable` | Triggered after every structural code change, schema update, or API modification. |
| **Testing & QA Agent** | Run TypeScript type checks, verify builds, test edge cases | `run_command` (`npx tsc`, `npm run build`), `a11y-debugging` | Pre-merge verification, regression testing, self-accessibility audits. |
| **Security & Compliance Agent**| Audit SSRF defenses, verify RLS policies, ensure ADA legal defense | `view_file`, `grep`, `run_command` | Triggered on changes to `/api/scan`, database migrations, or legal terms. |
| **DevOps & Infrastructure Agent**| Manage Supabase migrations, Edge Functions, environment configs | Supabase CLI, Vercel configuration, Deno runtime | Deployments, Edge Function updates, database migrations. |

---

## 03 Standard Agent Workflow

```
1. Task Received
   └── Read prompt, parse requirements, identify target files and skills.

2. Context Gathering
   └── Inspect package.json, types.ts, database schema, and relevant routes. Never assume libraries exist.

3. Plan & Verification Gate
   └── Formulate step-by-step implementation plan. Identify edge cases (timeouts, SSRF, quota caps).

4. Implementation (Code / Docs)
   └── Apply surgical edits via replace_file_content or write_to_file. Adhere to CODE_STYLE.md.

5. Rigorous Verification
   └── Run `npx tsc --noEmit` and `npm run build`. Never report completion with broken compilations.

6. Documentation Synchronization
   └── Update docs/PRD.md, docs/ARCHITECTURE.md, or docs/DATABASE.md if features or schemas changed.
```

---

## 04 Example Prompt Template for Agents

```markdown
Role: Code Agent
Task: Implement batch URL scanning endpoint in `/api/scan/batch`
Requirements:
1. Accept an array of up to 5 URLs in request body.
2. Verify user has 'agency' tier; reject 'free' and 'pro' users with 403 Forbidden.
3. Validate each URL against the production SSRF blacklist (lib/scanner.ts or app/api/scan/route.ts).
4. Atomically deduct quota using `lib/quota.ts`.
5. Dispatch asynchronous jobs to Supabase Edge Function `scan-site`.
6. Maintain strict TypeScript types in `lib/types.ts`.
7. Verify compilation with `npx tsc --noEmit`.
8. Update `docs/API.md` and `docs/PRD.md` with the new endpoint schema.
```

---

## 05 Tooling & Environmental Access

AI agents operating in this workspace have access to:

1. **Local File Operations:** `view_file`, `write_to_file`, `replace_file_content`.
2. **Terminal Execution:** `run_command` (Sandboxed by default; unsandboxed when invoking node/npm).
3. **Task Management:** `manage_task` (monitor background Next.js build jobs, kill stuck processes).
4. **Skills Integration:**
   * `design-taste-frontend`: For UI/UX styling, motion spring tokens, and anti-slop rules.
   * `a11y-debugging`: For WCAG 2.2 auditing, keyboard trap checks, and contrast audits.
   * `modern-web-guidance`: For modern Web APIs and Next.js 16 best practices.

---

## 06 Best Practices for AI Agents

1. **Check Before Importing:** Always check `package.json` before importing third-party modules (`lucide-react`, `zustand`, `framer-motion`). Never hallucinate packages.
2. **Never Break RLS:** When creating database migrations, always include `alter table ... enable row level security` and explicit `create policy` statements.
3. **Preserve Comments:** Do not wipe out architectural comments, docstrings, or legal disclaimer headers.
4. **Isolate Client Components:** In Next.js App Router, keep the top-level route as a Server Component. Add `'use client'` only at the leaf interactive component.
5. **No Emojis:** Strictly observe the Anti-Emoji policy in production code and UI text.

---

## 07 Safety Guardrails & Limitations

* **Secret Key Protection:** Never print, log, or hardcode private environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`).
* **Production Sandbox Isolation:** Local development Puppeteer instances must not run against internal production databases.
* **No Premature Claims:** Never claim a website or product is "100% WCAG Compliant." Automated scans only evaluate automatable criteria (~30–50%).
* **Database Migration Safety:** Never execute `drop table` or destructive column alterations without explicit migration scripts and confirmation.

---

## 08 Future Multi-Agent Roadmap

1. **Autonomous PR Reviewer Agent:** A GitHub Action bot running Antigravity that evaluates incoming pull requests against `docs/CODE_STYLE.md` and `docs/DESIGN_SYSTEM.md`.
2. **Self-Healing Accessibility Bot:** An agent that continuously scans customer staging URLs, automatically identifies failures, forks the customer's repo, and opens a Pull Request with the AI-suggested fix.
3. **Multi-Agent Consensus Verification:** Running two independent AI auditor models (e.g. Gemini 3.8 and Claude 3.7) to cross-verify accessibility remediation code before presenting it to the user.

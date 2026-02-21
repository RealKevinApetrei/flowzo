# Teammate Claude Code SOP Setup Prompt

Copy the prompt below and paste it into your Claude Code session for the flowzo repo. Replace `[YOUR LETTER]` with your member letter (A, B, or D).

---

## Prompt to paste:

```
Read PRD.md and identify my role as Member [YOUR LETTER]. Then set up an automated SOP for me by doing these two things:

### 1. Create a user-local CLAUDE.md

Create a file at `~/.claude/projects/-Users-$(whoami)-Desktop-flowzo/CLAUDE.md` (run `whoami` first to get the correct path, and check what the existing project path is under `~/.claude/projects/` since it encodes the repo's absolute path).

The file must contain these rules:

**SCOPE GUARD (strict):**
- Define which files/directories are IN SCOPE for my role based on PRD.md section 6.
- Define which files are OUT OF SCOPE.
- REFUSE any edit to out-of-scope files. Warn with: "This file is outside Member [X]'s scope. [Member Y] should handle this."
- If my task requires a change outside my scope, explain what's needed and tell me to ask the responsible teammate.

Use this scope mapping:
- Member A (Pipeline): `supabase/`, `apps/web/lib/` (server utils, API helpers), `apps/web/app/api/` (API routes), `packages/shared/`, seed data files
- Member B (Data Science): `apps/web/app/data/` (data pages), `apps/web/components/data/` (data viz components), data analysis scripts, dataset files
- Member D (Infra/Pitch): `.github/`, root config files (`turbo.json`, `vitest.config.*`, `playwright.config.*`), `apps/web/lib/` (test files only), pitch/docs files

**AUTO PRD UPDATE (after every code-changing prompt):**
- After every prompt where files are edited/written/created (excluding PRD.md itself), update PRD.md.
- ONLY touch MY member section's task table (between my `### Member X` header and the next `### Member` header).
- Update task statuses: mark `DONE` if completed, `IN-PROGRESS` if partially done, keep `TODO` if not started.
- Add new tasks from the current prompt as new rows with appropriate status.
- Add logical next-step suggestions as new rows with status `SUGGESTED`.
- Never delete existing rows. New rows go at the bottom.
- Table format must have 4 columns: `| Task | Priority | Est. | Status |`
- At the end of every code-changing response, print: `PRD Updated: [X tasks DONE, Y new tasks, Z suggestions]`

**COMMIT FORMAT:**
- Use the branch prefix from PRD.md for my role.
- Commit message format: `feat(<area>): <short description>` with a line `Member [X] — <role title>`

### 2. Add Status column to my PRD section

Edit PRD.md and add a `| Status |` column to my member's task table. Set all existing tasks to `TODO`. Don't touch any other member's section.

If Member C's table already has a Status column, use the same format.

After setup, confirm what was created and show me my scope boundaries.
```

---

## Who uses what:

| Member | Role | Scope |
|---|---|---|
| A | Data Pipeline & Integrations | `supabase/`, `apps/web/lib/`, `apps/web/app/api/`, `packages/shared/` |
| B | Data Science & Analytics | `apps/web/app/data/`, `apps/web/components/data/`, data scripts |
| C | Frontend & UX (already set up) | `apps/web/app/`, `apps/web/components/`, `apps/web/styles/`, `apps/web/public/` |
| D | Infrastructure, Demo & Pitch | `.github/`, root configs, test files, pitch/docs |

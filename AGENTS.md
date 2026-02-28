# AGENTS.md

## Intent
- This file guides autonomous coding agents working in this repository.
- It is repository-specific and should be preferred over generic agent defaults.
- Make small, targeted changes and preserve existing architecture.
- Do not modify `backend/node_modules/`.

## Repository Layout
- Root contains static frontend pages and shared client scripts.
- `script.js` is the primary shared frontend logic file.
- `style.css` is the primary stylesheet for most pages.
- `backend/` contains a Node.js + Express API and PostgreSQL access.
- `backend/server.js` defines routes and server startup.
- `backend/db.js` creates the PostgreSQL pool.
- `backend/database.json` is sample/local JSON data, not the live DB source.

## Environment Assumptions
- Backend API runs on `http://localhost:3000`.
- Frontend uses `const API = "http://localhost:3000"` in client code.
- PostgreSQL is expected locally with database name `mkulimalink`.
- Credentials are currently hardcoded in `backend/db.js` (treat as sensitive).

## Install, Run, and Dev Commands
- Install backend dependencies:
```bash
npm --prefix backend install
```
- Start backend server:
```bash
npm --prefix backend start
```
- Open frontend quickly by opening `index.html` directly, or run a static server:
```bash
python -m http.server 5500
```
- Then browse to:
```text
http://localhost:5500/index.html
```

## Build, Lint, and Test Commands
- Build command: none configured.
- Lint command: none configured.
- Optional syntax checks:
```bash
node --check backend/server.js
node --check script.js
```
- Project test command in `backend/package.json` is currently a placeholder and fails intentionally:
```bash
npm --prefix backend test
```

## Single Test Execution (Important)
- There is no active test runner in this repo yet, so true single-test execution is not available today.
- If you add tests with Node's built-in runner, run one file with:
```bash
node --test backend/tests/<name>.test.js
```
- Run one named test (Node test runner):
```bash
node --test backend/tests/<name>.test.js --test-name-pattern "<test name>"
```
- If you introduce Jest or Vitest, update this section immediately with exact commands.

## Import and Module Style
- Backend uses CommonJS only: `require(...)` and `module.exports`.
- Keep imports at top-level, before route or function definitions.
- Import order should be: built-in modules, third-party modules, local modules.
- Use one declaration per import for readability.
- Do not switch file style to ESM unless requested project-wide.

## JavaScript Formatting Conventions
- Follow existing style in touched files.
- Use 2-space indentation in JS, HTML, and CSS.
- Keep semicolons in JavaScript statements.
- Prefer double quotes for strings in JS, matching existing files.
- Keep trailing commas only where already present.
- Avoid unrelated file-wide reformatting.
- Keep section comments only for meaningful blocks.

## Naming Conventions
- Variables and functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` when truly constant.
- HTML IDs/classes follow existing kebab-case patterns.
- API routes remain lowercase and path-segment based.
- Keep DB table names lowercase (`users`, `produce`, `orders`).
- Preserve existing DB column spellings unless migration is requested (`idnumber`, `croptype`).

## Types and Data Handling
- Repository is JavaScript-only; do not add TypeScript by default.
- Validate required fields early in route handlers.
- Use explicit number parsing and validation for numeric inputs.
- Normalize phone numbers through `normalizePhone(...)` where relevant.
- Use `null` for optional DB fields when absent.
- Keep response shapes stable for frontend compatibility.

## Error Handling Standards
- Wrap async route logic in `try/catch`.
- Return consistent status codes (`400` validation, `401` invalid credentials, `403` forbidden, `500` server errors).
- Return error payloads as JSON object with `message` key.
- Log server errors with contextual prefixes (for example, `REGISTER ERROR:`).
- Do not expose stack traces or secret values in API responses.

## SQL and Database Rules
- Always use parameterized SQL (`$1`, `$2`, ...).
- Never concatenate user input into query strings.
- Keep DB writes and reads consistent with existing schema names.
- Reuse `pool` from `backend/db.js`.
- Prefer small, explicit query statements over dynamic SQL.

## Frontend-Specific Rules
- `script.js` is loaded on multiple pages; guard DOM access with null checks.
- Keep global functions available when HTML uses inline `onclick` handlers.
- Use `fetch` with JSON headers for API calls.
- Always handle non-OK responses and show user-safe messages.
- Preserve `localStorage` key `user` unless doing coordinated migration.
- Avoid introducing frameworks, build steps, or module loaders without request.

## Security and Secrets
- Never commit real API keys, DB passwords, tokens, or personal data.
- Move sensitive config to environment variables when touching related code.
- Treat hardcoded credentials in current files as technical debt.
- Avoid adding logs that leak phone numbers, IDs, or credentials.

## Known Project Quirks
- `admin.html` currently references `script.js`, not `admin.js`.
- Some backend and frontend fields use mixed naming (`cropType` vs `croptype`).
- Keep compatibility with existing naming unless intentionally refactoring both sides.
- There is no `.gitignore` file; be careful not to add machine-specific artifacts.

## Cursor and Copilot Rules
- Checked for `.cursorrules`: not found.
- Checked for `.cursor/rules/`: not found.
- Checked for `.github/copilot-instructions.md`: not found.
- If any of these files are added later, follow them and update this document.

## Change Workflow for Agents
- Read related files before editing.
- Keep diffs small and task-focused.
- Do not refactor unrelated areas in the same change.
- After edits, run available checks and basic manual validation.
- If you add tooling (lint/tests/build), document commands here.

## Validation Checklist Before Handoff
- Backend starts successfully with `npm --prefix backend start`.
- Edited JavaScript passes `node --check` where applicable.
- Frontend pages touched still load in browser without console-breaking errors.
- API contract changes are mirrored in frontend usage.
- This `AGENTS.md` remains accurate after your change.

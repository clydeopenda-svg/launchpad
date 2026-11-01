@AGENTS.md

# LaunchPad — working rules

LaunchPad is an event check-in, live polling and Gemini assistant app (Next.js, SQLite via libSQL/Turso, deployed on Vercel). The goal is a finished, professional project suitable for a developer portfolio and a real-world demo. Follow these rules on every change.

## Comments
- Comment important logic, complex functions, API interactions and key decisions.
- Explain *why* when it isn't obvious from the code. Don't comment obvious code.
- Keep comments professional and useful to the next developer.

## Understand before modifying
- Inspect the project structure and existing implementation before changing anything.
- Don't assume files, features or config exist — check.
- Preserve working functionality.

## Complete, don't rebuild
- Find and finish unfinished functionality; fix existing problems before adding features.
- Don't rewrite working components without a good reason.
- Avoid unnecessary dependencies.

## Testing and quality
- Test what you implement. Check for broken imports, wrong API calls and console errors.
- `npm run typecheck`, `npm run lint` and `npm run build` must pass.
- Never claim something works without verifying it. Never hide errors or ignore failing checks.

## Documentation
- Keep README.md current: setup, dependencies, environment variables (see `.env.example`) and features.

## Discipline
- Work one logical task at a time, and explain what you change and why.
- Keep Git commits meaningful and descriptive.

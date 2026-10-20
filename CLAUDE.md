# Project instructions

## Git

- Never commit, amend, push or otherwise change git history without explicit approval from the user. Make the changes, summarise them, and ask before committing.
- Do not stage or commit the user's own uncommitted edits.
- After finishing a change, give the user a ready-to-use commit message. Keep it brief and plain: a short summary line, then a few lines on what changed and why only if it isn't obvious. No fluff, no attribution trailers.

## Requirements

- Always confirm the approach with the user before writing any code. Make sure you understand the requirements first, ask clarifying questions where details are unclear, and push back if something looks like a bad idea or conflicts with existing behaviour.

## Code style

- Names should say what a variable or function does, so the code explains itself. If a function can't be named succinctly, it is probably doing too much: split it. Don't go the other way either: a single-line calculation is a well-named variable, not a function.
- Don't write comments that restate the code. Use short comments for context the code can't carry: how something works, or why this approach was chosen over another.

## Errors

- Don't swallow errors unnecessarily: observability matters. If an error has to be caught, catch it as specifically as possible, log it, and consider rethrowing it anyway.

## Tooling

- Use pnpm (not npm or yarn).

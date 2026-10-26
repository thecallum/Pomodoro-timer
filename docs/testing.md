# Testing approach

A working outline. We expect to change it as we learn what works.

## Layers

1. **Unit tests**: lots of them, one area at a time.
   - Pure logic in `src/lib/` (timer, sessions, settings, appearance).
   - Hooks in `src/hooks/`, using `renderHook` and fake timers.
2. **Integration tests**: fewer, checking that pieces work together.
   - Render a page or the app and interact as a user would.
   - Example: open settings, change the volume, check it is persisted to localStorage.
3. **E2E tests (Playwright)**: a handful, added later.
   - Critical paths only: complete a focus session and see stats update, settings persist across reload, theme persists.
   - Not planned yet. Decide how to run them (locally only, or in CI) when we get there.

## Tooling

- Runner: Vitest (`pnpm test`).
- Components and hooks: React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`.
- DOM environment: jsdom (revisit happy-dom if speed matters).
- Time: `vi.useFakeTimers()` for anything time-based.

## How we work with the AI

- The human defines **what** to test, as plain-English behaviours. The AI writes the **how**.
- Process: agree a list of behaviours for a module, edit it, then the AI writes the tests.
- Unit tests are organised per function or hook: one `describe` named after the exported function (`describe('start', ...)`), with each `it` describing one behaviour of that function. A test must be about the function it sits under. Other functions may be used to set up state, but not to assert on. A test that exercises several functions together belongs in an integration test.
- Test behaviour, not implementation. Query by role and text. Don't mock our own modules unless necessary.
- Check that tests can fail: temporarily break the code and confirm the relevant test goes red.
- If a test fails, report whether the code or the test is wrong. Never silently change an assertion to make it pass.
- Bug found: write a failing test that reproduces it first, then fix.
- No snapshot tests. Treat coverage numbers as a way to find gaps, not as a target.

## Suggested order

1. Install RTL and jsdom, and configure Vitest.
2. Hook tests: `useTimer`, `useSessions`, `useSettings`.
3. Integration tests for `TimerPage` and `SettingsPage`.
4. Playwright E2E.
5. Move the conventions that prove useful into CLAUDE.md.

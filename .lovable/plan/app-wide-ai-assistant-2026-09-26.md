# App-wide AI Assistant

## Goal
Turn the existing text-only assistant into a secure, app-aware assistant that can answer questions about live application data and carry out supported workflows across candidates, vacancies, advertising, integrations, matching, and onboarding.

## User experience
- Keep one conversation in memory while the assistant is open, so follow-up questions retain context.
- Do not save chat history or create conversation records.
- Stream answers into the chat and render markdown.
- Show tool activity compactly inside the conversation, including successful and failed reads/actions.
- Before any data-changing action, show: **“Are you sure you want to make these edits?”** with **Yes** and **No** buttons.
- Reads and explanations run immediately; writes only run after explicit Yes.
- Keep the assistant available from the bottom-right trigger throughout staff pages.

## App capabilities
### Candidates
- Find, filter, and summarize candidates from Growth Accelerator and connected sources.
- Show candidate details relevant to a question.
- Add or edit a candidate after confirmation.
- Start a matching workflow for a selected candidate after confirmation.

### Vacancies and job posting
- Find and summarize existing vacancies.
- Draft vacancy content without changing data.
- Create or edit a vacancy after confirmation.
- Explain the current posting state and relevant integration errors.

### Matching
- Compare candidates with vacancies using existing candidate and job data.
- Explain strengths, gaps, and recommended matches.
- Create or delete a recent match after confirmation.
- Avoid invented scores or records when source data is missing.

### Onboarding
- Find matched candidates eligible for onboarding.
- Read onboarding pipeline status.
- Start onboarding, send the welcome email, or create an account only after confirmation.
- Report the actual result of each email/account action.

### Advertising and LinkedIn Recruiter
- Read LinkedIn connection status, ad accounts, campaigns, and available Recruiter data.
- Explain setup and connection problems using real status/error data.
- Help prepare advertising content without spending or publishing automatically.
- Require confirmation for syncs or other supported mutations; clearly state when LinkedIn permissions prevent an action.

### Integrations
- Read connection and sync status for ATS, Recruitment, Data Enrichment, Custom Integration, and Backoffice tools.
- Explain configuration failures from safe error details.
- Trigger a supported sync or record update only after confirmation.
- Never expose stored API keys, tokens, or secrets to the model or browser.

## Security and access
- Authenticate every assistant request and restrict assistant use to server-verified staff.
- Execute data operations with the signed-in user’s permitted scope; do not bypass staff boundaries for reads.
- Define a small allowlisted tool set with validated inputs instead of accepting table names, SQL, arbitrary URLs, or arbitrary function names.
- Keep mutations separate from reads and enforce server-side confirmation tokens, so a forged browser request cannot skip approval.
- Add audit records for confirmed assistant mutations without storing conversation text or secrets.
- Harden any reused integration function that currently lacks an internal authentication/role check before exposing it to the assistant.

## Credit controls
- Move the assistant from direct Anthropic billing to Lovable AI Gateway using `openai/gpt-6-astra` and low reasoning effort.
- Send complete in-session history for follow-up questions, but cap message size and retain only the recent relevant window plus compact tool results.
- Keep database results narrow: select only needed columns, cap result counts, and return summaries before requesting detailed records.
- Use deterministic server tools for reads and writes; use AI only for intent, reasoning, and natural-language responses.
- Avoid automatic retries except bounded backoff for rate limits or temporary server errors.
- Do not make background AI calls, speculative calls, or a second model call when one tool-driven turn can finish the task.
- Surface credit, access, and provider errors directly instead of generating a fallback answer.

## Technical implementation
- Replace the current buffered custom chat request with AI SDK streaming through the existing Supabase Edge Function boundary.
- Add the required AI Elements conversation, message, prompt, loading, and collapsed tool components while preserving the app’s visual system.
- Implement server-side OpenAI Responses tool calling with stateless inline history, `store: false`, encrypted reasoning continuity, request cancellation, and gateway run-ID propagation.
- Add validated, domain-specific tools backed by existing tables/functions, with consistent result objects and safe row limits.
- Add a two-step mutation protocol: propose action → return approval request → execute only when the matching approval is confirmed.
- Normalize current candidate/job/match/onboarding data access behind shared server helpers and preserve existing RLS rules.
- Update the assistant instructions so it answers only from tool results for app data and never claims an action succeeded without a successful result.
- Record the new assistant boundary and approval architecture in the project architecture rules.

## Verification
- Verify the AI Gateway model with a live authenticated request before completion.
- Test an ordinary follow-up conversation and confirm no history survives a reload.
- Test at least one read in every domain: candidate, vacancy, match, onboarding, LinkedIn/advertising, and integrations.
- Test a confirmed create/edit flow and a rejected flow; confirm No performs no mutation.
- Test unauthorized and non-staff access to ensure no application data is returned.
- Verify credit/rate-limit errors are visible and do not cause duplicate requests.
- Inspect the assistant at desktop and mobile sizes, including streaming, tool details, and the Yes/No approval state.
- Check the final preview build and runtime logs.

# Chat, AI Matching, Candidates, Vacancies, and Employee Portal

## What will change

- Restore the AI Assistant’s previous visual interface from the attached reference while keeping the newer secure streaming, live-data tools, and approval safeguards.
- Fix vacancy actions so they open the selected job vacancy, never a candidate/application page. Local vacancies will stay inside the app instead of opening a meaningless `#` link.
- Add **AI Matching** directly below **Matching** in both navigation areas.
- Add a job selector and a ranked top-10 candidate list with clear fit scores and reasons.
- Let the assistant answer “best candidates for this job” using the same ranked results.
- Make the Candidates source filter include candidates and contacts from connected sources such as Apollo, JazzHR, JobAdder, LinkedIn Recruiter, and Workable—not just whichever source loaded first.
- Replace the employee portal flow with a dedicated `/portal` sign-in and a single Backoffice experience.
- Remove the employee contract and hour-registration pages and all links to them.
- After employee sign-in, show or open that signed-in user’s own connected Backoffice provider. If none is connected, show the financial-provider connection choices on that same page.

## AI Matching behavior

Candidate fit will be calculated on demand from the existing vacancy and candidate data:

- required and overlapping skills
- current role versus vacancy title
- relevant terms in the vacancy and candidate profile
- experience level
- location/work arrangement compatibility
- profile completeness

The page will show the top 10 in descending order with a transparent score and matching reasons. Rankings will not be stored, so they always reflect current data and do not require extra database tables. Creating a real match remains a separate explicit action.

## Employee access and privacy

- `/portal` will be employee-only and show its own sign-in screen when signed out.
- Staff sign-in and staff pages remain separate.
- Each employee can only read and manage their own Backoffice connection settings.
- The portal will not expose staff navigation, candidates, contracts, onboarding, or another user’s integrations.
- Existing staff Onboarding remains available; only the old employee contract route is removed.

## Technical details

- Reuse a shared, bounded ranking function in the AI Matching page and the assistant tool so results stay consistent and low-cost.
- Merge normalized source records into the Candidates screen and deduplicate them by email/external identity.
- Preserve source labels during import so every connected source appears in the filter.
- Correct Workable vacancy URL selection and add safe internal handling for local vacancies.
- Keep all AI calls server-side with the existing staff authorization and mutation approvals.
- Update routing and navigation for `/ai-matching` and the simplified employee portal.
- Verify desktop/mobile chat appearance, vacancy actions, source filtering, top-10 ranking, assistant ranking answers, and employee sign-in/backoffice access.

# Freelancer placements, timesheets and self-billing

## What you'll get

1. **Placement Overview on the Dashboard**
   - A table of active placements showing freelancer, client, project, start and end date, buy rate, sell rate and margin.
   - **Expiry radar:** placements ending within 30, 60 or 90 days, colour-coded, with an "Extend" action.

2. **Availability and status tags on candidates**
   - New fields: available from (date), target hourly rate, and a status tag (Available, On assignment, Available soon, Not available).
   - The tag appears on Candidates, Matching and AI Matching. When a placement ends, the tag becomes "Available soon".

3. **AI Matching prioritisation**
   - The shared score adds points when a person's availability date fits the vacancy start date and their target rate fits the budget.
   - People who are "Not available" or "On assignment" rank lower. The assistant uses the same scoring.

4. **Employee portal: two buttons after login**
   - After logging in, employees see **Hourly registration** and **Backoffice**.
   - Hourly registration brings back the multi-day hours entry. Employees only see their own hours.
   - **Upload signed timesheet:** employees can attach a PDF or photo of the client's signed timesheet to a week or month.
   - **Request confirmation:** a Resend email with the hours overview goes to the client's hiring manager.

5. **One-click hiring manager sign-off**
   - The email contains a secure **Approve** button and a **Reject** button. The link is single-use and expires, and no login is needed.
   - After approval, the hours are locked as approved and you get a copy of the overview.

6. **Self-billing invoice (PDF)**
   - Approved hours automatically create a self-billing invoice in the freelancer's name. It uses the buy rate, VAT and the freelancer's company and VAT details.
   - The PDF can be downloaded by the freelancer in the portal and by staff in Hire.

7. **Auto-push to backoffice**
   - On approval, the hours and the invoice are sent automatically to the connected backoffice. This works now for the Custom Integration webhook.
   - Exact Online, AFAS and the other named systems still need their own authorization, as before.

8. **Security fix (required)**
   - Right now, any signed-in person can view, change or delete every placement record, including salary details. Only staff will have access from now on.

## Open points for you
- Default VAT for self-billing (21%, or reverse-charged for each freelancer).
- Hiring manager contact per placement: I'll add name and email fields to each placement.

## Technical details
- Migration:
  - Extend `local_placements` with `buy_rate`, `sell_rate`, `hiring_manager_name/email`, `employee_user_id` and `project`.
  - Replace its `USING (true)` policies with `is_staff(auth.uid())`, and let employees read their own row.
  - Add `candidates.available_from`, `target_rate` and `availability_status`.
  - Add `timesheets` (period, placement, status, attachment path, approval token hash, approved_at/by) and link `time_entries.timesheet_id`.
  - Add `invoices` (number sequence, totals, pdf path).
  - Private buckets: `timesheets` and `invoices`.
- Edge functions:
  - `request-hours-approval`: builds the overview, creates a hashed token and sends it through Resend.
  - `approve-timesheet`: a public endpoint that checks the token, approves the hours, generates the PDF with pdf-lib and pushes it to the backoffice webhook.
- Routes: `/portal` shows the two buttons, plus `/portal/hours` and `/portal/backoffice`. Also update `candidateMatching.ts` and `myowncopilot-chat`.

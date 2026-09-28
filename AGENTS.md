# Architecture rules

- Staff pages require a server-backed Workable role; authenticated accounts without staff or employee assignment go to the pending-access page to prevent data exposure.
- Integration categories are ATS, Recruitment, Data Enrichment, and Custom; financial systems live separately in Backoffice.
- The recruitment assistant uses the server-held Lovable AI Gateway with an allowlisted, staff-authorized tool layer; conversations stay in memory only, reads are bounded and secrets are sanitized, and every mutation requires a signed user approval before execution.
- Candidate recommendations use one deterministic, on-demand scoring model across AI Matching and the assistant so rankings remain explainable and are never persisted.
- The employee portal exposes only the Backoffice provider configured by the employee's creating staff account; provider credentials never reach employee clients.
- Timesheet approval uses single-use hashed tokens handled by the public `approve-timesheet` function via the `/timesheet-approval` app page; only the server writes invoices (self-billing PDFs, pdf-lib) so amounts can't be forged.

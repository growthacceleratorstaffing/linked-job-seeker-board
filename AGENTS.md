# Architecture rules

- Staff pages require a server-backed Workable role; authenticated accounts without staff or employee assignment go to the pending-access page to prevent data exposure.
- Integration categories are ATS, Recruitment, Data Enrichment, and Custom; financial systems live separately in Backoffice.
- The recruitment assistant uses the server-held Lovable AI Gateway with an allowlisted, staff-authorized tool layer; conversations stay in memory only, reads are bounded and secrets are sanitized, and every mutation requires a signed user approval before execution.

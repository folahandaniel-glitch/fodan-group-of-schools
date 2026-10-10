# Known gaps and how to close them

Verified: unit tests (24), local end-to-end checks (registration, parent linking, CBT attempt, scoring, promotion,
teacher transfer, lesson workflow, ★ import, 43 pages × 8 roles, authorisation/IDOR suite), production build,
production deployment smoke test.

Not verified or not built:

| Item | State | To finish |
| --- | --- | --- |
| Email (Resend) and WhatsApp delivery | Code path present, **OFF** | Set `RESEND_API_KEY`, `MAIL_FROM` (verified domain) and a WhatsApp provider `WHATSAPP_API_URL` / `WHATSAPP_API_TOKEN`. Submissions are always stored and visible in the backend. |
| OCR for scanned PDFs | Not built | Add an OCR provider; text-based PDFs, Word, Excel and PowerPoint already import. |
| Push / SMS notifications | In-app only | Add a provider behind `notifications`. |
| File storage | Files live in PostgreSQL (4 MB limit, type + magic-byte checks) | Move to object storage (S3 / R2 / Vercel Blob) and add malware scanning for larger media. |
| Real-time dashboards | Fresh on every load | Add polling or server-sent events. |
| Staff performance | Data captured (lessons, assessments, audit); no dedicated review page | Build a staff-performance report over `lesson_notes`, `assessments`, `attendance`. |
| Excel/PDF export | CSV export and print-to-PDF | Add xlsx writer if required. |
| Mobile apps | Not built | Expose the domain functions as a REST/RPC API, then build Expo clients. |
| AI assistance | Feature flag only (AI content must start as PENDING_REVIEW) | Integrate a model provider. |
| Payments / fees | Not built (per specification) | Paystack / Flutterwave behind a payments module. |
| Cross-browser matrix, automated accessibility scan | Chromium only | Run Playwright + axe in CI. |
| Bulk student import | Single enrolment only | CSV/Excel enrolment importer. |
| Multi-school UI | Schema is tenant-aware (`school_id`); UI serves one school | School switcher and per-school branding. |

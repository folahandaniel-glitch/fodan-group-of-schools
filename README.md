# Fodan Group of Schools — School Portal

Public website, student / parent / staff portals, CBT engine, results and report cards for
**Fodan College International** (principal school of Fodan Group of Schools).
*Learn. Practise. Test. Improve.*

Next.js 16 (App Router, server actions) · React 19 · TypeScript · Tailwind 4 · PostgreSQL (Neon) · Vercel.

## What is in the box

| Area | Status |
| --- | --- |
| Public site (editable from backend: hero, about, founder, programmes, facilities, news, FAQ, contact, social) | Built |
| Student registration with long-lived access code · parent registration · secure parent↔student linking | Built |
| Roles + granular, server-enforced permissions (editable matrix) · role hierarchy · audit log (append-only) | Built |
| Students, staff, classes, subjects, departments, class teachers, teacher transfers, promotion with full history | Built |
| Lesson notes (draft → submitted → reviewed → approved → published) | Built |
| Question bank, ★ answer import from Excel / Word / PowerPoint / text PDF, review workflow, copyright metadata | Built |
| Assignments (10) · CA tests (30) · terminal exams (60) · weights/grades/comments editable · CBT with server timer, autosave, randomisation | Built |
| Mock centre (Common Entrance, BECE, NECO, WAEC, JAMB, international) with eligibility rules | Built |
| Results, mark sheet, report cards (print/PDF), certificates with QR verification | Built |
| Study centre, resources (files + validated links), timetable with clash checks, attendance, calendar, announcements, notifications | Built |
| Analytics (class, subject, department, grade distribution) · CSV export | Built |
| PWA (manifest, icons, offline shell, install prompt incl. iOS instructions) | Built |
| Super Admin 2FA (TOTP + recovery codes), Argon2id, rate limiting, lockout, security headers | Built |

## Honest limits (see `docs/KNOWN_GAPS.md`)

Email and WhatsApp notifications are **off until credentials are supplied**. OCR for scanned PDFs, SMS, push
notifications, payments, AI generation and the React Native app are architecture-ready only.

## Local development

```bash
npm install
npm run assets            # regenerate brand assets from assets-source/
npm run dev:db            # embedded PostgreSQL on :5433 (in memory)
cp .env.example .env.local   # fill DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres, AUTH_SECRET, SUPERADMIN_*
npm run build && npx next start -p 3200
npm test                  # unit tests
node scripts/seed-demo.mjs && node scripts/smoke.mjs && node scripts/security-test.mjs   # local-only checks
```

The schema is applied automatically on first request. The first Super Admin is created from
`SUPERADMIN_EMAIL` + `SUPERADMIN_BOOTSTRAP_PASSWORD` (forced password change and mandatory 2FA).

## Environment

See `.env.example`. Secrets live only in Vercel / local `.env.local`; nothing sensitive is committed.

## Design notes

* All authorisation is server-side (`requirePerm`, per-record scope checks) — UI hiding is cosmetic.
* Passwords: Argon2id; never returned, logged or shown. Administrators issue one-time reset links.
* Access codes: 75-bit CSPRNG, stored as keyed hash + AES-GCM ciphertext (viewable only with `access_codes:view`).
* Scoring: raw → proportional contribution (`normalise`), weights/grades/comments are settings.
* Every table carries `school_id`, ready for additional schools under the group.

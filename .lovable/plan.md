# Winvision App Audit & Growth Roadmap

Based on a review of the codebase (50+ pages, Supabase backend, Capacitor mobile, MR + Admin roles, Daily Working, Orders, Doctors, Pharmacies, Distributors, Targets, Incentives, FY Reporting), here is an honest assessment plus a prioritized plan.

---

## 1. What's already strong

- Solid role-based architecture (Admin / MR) with RLS and `user_roles` table.
- Mobile-ready (Capacitor), GPS proximity check, offline sync queue.
- Rich domain coverage: Doctors, Pharmacies, Distributors, Orders, Samples, Targets, Tour Plan, Incentives, FY P&L.
- Notifications, audit logs for stock, area-doctor approval workflow.

---

## 2. Usability problems (why it feels "hard" today)

```text
Problem                                  Impact on MR / Admin
---------------------------------------  --------------------------------
14+ buttons on Index home grid            Cognitive overload, no priority
Master hub mixes 7 unrelated tools        Hard to find the right action
No global search (doctor / order / SKU)   MRs scroll long lists daily
No onboarding / empty states              New MR doesn't know where to start
Forms are long, single-column on mobile   High drop-off, slow data entry
No bulk actions (orders, doctors)         Admin spends time on repetitive ops
Reports scattered (Reporting, Monthly,    User confused which report to open
 Call, Expenses, FY, MyPerformance)
No dashboard KPIs personalized per role   Home screen is decorative, not useful
Approval workflows are passive            User doesn't know request status
Limited filters & sort on list pages      Hard to slice large datasets
No dark mode / font-size control          Field use in sunlight is painful
```

---

## 3. Missing features for a "professional" pharma CRM

### Tier A — High impact, ship first (4–6 weeks)
1. **Role-based Home Dashboard 2.0** — Today's plan, pending visits, GPS status, today's orders ₹, target % progress, quick-add FAB.
2. **Global Search (⌘K)** — fuzzy search across doctors, pharmacies, distributors, products, orders.
3. **Smart Daily Working flow** — one screen wizard: Check-in (GPS) → Doctor visit → Sample/Order → Notes → Next, instead of jumping pages.
4. **Unified Reports Hub** — single page with tabs (Sales, Calls, Expenses, Targets, FY) + date-range + export to Excel/PDF.
5. **Notifications Center** — in-app + push for: tour plan approval, delete-request status, target milestones, low stock, doctor birthday/anniv.
6. **Offline-first hardening** — show pending sync count, retry, conflict resolution UI.

### Tier B — Drives growth (next 6–10 weeks)
7. **MR Leaderboard & Gamification** — monthly ranking by calls, sales, target %, doctor coverage. Badges.
8. **Doctor 360° view** — visit history, Rx trend chart, last sample, last order, incentive paid YTD, next reminder, in one scrollable page.
9. **Geo-route optimizer** — suggest order of doctor visits by proximity to current location for the day's plan.
10. **Sales forecasting & target auto-suggest** — based on last 3 months' trend per MR / product.
11. **Doctor segmentation (A/B/C class)** — by Rx value; auto-prioritize tour planning.
12. **WhatsApp / SMS integration** — send order confirmation to distributor, birthday wish to doctor, payment reminder.
13. **Expense approval queue with policy limits** — auto-flag out-of-policy claims.
14. **Inventory low-stock alerts + reorder suggestions** to admin.

### Tier C — Scale & polish (later)
15. **Audit trail viewer** for every entity (who edited what, when).
16. **Bulk import/export** (CSV) for doctors, products, distributors.
17. **Multi-language** (English / Hindi / regional) with i18n.
18. **PDF invoice / order printout** with company letterhead.
19. **AI assistant** — "Show me top 5 doctors I haven't visited in 30 days", "Draft today's plan".
20. **Two-factor auth** for admin, session timeout, password policy.
21. **Public marketing landing page** + onboarding tutorial video.

---

## 4. UX overhaul checklist (small but high-impact)

- Replace `Index` grid with role-specific dashboard; move full menu into the existing sidebar only.
- Add **breadcrumbs** + persistent **page titles** with primary action button top-right.
- Convert long forms to **multi-step / accordion** on mobile; auto-save drafts.
- Add **skeleton loaders** + empty states with a "Add your first X" CTA on every list page.
- Add **filter chips + saved views** to Orders, Doctors, Expenses, Reports.
- Add **swipe actions** on mobile lists (call, navigate, edit).
- Standardize colors via design tokens (some pages still use raw Tailwind colors).
- Larger touch targets (44px), bigger numerals on KPI cards, sunlight-friendly contrast toggle.
- Toast → "Undo" for destructive actions instead of confirm dialogs everywhere.

---

## 5. Technical / performance improvements

- **Server-side pagination** on Orders, Doctors, Expenses (already on roadmap memory).
- **Consolidated RPC functions** to replace N+1 client queries on Dashboard & Reports.
- **React Query prefetching** on hover / route enter.
- **Image compression** on photo uploads (samples, expenses) before storage.
- **Index review** on `orders`, `daily_working`, `area_doctor_visits` for common filters (mr_id + date).
- **Error boundary + Sentry-style logging** for production.
- **PWA install prompt** in addition to Capacitor app.

---

## 6. Suggested 90-day roadmap

```text
Weeks 1–2   Home Dashboard 2.0 + Global Search
Weeks 3–4   Smart Daily Working wizard + Notifications Center
Weeks 5–6   Unified Reports Hub + Excel/PDF export
Weeks 7–8   Doctor 360° + Leaderboard
Weeks 9–10  Route optimizer + WhatsApp integration
Weeks 11–12 Bulk import/export, audit viewer, polish & QA
```

---

## 7. What I need from you before building

Please pick so I can turn this into concrete implementation plans:

1. Which **Tier A** items should I start with first? (recommend: Home Dashboard 2.0 + Global Search)
2. Do you want **WhatsApp / SMS** via Twilio, or via WhatsApp Business Cloud API?
3. Should the **Reports Hub** export to Excel, PDF, or both?
4. Any features above you want to **drop or add**?

Once you confirm, I'll produce a focused build plan for the first 2 features and we'll ship iteratively.


# Systematization Roadmap

Goal: make the app less complicated to use, faster, safer, and easier to maintain. Delivered in 4 focused phases so we ship value each release instead of one giant rewrite.

---

## Phase 1 — Simplify navigation & daily flow (UX)

The sidebar has ~30 routes; MRs get lost. We collapse into a role-aware, task-first shell.

- **Reorganize sidebar into 5 groups** (role-aware):
  - *Today* — Daily Working, Reminders, Tour Plan
  - *Customers* — Doctors, Pharmacies, Distributors
  - *Sales* — Orders, Products, Rewards
  - *Reports* — My Performance, Call/Expense/Monthly, Financial Year
  - *Admin* — Master hub, Purchases, Incentives, Targets, Working Areas, Tour Plan Requests (admin-only)
- **MR "Home" redesign**: Dashboard becomes a task list — Today's plan, Pending calls, Today's reminders, Quick actions (New order / New expense / Set next call). Remove charts MRs don't act on.
- **Unified page shell**: single `PageHeader` (title, breadcrumb, primary action, filters slot) applied to every page. Consistent empty/loading/error states via a shared `<DataState/>` component.
- **Global "+" quick-add FAB** on mobile: Order, Expense, Reminder, Sample — the 4 things MRs do daily.
- **Search everywhere**: extend `GlobalSearch` to cover doctors, pharmacies, orders, reminders with keyboard shortcut.

## Phase 2 — Performance & data loading

- **Server-side pagination + search** for the heavy lists: Orders, Doctors, Pharmacies, Reminders, Expenses (currently capped at 1000 rows).
- **Consolidated RPCs** for dashboards to replace 6–10 parallel queries: `get_mr_dashboard(user_id)`, `get_admin_dashboard()`, `get_doctor_summary(doctor_id)`. Returns everything in one round-trip.
- **Add missing indexes** after running `slow_queries` — likely on `orders(mr_id, order_date)`, `daily_working(mr_id, work_date)`, `reminders(user_id, remind_date, status)`.
- **React Query keys audit**: standardize keys, enable selective invalidation instead of refetching whole pages.
- **Route-level code splitting review** + prefetch on hover for sidebar links.

## Phase 3 — Security & RLS hardening

- Run `supabase--linter` and `security--run_security_scan`; fix every critical finding.
- **Audit every RLS policy** against the "MRs see own, admins see all" rule — use only `has_role()` / `get_current_user_role()` security-definer functions (no table self-references).
- **Tighten GRANTs**: drop `anon` on all authenticated-only tables.
- **Audit log table** (`audit_log`) with trigger on sensitive tables: orders, targets, user_roles, reward_claims, area_doctor_delete_requests. Admin-only viewer page.
- **Rate-limit + input validation** on all edge functions (`generate-reminders`, `send-reminder-push`).
- Move any remaining client-side role checks to server-side `has_role()`.

## Phase 4 — Code architecture & consistency

- **Folder restructure** by feature, not type:
  ```text
  src/features/
    doctors/  { pages, components, hooks, api }
    orders/
    reminders/
    ...
  src/shared/ { ui, hooks, lib }
  ```
- **One form pattern**: react-hook-form + zod schema per entity, shared `<EntityForm/>` wrapper. Kills duplication across DoctorForm, PharmacyForm, DistributorForm, OrderForm, ReminderForm.
- **One data-hook pattern**: `useEntityList`, `useEntity`, `useEntityMutations` generated per resource — replaces ad-hoc `supabase.from(...)` calls scattered in pages.
- **Design tokens audit**: remove any hardcoded colors, ensure everything uses semantic tokens from `index.css`.
- **TypeScript strictness**: enable `noUncheckedIndexedAccess`, fix `any` usages.
- **Docs**: single `ARCHITECTURE.md` mapping features → tables → policies → edge fns, so future changes stay consistent.

---

## Suggested order & effort

| Phase | Effort | User-visible impact |
| --- | --- | --- |
| 1. Navigation & daily flow | Medium | High — solves "complicated to use" |
| 2. Performance | Medium | High — app feels fast |
| 3. Security | Small–Medium | Low visible, high risk-reduction |
| 4. Architecture | Large | Invisible, enables faster future work |

I recommend starting with **Phase 1** since your main complaint is "complicated to use." Approve and I'll begin with the sidebar reorg + MR home redesign, then we scope Phase 2.

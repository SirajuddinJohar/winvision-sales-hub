## Problem (verified)

MR users see empty Pharmacy and Distributor lists in Orders because of the RLS policies added during the last security hardening pass:

- `pharmacies` SELECT = `is_admin() OR row exists in mr_pharmacy_assignments`. The `mr_pharmacy_assignments` table has **0 rows**, while `pharmacies` has 23 — so every MR sees zero pharmacies.
- `Distributors` SELECT = `is_admin() OR created_by = auth.uid()`. All 3 distributors were created by the admin (`created_by` is non-null for all), so MRs see zero distributors.
- `distributor_products` SELECT is chained to the same `created_by` check, so distributor product/PTR lists are empty for MRs too.

Admins are unaffected, which matches the reported symptom.

## Fix

Treat pharmacies and distributors as shared master data readable by any signed-in employee, while keeping writes restricted.

Single migration:

1. `pharmacies`: replace the SELECT policy with one allowing all `authenticated` users to read. Keep INSERT/UPDATE as-is; delete stays admin-only.
2. `Distributors`: replace the owner-only SELECT policy with an authenticated-read policy. Also drop the two stale leftover policies that were mistakenly copied from pharmacies onto this table (`Admins can view all pharmacies`, `MRs can view assigned pharmacies` — the latter joins `mr_pharmacy_assignments` on distributor IDs, which is meaningless). Admin-manage policies remain.
3. `distributor_products`: replace the SELECT policy with authenticated read so PTR/qty shows for MRs; admin-manage stays.
4. Confirm `GRANT SELECT` exists for `authenticated` on all three tables.

No frontend changes are needed — the pages already query these tables directly and will populate once RLS allows the read.

## Notes

- This intentionally widens read access from "admin + owner" to "any signed-in employee". Since the app is now closed-signup (admin-created accounts only), every authenticated user is staff. `anon` gets no access.
- If you'd rather keep per-MR pharmacy scoping instead, the alternative is to populate `mr_pharmacy_assignments` and add an assignment UI — more work and more ongoing admin overhead. Tell me if you prefer that route.

## Verification

After the migration, query `pharmacies`, `Distributors`, and `distributor_products` as an MR-role session and confirm non-zero rows, then open the Orders page as an MR to confirm both dropdowns populate.

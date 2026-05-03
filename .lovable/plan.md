## Add "Monthly Reports" to My Performance

Add a third card on `/dashboard/my-performance` matching the existing Call Reports / Expenses Reports style, plus a new page that shows the logged-in MR's monthly KPIs.

### 1. Update `src/pages/MyPerformance.tsx`
- Change grid from `md:grid-cols-2` to `md:grid-cols-3`.
- Add a third `Card` titled **Monthly Reports** with a `BarChart3` (or `TrendingUp`) icon, description "View your monthly targets, calls, orders & achievements", and a button "See Monthly Reports" navigating to `/dashboard/monthly-reports`.

### 2. Create `src/pages/MonthlyReports.tsx`
Page for the current logged-in MR (uses `useAuth().user.id`). Includes:

- **Month selector** (default = current month) using a simple month/year picker.
- **Summary KPI cards** (responsive grid 2 / 4 cols):
  - Monthly Target (₹) — from `targets` where `mr_id = me`, `target_type='mr'`, matching month.
  - Achieved (₹) — `targets.achieved_value` (already auto-computed by trigger).
  - Achievement % — achieved / target × 100, with progress bar.
  - Orders Placed — count of `orders` for me in month.
  - Order Value (₹) — sum of `orders.total_amount` for me in month.
  - Doctor Calls Done — count of `daily_working` rows for me in month where `doctor_id is not null`.
  - Pharmacy/Distributor Visits — count of `daily_working` rows where `distributor_id is not null`.
  - Expected Calls vs Done — expected = working days in month × configurable per-day target (default 8 doctor calls/day); show "Done / Expected" with progress bar.
  - Expected Orders vs Received — expected derived from approved tour plan days (count of non-holiday/weekly-off `tour_plan_days` for that month) × 1 order/day target; vs actual orders count.
  - Expenses Submitted (₹) — sum of `expenses.amount` for me in month.
  - Samples Given — total quantity from `daily_working.sample_details` aggregated client-side.
- **Charts** (recharts via existing `chart.tsx`):
  - Bar chart: Daily orders count across the month.
  - Line chart: Cumulative achieved value vs proportional target line.
- **Top performers table** (top 5 doctors by order value in month).

### 3. Routing — `src/App.tsx`
Add `<Route path="monthly-reports" element={<MonthlyReports />} />` under the dashboard layout (same place CallReports/ExpensesReports are mounted). MR-accessible (no admin gating; uses RLS already filtering by `mr_id = auth.uid()`).

### Data sources (all RLS-safe for MRs)
- `targets` (mr_id=me, target_type='mr', target_month month match)
- `orders` (mr_id=me, order_date in month) joined with `order_items` for value if needed; `orders.total_amount` already aggregates per order
- `daily_working` (mr_id=me, work_date in month) for calls + samples
- `expenses` (mr_id=me, expense_date in month)
- `tour_plan_days` via `tour_plans` (user_id=me, month/year) for expected working days

### No DB changes required
All needed tables/columns already exist; the page is read-only aggregation in the client.

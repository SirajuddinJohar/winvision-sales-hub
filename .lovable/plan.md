## Product Analytics Page

Add a new page `src/pages/ProductAnalytics.tsx` accessible from the Reporting hub, showing per-product Sales / Scheme / Sample quantities for the current month, with optional MR filter.

### Data sources
- **Sales qty** — sum `order_items.quantity` joined to `orders` where `order_date` is in current month.
- **Scheme qty** — parse `order_items.scheme` (e.g. `"10+2"` → free qty `2`) for orders in current month. Free qty contributes to scheme totals.
- **Sample qty** — sum quantities from `daily_working.sample_details` (JSONB array of `{product_id, quantity}`) where `work_date` is in current month.
- **MR filter** — Admins see "All MRs" dropdown (existing pattern). MRs auto-filtered by RLS.

### UI
- Route `/dashboard/product-analytics` (lazy in `DashboardLayout`).
- Header with month label + MR filter (admin only) + Export CSV button.
- 3 summary cards: Total Sales Qty, Total Scheme Qty, Total Sample Qty.
- Sortable table: Product | Category | Sales Qty | Scheme Qty | Sample Qty | Total Movement.
- Per-MR breakdown table below (admin only): MR Name | Sales Qty | Scheme Qty | Sample Qty.
- Mobile-compact tokens (px-3 py-2, text-xs/sm) per project memory.

### Entry points
- New "Product Analytics" card on `Reporting.tsx`.
- Link in sidebar Reports group.

### Files
- Create `src/pages/ProductAnalytics.tsx`
- Edit `src/App.tsx` (route) and `src/components/dashboard/DashboardLayout.tsx` (sidebar)
- Edit `src/pages/Reporting.tsx` (entry card)

### Scheme parsing
Helper `parseScheme(scheme: string, baseQty: number)` → returns free qty. Supports formats `"10+2"`, `"10 + 2"`, `"2"` (plain free). Falls back to 0 on parse failure.

No DB migrations needed.
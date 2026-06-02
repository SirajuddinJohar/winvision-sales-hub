
# Reward Campaigns (Gamification & Motivation)

A flexible system where admins create reward campaigns (e.g. "Order 200 Lubrikey Drops → get a trolley"), the system auto-tracks customer progress, and admins approve & mark rewards as delivered. Campaigns can be created/paused any month — so "sometime something, sometime nothing" is fully supported.

## Concept

```text
Admin creates Campaign            Customer/Pharmacy orders
   (product, qty, reward)   ───►    accumulate over time
                                          │
                                          ▼
                              Progress auto-calculated
                                          │
                            qty reached ──┴── not reached
                                  │              │
                                  ▼              ▼
                           Claim created     Keep tracking
                           (status: pending)
                                  │
                                  ▼
                        Admin reviews & approves
                                  │
                                  ▼
                        Mark as Delivered + notes
```

## Data model (3 new tables)

**1. `reward_campaigns`** — admin defines a campaign
- `id`, `name` (e.g. "Lubrikey Trolley Offer")
- `product_id` (FK products) — which product to track
- `target_quantity` (int) — e.g. 200
- `reward_description` (text) — e.g. "Branded Trolley"
- `reward_image_url` (optional)
- `beneficiary_type` ('pharmacy' | 'doctor') — who earns it
- `start_date`, `end_date` — campaign window
- `is_active` (bool)
- `created_by`, timestamps

**2. `reward_claims`** — auto-generated when threshold reached
- `id`, `campaign_id`
- `beneficiary_type`, `pharmacy_id` / `doctor_id`
- `mr_id` (the MR whose orders triggered it — for credit)
- `achieved_quantity`, `achieved_at`
- `status` ('pending' | 'approved' | 'rejected' | 'delivered')
- `approved_by`, `approved_at`, `admin_notes`
- `delivered_at`, `delivery_notes`

**3. `reward_claim_orders`** (audit) — which order_items contributed
- `claim_id`, `order_item_id`, `quantity_counted`

## How progress is calculated

A SQL view `reward_campaign_progress` aggregates `order_items.quantity` per `(campaign, beneficiary)` within campaign window. When `SUM(quantity) >= target_quantity` and no active claim exists, a trigger on `order_items` insert creates a `reward_claims` row with status `pending` and notifies admins. Sample/scheme quantities are excluded by default (sales-only) — configurable per campaign later if needed.

## UI

**New page: `src/pages/Rewards.tsx`** at `/dashboard/rewards`
- **Tab 1 — Campaigns** (admin only create/edit; MRs read-only)
  - Card list with product, target qty, reward, window, active toggle
  - "New Campaign" dialog (product picker, qty, reward, beneficiary type, dates)
- **Tab 2 — Progress** (live progress bars per beneficiary per campaign — visible to MRs for their own pharmacies/doctors, admins see all)
- **Tab 3 — Claims** (pending/approved/delivered)
  - Admin: approve / reject / mark delivered, add notes
  - MR: view claims for their beneficiaries
- **Tab 4 — Leaderboard** (top pharmacies/doctors by claims earned this FY)

**Entry points**
- Sidebar: new "Rewards 🎁" item under main nav (admin + MR)
- Home Dashboard 2.0: small widget "Active Campaigns (3) · Pending Claims (2)"
- Pharmacy/Doctor detail pages: "Reward Progress" section showing each active campaign with progress bar

**Notifications** (uses existing `notifications` table + `notifyAdmins`)
- Admin: "🎁 New reward claim — Pharmacy X reached 200 Lubrikey Drops"
- MR: "Your pharmacy X earned the Trolley reward!"
- MR/Pharmacy: at 50%, 75%, 100% milestones (encouragement nudges)

## Files to create / edit

**Create**
- `supabase/migrations/<ts>_reward_campaigns.sql` — 3 tables, RLS, GRANTs, trigger fn `check_reward_claim()` on `order_items` insert, view `reward_campaign_progress`
- `src/pages/Rewards.tsx`
- `src/components/rewards/CampaignForm.tsx`
- `src/components/rewards/CampaignCard.tsx`
- `src/components/rewards/ClaimsTable.tsx`
- `src/components/rewards/ProgressList.tsx`
- `src/components/rewards/RewardLeaderboard.tsx`

**Edit**
- `src/App.tsx` — lazy route `/rewards`
- `src/components/dashboard/DashboardLayout.tsx` — sidebar entry (Gift icon)
- `src/pages/Dashboard.tsx` — Rewards widget
- `src/pages/DoctorDetails.tsx` & `src/pages/Pharmacies.tsx` — progress section
- `src/components/layout/GlobalSearch.tsx` — index campaigns

## RLS summary
- `reward_campaigns`: admin manage; authenticated read
- `reward_claims`: admin manage all; MR can view claims where `mr_id = auth.uid()` OR for their assigned pharmacies/doctors
- `reward_claim_orders`: admin manage; MR view their own

## What you (admin) control monthly
- Create new campaigns any time → "sometime something"
- Leave a month with no active campaign → "sometime nothing"
- Pause via `is_active=false` without losing history
- Reward can be anything (text + optional photo) — trolley, gift voucher, trip, cash bonus, etc.

## Out of scope (can add later)
- Tier rewards (e.g. 100 qty = Pen, 200 qty = Trolley, 500 qty = Trip)
- Multi-product "basket" campaigns
- Budget caps per campaign
- WhatsApp/SMS auto-notify to pharmacy when reward earned (uses Twilio you chose earlier)

Shall I proceed with this plan, or would you like to adjust scope (e.g. start with single-tier only, skip leaderboard, add tiers from day 1)?

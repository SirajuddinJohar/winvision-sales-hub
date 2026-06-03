
# Reminders System

A single inbox for everything an MR or Admin needs to act on — doctor birthdays/anniversaries, follow-up visits (next call), tour-plan nudges, and payment/order follow-ups. Auto-generated **and** manually created. Surfaced via in-app bell, **device push notifications**, and Dashboard.

## Concept

```text
Auto sources                          Manual entry
─────────────                         ─────────────
• doctor birthday / anniversary       After a call → "Next call in?"
• tour_plan_days for today              user picks date (max +30 days)
• orders unpaid > 15 days             Quick "+ Reminder" anywhere
• stale pharmacies (30d no order)       (doctor / pharmacy / custom)
         │                                   │
         └──────────► reminders table ◄──────┘
                            │
        Daily edge fn (pg_cron 07:00 IST)
                            │
   ┌────────────────────────┼─────────────────────────┐
   ▼                        ▼                         ▼
 In-app bell          Device push                Dashboard widget
 (notifications)    (Capacitor Local             "Today's Reminders"
                     Notifications)              + /dashboard/reminders
```

## Data model

**New table `reminders`**
- `id`, `user_id`, `created_by`
- `source` enum: `birthday | anniversary | next_call | tour_plan | payment | order_followup | custom`
- `is_auto` bool
- `title`, `note`
- `remind_date` (date), `remind_time` (time, default 09:00)
- `entity_type` (`doctor | pharmacy | order | none`), `entity_id`
- `link` (deep link)
- `status` enum: `pending | done | dismissed | snoozed`
- `snoozed_until`, `completed_at`, `completed_by`
- `device_notification_id` (int, nullable — id returned by Capacitor schedule, used to cancel)
- timestamps

**Validation trigger**: for manual `next_call` reminders, enforce `remind_date <= created_at::date + interval '30 days'` (raise exception otherwise). Birthdays/anniversaries are auto and exempt.

**RLS**: user owns their reminders; admins see all.

## Next-call (follow-up) flow

After an MR closes a call/visit on the Daily Working screen, a small inline section appears:

```
Next call for Dr. X?
[ Tomorrow ] [ +3d ] [ +7d ] [ +15d ] [ +30d ] [ Pick date ]
Note (optional): ___________
[ Skip ]   [ Save reminder ]
```

- Date picker is capped at `today + 30 days` (max 1 month rule).
- Saving inserts a `next_call` reminder for the same MR linked to that doctor.
- Same control also appears as **"Set next call"** button on Doctor detail page.

## Device push notifications (Capacitor Local Notifications)

- Install `@capacitor/local-notifications`; request permission in existing `usePermissions` hook.
- New helper `src/lib/deviceNotifications.ts`:
  - `scheduleReminder(reminder)` → schedules at `remind_date + remind_time`, stores returned id in `device_notification_id`.
  - `cancelReminder(reminder)` when done/dismissed/snoozed.
  - `rescheduleAll()` on app start — syncs DB → device queue (handles reinstall).
- On native devices: tapping the notification deep-links into the reminder's `link`.
- On web: falls back to in-app bell only.
- Daily edge function still creates the in-app `notifications` row for non-mobile sessions.

## Auto-generation (daily edge function + pg_cron 01:30 UTC = 07:00 IST)

`supabase/functions/generate-reminders/index.ts` upserts pending reminders for the next 7 days, idempotent by `(source, entity_id, remind_date, user_id)`:

1. **Birthday / Anniversary** — per doctor in next 7 days, one reminder per assigned MR.
2. **Tour plan today** — for approved `tour_plan_days` with `visit_date = today`.
3. **Payment follow-up** — orders `payment_status='pending'` older than 15 days.
4. **Stale pharmacy** — pharmacies with no order in 30 days (weekly).

## UI

**1. `src/pages/Reminders.tsx`** at `/dashboard/reminders`
- Tabs: **Today · Upcoming (7d) · Overdue · Done**
- Row: source icon, title, target chip, date, actions: Mark Done · Snooze (1d/3d/7d) · Dismiss · open entity link
- Floating `+ New Reminder` dialog (type, target picker, date capped +30d for next_call, time, note)
- Admin: "All Users" filter

**2. Dashboard widget** — "🔔 Today's Reminders (N)", top 5 + View all.

**3. Bell integration** — existing `NotificationBell` already shows `notifications` rows; the edge fn inserts there at fire time.

**4. Quick-add entry points**
- Daily Working call card → "Set next call" (the +30d capped picker)
- Doctor detail page → "Set next call"
- Pharmacy detail page → "Set payment follow-up"

**5. Sidebar** — "Reminders 🔔" item with pending-today badge.

## Files to create / edit

**Create**
- `supabase/migrations/<ts>_reminders.sql` — table + enums + validation trigger (30-day cap) + RLS + grants + indexes
- `supabase/functions/generate-reminders/index.ts` + pg_cron schedule (insert tool)
- `src/pages/Reminders.tsx`
- `src/components/reminders/ReminderForm.tsx`
- `src/components/reminders/ReminderList.tsx`
- `src/components/reminders/NextCallPicker.tsx` (capped +30d, quick-chips)
- `src/hooks/useReminders.ts`
- `src/lib/deviceNotifications.ts` (Capacitor Local Notifications wrapper)

**Edit**
- `package.json` — add `@capacitor/local-notifications`
- `src/hooks/usePermissions.tsx` — request notification permission
- `src/App.tsx` — lazy route + call `rescheduleAll()` on mount
- `src/components/dashboard/DashboardLayout.tsx` — sidebar entry + badge
- `src/pages/Dashboard.tsx` — Today's Reminders widget
- `src/pages/DoctorDetails.tsx`, `src/pages/Pharmacies.tsx`, `src/components/daily-working/*` — quick-add
- `src/components/doctors/UpcomingReminders.tsx` — read from reminders table

## After install
Native push requires `npx cap sync` on the user's local repo — call it out once code is in.

## Out of scope (later)
- Server-side FCM/APNs push (only needed if app is killed; Local Notifications cover scheduled fires)
- WhatsApp/SMS via Twilio
- Recurring reminders (weekly/monthly)

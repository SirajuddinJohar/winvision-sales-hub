## Goal
Restrict account creation to admins only. Remove public signup entirely.

## Changes

### 1. AuthPage (`src/components/auth/AuthPage.tsx`)
- Remove the Tabs wrapper — show only the Sign In form.
- Remove signup state, `handleSignUp`, role selector, demo-account creation button (uses signUp).
- Keep "Fill Demo Credentials" buttons (they only prefill, no signup).
- Keep Forgot Password flow.

### 2. useAuth (`src/hooks/useAuth.tsx`)
- Keep `signUp` in context (admin User Management still calls it), but it will no longer be reachable from the public UI.

### 3. New Admin page: User Management (`src/pages/UserManagement.tsx`)
- Admin-only route `/dashboard/users` (guarded via `ProtectedRoute` + `requiredRole="admin"`).
- Lists all users with name, email, role, created date (from `users` + `user_roles`).
- "Create Employee" dialog: name, email, temp password, role (mr/admin) → calls `supabase.auth.signUp` with metadata (existing `handle_new_user` trigger creates the `users` + `user_roles` rows).
- Change role (admin/mr) via update to `user_roles`.
- Show note: employee should use "Forgot Password" on first login to set their own password.

### 4. Routing & nav
- Add `/dashboard/users` route in `src/App.tsx`.
- Add "User Management" link in `DashboardLayout` sidebar under the Admin group (admin-only).

### 5. Database
- No schema changes needed. `handle_new_user` trigger already provisions rows on signup.
- Note: Supabase Auth itself still technically allows signup at the API level. Full lock-down requires disabling "Enable signups" in Supabase dashboard (Authentication → Providers → Email). Will instruct the user to toggle this off — the admin creation flow works either way because we call signUp from an authenticated admin session.

## Out of scope
- Deleting existing auth users (requires service-role edge function — can add later if wanted).
- Email invite flow (chose direct creation).

## User action required after build
Disable public email signups in Supabase Dashboard → Authentication → Providers → Email → "Enable signups" OFF, so the API can't be hit directly either.

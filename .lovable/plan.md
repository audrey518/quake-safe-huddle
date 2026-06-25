# Service Providers v1

Move the services catalog into the database, let providers sign up and manage their own listings, and notify them by email + Telegram on every new purchase or booking.

## What's changing for users

- **Customers**: same Services page, but data now comes from the database. No visible change.
- **Service providers**: new "Service Provider" option on the signup page. They pick a business name, category, location, contact email and phone, plus their engineering licence number if applicable. After admin approval, they get a dashboard.
- **Owner (you)**: a small "Pending providers" admin screen to approve or reject signups. You already get a Telegram alert for every purchase — no change there.
- **Providers** (once approved): every new order/booking triggers an email to their contact address AND a Telegram message to their bot chat (if they connect it). They also see the order in their dashboard immediately.

## Provider dashboard

One page at `/provider` with three tabs:

1. **Orders & bookings** — table of incoming orders for their items, with customer name, email, item, qty, total, date, and a status dropdown (new / accepted / completed / cancelled).
2. **My listings** — add / edit / delete the items they sell, set price, unit, and whether it requires an appointment. Toggling "active" hides an item from the public catalog without deleting it.
3. **Stats** — three cards: orders this month, revenue this month, pending orders.

## How alerts work

When a purchase or booking is created:

1. Order is saved to the DB with `provider_id` and `provider_user_id`.
2. Confirmation email goes to the customer (already built).
3. Telegram message goes to the 4 owner chat IDs (already built).
4. **New**: email goes to the provider's contact address with order details.
5. **New**: if the provider has linked a Telegram chat ID in their dashboard settings, a Telegram message also goes to them.

## Approval flow

- Signup creates the auth account immediately (so they can log in) but their provider record is `status = 'pending'`.
- Pending providers see a "Waiting for approval" screen instead of the dashboard.
- You see pending signups at `/admin/providers` (visible only if you have the `admin` role). One click to approve or reject.
- On approval, their listings become editable and start appearing in the public catalog.

## Technical details

**New DB tables**
- `providers` — one row per business; columns: `user_id` (FK auth.users, unique), `name`, `category` (enum: materials/engineering/water/insurance), `blurb`, `location`, `phone`, `contact_email`, `license_number`, `telegram_chat_id` (nullable), `status` (pending/approved/rejected), timestamps.
- `provider_items` — `provider_id` FK, `name`, `price`, `unit`, `appointment` (bool), `active` (bool), timestamps.
- New role added to `app_role` enum: `provider`. New role: `admin` (for you).

**Schema changes to existing tables**
- `purchases`: add `provider_id`, `provider_user_id`, `status` (new/accepted/completed/cancelled).
- `appointments`: add `provider_id`, `provider_user_id`, `status`.

**RLS**
- `providers`: anyone can SELECT approved rows (public catalog); owner can SELECT/UPDATE own row; admin can do everything.
- `provider_items`: anyone can SELECT active items of approved providers; owning provider can manage own items; admin can do everything.
- `purchases`/`appointments`: existing user policies stay; add provider policy — provider can SELECT and UPDATE rows where `provider_user_id = auth.uid()`.

**Migrations**
- Migration 1: create tables, enums, RLS, GRANTs.
- Migration 2: seed `providers` and `provider_items` from the current `src/lib/services-data.ts` so the catalog isn't empty after the switch (no `user_id` yet — they get linked when a real account claims them, or admin can ignore them).

**Code**
- Update auth signup page: add "Service Provider" role option with extra fields.
- Replace `services-data.ts` reads in `src/routes/services.*` with DB queries via a public read-only server fn (publishable client, narrow `TO anon` SELECT on approved/active rows only).
- Update purchase / booking server fns to look up `provider_user_id` from the item, save it on the row, and fan out the new email + Telegram alerts.
- New routes: `/provider` (dashboard, under `_authenticated/`), `/provider/pending` (waiting screen), `/admin/providers` (approval, gated by `admin` role).
- Provider email uses the existing Gmail connector and the same template style as the customer confirmation.

**Out of scope for v1** (call out so you can ask for them later if needed): provider-to-customer messaging, refunds/cancellation flows, payouts, multi-user provider teams, file uploads for product photos.

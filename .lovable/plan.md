## GeoSafe AI — Full-Stack MVP Plan

A community disaster-awareness platform with auth, roles, interactive map, real-time USGS feed, and rule-based risk scoring. Minimalist earth + aqua theme.

### 1. Backend (Lovable Cloud)

Enable Lovable Cloud, then run one migration creating:

- `app_role` enum: `local`, `professional`
- `user_roles` (user_id, role) + `has_role()` security-definer function
- `profiles` (id → auth.users, display_name, created_at) + auto-create trigger on signup
- `buildings` (id, user_id, name, address, lat, lng, year_built, floors, material, risk_score)
- `wells` (id, user_id, name, lat, lng, well_type, total_depth_m, current_level_m, measured_at, photo_url)
- `well_readings` (id, well_id, level_m, measured_at) — water-level history
- `hazard_reports` (id, user_id, kind: earthquake_damage|flooding|landslide|ground_cracks, severity, lat, lng, description, created_at)
- `soil_data` (id, user_id [professional only], lat, lng, soil_type, depth_m, layers jsonb, notes)

RLS:
- profiles, buildings, wells, well_readings, hazard_reports: readable by all authenticated; insert/update by owner
- soil_data: SELECT to authenticated; INSERT/UPDATE restricted to `professional` role via `has_role()`
- user_roles: SELECT own row only

GRANTs to `authenticated` + `service_role` on every public table.

### 2. Auth

- Email/password sign up + login + logout (no Google requested)
- Signup form picks role (Local / Professional); inserts into `user_roles`
- Managed `_authenticated/route.tsx` gate (already shipped by integration)
- `/auth` public route
- Role-based redirect after login: both land on `/` dashboard; soil entry route hidden for locals

### 3. Routes

```
/                  Dashboard (stats, recent quakes, recent reports, alerts)
/auth              Sign in / sign up
/_authenticated/
  map              Leaflet map with layer toggles
  buildings        List + create building
  wells            List + create well + reading history
  reports          Submit + browse hazard reports
  soil             View soil (all) / submit (professional only)
  risk             Risk assessment tool
  earthquakes      USGS feed with 24h / 7d filter
```

### 4. Map (Leaflet)

- `react-leaflet` + `leaflet` packages
- Layer toggles: Earthquakes, Hazard Reports, Buildings, Wells, Soil
- Markers color-coded green→yellow→orange→red by risk/severity/magnitude
- Click marker → popup with details; click empty map → reverse-context panel listing nearby wells, soil, reports, computed risk

### 5. USGS + Real-time

- Existing `src/lib/usgs.ts` fetcher; react-query with 60s refetch
- Dashboard alert banner when M≥4.5 within last hour
- Groundwater decline alert: if latest 3 `well_readings` show monotonic drop > 0.5m, surface notification

### 6. Risk Engine

Keep current rules in `src/lib/safeground.ts`:
- age > 30 → +20
- masonry/brick → +15
- floors > 5 → +15
- Categories: Low (<25), Moderate (25–50), High (>50)
- Plain-language explanation string

Auto-store `risk_score` on building insert.

### 7. Code Structure Refactor

```
src/
  routes/        page routes
  components/    ui + feature components (MapView, LayerToggle, AlertBanner, StatCard, etc.)
  hooks/         useAuth, useRole, useEarthquakes, useNearbyData
  services/      buildings.functions.ts, wells.functions.ts, reports.functions.ts, soil.functions.ts (server fns)
  lib/           safeground.ts, usgs.ts, format.ts
```

### 8. Design

- Minimalist, lots of whitespace, soft cards, thin borders
- Palette tokens in `src/styles.css`:
  - Earth: warm sand `oklch(0.92 0.02 80)`, deep moss `oklch(0.35 0.04 145)`
  - Aqua: primary teal `oklch(0.55 0.09 200)`, surface aqua `oklch(0.96 0.02 200)`
  - Risk: green/yellow/orange/red semantic tokens
- Fonts: Inter (body) + Space Grotesk (headings) — already loaded
- Card-based dashboard, sticky top nav + mobile bottom nav (existing AppShell)

### 9. Out of scope (explicitly skipped)

No AI predictions, no professional verification workflow, no Google/social login, no payments.

### Technical notes

- Server fns under `src/services/*.functions.ts` using `requireSupabaseAuth`
- Soil insert server fn checks `has_role(userId, 'professional')` and throws Forbidden otherwise
- Leaflet CSS imported via `<link>` in `__root.tsx` head (Tailwind v4 can't @import remote)
- Existing localStorage hooks replaced with Supabase-backed server fns + react-query

# Shared Guest Profile Strategy (LeGoodAnfitrion)

## Why this matters

If each host keeps a disconnected copy of the same guest, data quality drops and the user never gets a reliable "self profile".

The target model is:

1. One owner-managed global profile per registered user.
2. Granular sharing with each host (category by category).
3. Host-private notes that never leak to other hosts.

This keeps product value high while staying realistic for GDPR.

## Data layers

### Layer A: Global shared profile (owner controlled)

- Identity/context
- Food/taste preferences
- Lifestyle/affinities
- Conversation/relationship hints
- Health/restrictions (only with explicit consent)

### Layer B: Host-private notes (host controlled)

- Seating strategy
- Gift/decor/playlist notes
- Event-specific observations

These notes must remain private to the host account.

## Permission model

The migration `012_shared_guest_profiles.sql` introduces field groups with per-host grants:

- `allow_identity`
- `allow_food`
- `allow_lifestyle`
- `allow_conversation`
- `allow_health`

Access is resolved by `has_profile_share_access(profile_id, scope)`.

## GDPR baseline for this model

1. Explicit consent for health fields (allergies/intolerances/pet allergies).
2. Revocable sharing per host.
3. Full audit trail (`global_guest_profile_consent_events`).
4. Data minimization by default (all share flags off except identity).
5. Separation between shared data and host-private notes.

## UX flows to build next

1. Claim profile:
   - Logged user runs `get_or_create_my_global_guest_profile()`.
   - App links local self-guest record to global profile.
2. Share settings:
   - User chooses which host can see each category.
3. Host view:
   - Host sees only categories explicitly granted.
4. Validation:
   - User reviews and confirms/edits data suggested by hosts.
5. Revocation:
   - User disables one category or all categories for a host.

## Rollout plan

### Phase 1 (safe foundation)

- Keep current local guest flows as they are.
- Add global profile tables + RLS (already done in SQL migration 012).
- No automatic cross-account overwrite yet.

### Phase 2 (controlled sync)

- Add "Link guest to global profile" in guest detail.
- Add read-only badges showing granted categories.
- Add manual "pull latest approved profile data" action.

### Phase 3 (trust loop)

- Add "validate data suggested by hosts" inbox for the profile owner.
- Add quality score ("validated vs pending fields").
- Add host reputation signals (optional, later).

## Product guardrails

1. Never auto-share health data.
2. Never auto-merge host-private notes into global profile.
3. Never show another host's notes.
4. Always show source + last update timestamp for shared fields.

# GDPR and Contact Data Notes

## Critical legal point

Allergies and intolerances can reveal health-related data. In GDPR terms this is special category data and needs explicit consent and stronger controls.

## MVP compliance baseline

1. Explicit consent screen before importing contacts.
2. Separate consent for sensitive preference data (allergies/intolerances).
3. Data minimization: only collect fields used by active features.
4. Purpose limitation: event personalization only.
5. Deletion rights: user can delete event and guest data.
6. Retention policy: auto-delete stale data after a defined period.
7. Encryption:
   - In transit (TLS)
   - At rest (database/storage)
8. Auditability: store consent timestamps and policy version.
9. Processor contracts (DPA) with Supabase, Stripe, messaging providers.
10. Data export endpoint for host account data.

## Product risks to avoid

- Scraping social profiles without explicit legal basis
- Importing phone contacts without clear disclosure
- Storing unnecessary sensitive fields by default
- Mixing guest data across unrelated events without consent

## Practical recommendation

Start with host-entered guest preferences and explicit invitation acceptance flow. Delay automatic contact enrichment until legal and UX consent flows are proven.

## Shared profile model (new)

If guest data is shared between hosts, use a hybrid model:

1. Global profile owned by the guest user (shared by explicit permissions).
2. Host-private notes that are never shared across hosts.
3. Category-level sharing controls (identity, food, lifestyle, conversation, health).
4. Separate explicit consent for health fields and revocation controls.

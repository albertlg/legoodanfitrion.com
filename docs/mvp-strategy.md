# MVP Strategy (opinionated)

## Product focus

Do not build every requested capability in v1. The fastest MVP should validate:

1. Event creation and guest invitations
2. RSVP tracking
3. Guest preference capture that improves event suggestions
4. Basic cost split tracking (without full wallet complexity)

Everything else can be phase 2+.

## Technical recommendation (low-code first)

### Recommended MVP stack

- Mobile app: FlutterFlow
- Data/Auth/Storage: Supabase
- Automations: n8n
- Payments: Stripe Payment Links (not full in-app marketplace)
- Notifications: OneSignal + email provider

Reason:

- Faster than coding React Native + custom backend from day 1
- Keeps a migration path to custom code
- Good enough for a validated beta

### Why not AppSheet as primary

- Great for internal tools and CRUD.
- Weaker fit for consumer-grade UX, real-time chat-like flows, and custom growth loops.

## Suggested feature phases

### Phase 1 (4-6 weeks)

- Auth
- Create event
- Invite guests (link + email/whatsapp share)
- RSVP status board
- Guest profile (minimal fields)
- Suggestion engine v1 (rules-based)

### Phase 2

- In-app messaging
- Photo album
- Expense split with Stripe links
- Integrations (restaurant, shopping, poll scheduling)

### Phase 3

- Advanced personalization
- Ranking/recommendation model
- Deep partner integrations

## Data model scope for guest enrichment (v1)

Keep only high impact fields first:

- Name
- Contact channel
- Relationship
- Dietary profile
- Allergies/intolerances
- Drink preferences
- Music preference
- Last interaction note
- Taboo topics (optional)

Add long-tail fields later only if they influence outcomes.


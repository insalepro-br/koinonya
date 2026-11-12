# Security Specification - Koinonia CRM

## Data Invariants
1. All entities (Church, Member, Event) must belong to an `org_id`.
2. Access is scoped by `org_id`. A user from Org A cannot see data from Org B.
3. Users must have accepted the LGPD consent (`lgpd_consent_date` exists in their profile) to perform any action.
4. The platform owner (`SUPER_ADMIN`) has global access.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Org Poisoning:** Creating a Member in Org A with `org_id` set to Org B.
2. **Identity Spoofing:** Updating another user's profile `role` to `ADMIN`.
3. **Ghost Church:** Accessing a Church document without being authenticated.
4. **Consent Bypass:** Trying to read Members before accepting LGPD terms.
5. **Cross-Tenant List:** Querying all members without filtering by `org_id`.
6. **Plan Violation:** Trying to create a second church on 'IGREJA' plan (enforced via total church count logic in rules).
7. **PII Scraping:** Listing all users in the system without an `org_id` filter.
8. **Recursive Cost Attack:** Documents with IDs > 128 characters.
9. **State Shortcut:** Directly sets `engagement_score` to 100 without going through the business logic.
10. **Shadow Field:** Adding `is_platform_admin: true` to a system user profile.
11. **Future Invariant:** Creating an event with `end_date` before `start_date`.
12. **Orphaned Member:** Creating a member for a church that doesn't exist in the same organization.

## Implementation Guardrails
- Total Array Guard: Lists like `permissions` capped at 20 items.
- Strict Keys: `isValid[Entity]` checks exact keys on create.
- Terminal Locking: Organizations marked as `active: false` block all writes to child documents.

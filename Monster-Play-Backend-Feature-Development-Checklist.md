# Monster Play Backend Feature Development Checklist

## 1. Document Purpose

This checklist is based on the currently visible screens in the Figma file **Monster Play**. It defines the backend business capabilities, API scope, core rules, and acceptance criteria required to support frontend development.

This document describes backend functionality only. It does not cover service decomposition, deployment topology, technology selection, or database architecture.

## 2. Business Scope Identified from the Figma Design

The current design covers the following business flows:

- App startup, login, and account verification
- WhatsApp phone number input and verification
- Home content and travel recommendations
- Location browsing, map browsing, and location details
- Tour routes and tour details
- Tour checkpoint unlocking
- Map check-ins and AR exploration
- Points, levels, badges, and avatars
- Reward claiming and redemption
- Tour or product purchases
- Purchase completion page

The `Archive` page contains historical designs. Backend development should follow the currently active pages and should not create separate business logic specifically for archived screens.

## 3. Priority Definition

- **P0: Required for the core flow.** Without these APIs, the frontend cannot complete the main business integration.
- **P1: Required for production operations.** These capabilities affect administration, monetization, notifications, and analytics.
- **P2: Enhancement features.** These can be implemented after the main flow is stable.

## 4. Functions That Must Involve the Backend

The following data and results must be stored, validated, and returned by the backend. They must not be decided only by the frontend:

- Whether login succeeds
- Whether a verification code is valid
- User identity and permissions
- Whether an avatar has been unlocked
- Locations, tours, and checkpoint data
- A user's current tour progress
- Whether a checkpoint has been completed
- Whether a GPS, QR-code, or AR check-in is valid
- User points, levels, and badges
- Reward inventory and eligibility
- Order amounts and payment status
- Whether a user has purchased or redeemed an item
- Leaderboards and operational analytics
- Content modified by administrators

The following functions are mainly frontend responsibilities:

- Page layout and responsive styling
- Page animations and transitions
- Map and AR rendering
- Immediate input-format validation
- Static illustrations and icons
- Local filtering of data already returned by the backend

## 5. Backend Feature Modules

---

## BE-01 Account Registration, Login, and Sessions

**Priority: P0**

**Related screens:**

- Landing Screen
- Splash screen
- Login
- Verify Account

**Backend responsibilities:**

- Create user accounts
- User login
- User logout
- Restore login state
- Refresh authentication credentials
- Manage sessions across multiple devices
- Account deletion
- Account suspension and reactivation
- Store the latest login time and device information

**Suggested APIs:**

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/me
DELETE /api/v1/me
```

**Core rules:**

- Login success must be determined and returned by the backend.
- After logout, the current session must be invalidated.
- A suspended account cannot create a valid session.
- Account deletion requires confirmation and must clean up or anonymize personal data.

**Acceptance criteria:**

- A new user can register and log in.
- Login state can be restored after refreshing the page.
- Protected APIs return an unauthenticated response after logout.
- A suspended account cannot log in.

---

## BE-02 Verification Codes and WhatsApp Phone Verification

**Priority: P0**

**Related screens:**

- Verify Account
- Input WA Number - 5
- Input WA Number - 6

**Backend responsibilities:**

- Send verification codes
- Verify submitted codes
- Bind a WhatsApp phone number
- Change a bound phone number
- Handle expired codes
- Limit incorrect verification attempts
- Limit sending frequency
- Store verification records

**Suggested APIs:**

```http
POST /api/v1/auth/verification-codes
POST /api/v1/auth/verification-codes/verify
POST /api/v1/me/whatsapp/bind
POST /api/v1/me/whatsapp/change
```

**Core rules:**

- A verification code can be used only once.
- Every code must have an expiration time.
- Requests must be rate-limited by phone number and IP address.
- The frontend must not verify codes in plaintext.
- If the messaging provider fails, no valid verification record may be created.
- Phone numbers must be masked when displayed.

**Product decisions required:**

- Whether to use SMS, WhatsApp Business, or another messaging channel.
- Whether a phone number is required for login.
- Whether one phone number can be bound to multiple accounts.

---

## BE-03 User Profile, Avatars, and User Status

**Priority: P0**

**Related screens:**

- Select Avatar
- Home
- Badges
- Rewards

**Backend responsibilities:**

- Query user profiles
- Update nicknames and basic profile information
- Return the avatar list
- Return avatar unlock conditions
- Set the current avatar
- Store the user's level, points, and status summary
- Return content already unlocked by the user

**Suggested APIs:**

```http
GET   /api/v1/me
PATCH /api/v1/me
GET   /api/v1/avatars
GET   /api/v1/me/avatars
POST  /api/v1/me/avatar
```

**Core rules:**

- A user may select only an unlocked avatar.
- Avatar unlock status must be determined by the backend.
- Profile updates must validate length and sensitive content.
- Profile APIs must not expose another user's private fields.

**Acceptance criteria:**

- Users can see available and locked avatars.
- The selected avatar remains active after returning to the home page.
- An unlocked avatar cannot be selected by forging a client request.

---

## BE-04 Home Content and Recommendations

**Priority: P0**

**Related screens:**

- Home
- Homepage
- Landing Screen

**Backend responsibilities:**

- Home banners
- Recommended locations
- Recommended tours
- Activity entry points
- User points and level summary
- Unread notification count
- Publishing and unpublishing home content
- Returning different content based on time, region, or user status

**Suggested APIs:**

```http
GET /api/v1/home
GET /api/v1/home/banners
GET /api/v1/home/recommendations
```

**Core rules:**

- Only currently valid and published content may be returned.
- Recommendations must support ordering and weighting.
- If no recommendation is available, return a stable empty state rather than an error.
- Home data may be cached, but points and unread counts must not remain stale for a long period.

**Acceptance criteria:**

- The home page can obtain all data required for rendering in one request.
- Unpublished banners no longer appear on the frontend.
- Logged-in and logged-out users can receive different home data.

---

## BE-05 Locations, Destinations, and Map Data

**Priority: P0**

**Related screens:**

- Explore
- Locations
- Detail Location
- Explore - Map view

**Backend responsibilities:**

- Location list
- Location details
- Location categories
- Location coordinates
- Location cover and detail images
- Location operating status
- Location tags
- Map-bounds queries
- Keyword search
- Distance sorting
- Tours associated with a location

**Suggested APIs:**

```http
GET /api/v1/locations
GET /api/v1/locations/:id
GET /api/v1/locations/:id/tours
GET /api/v1/locations/map
```

**Recommended query parameters:**

```text
keyword
category
latitude
longitude
radius
bbox
page
page_size
sort
```

**Core rules:**

- Only published locations may be returned to regular users.
- Map APIs must limit the number of results in a single response.
- Coordinates must be maintained by content administrators, not by the frontend.
- Locations should be unpublished or soft-deleted instead of hard-deleted when historical check-ins depend on them.

**Acceptance criteria:**

- List, detail, and map APIs can be integrated by the frontend.
- Location details can return associated tours and checkpoints.
- Location filtering, category filtering, and pagination are stable.

---

## BE-06 Tour Routes and Checkpoint Configuration

**Priority: P0**

**Related screens:**

- Tour Detail
- Explore
- Unlocked Checkpoint
- Explore - Map view

**Backend responsibilities:**

- Tour list
- Tour details
- Tour price and duration
- Locations included in a tour
- Checkpoint order
- Checkpoint coordinates
- Checkpoint unlock conditions
- Tour opening hours
- Tour publishing and unpublishing
- Tour version management

**Suggested APIs:**

```http
GET  /api/v1/tours
GET  /api/v1/tours/:id
GET  /api/v1/tours/:id/stops
POST /api/v1/tours/:id/start
```

**Core rules:**

- A checkpoint must belong to the current tour.
- Checkpoints are normally unlocked in sequence; whether skipping is allowed requires product confirmation.
- The behavior of already-started tours after a tour is unpublished must be defined.
- Tour changes must not corrupt historical user progress.

**Acceptance criteria:**

- The frontend can obtain tour details, location order, and checkpoints.
- A user can start a tour.
- Repeated start requests do not create duplicate abnormal records.

---

## BE-07 User Tour Progress

**Priority: P0**

**Related screens:**

- Tour Detail
- Explore - Map view
- Unlocked Checkpoint
- Rewards

**Backend responsibilities:**

- Start a tour
- Pause a tour
- Resume a tour
- Query the current tour
- Query completed tours
- Query the current checkpoint
- Calculate tour completion percentage
- Store the latest visited location
- Complete a tour

**Suggested APIs:**

```http
POST /api/v1/tours/:id/start
GET  /api/v1/me/tours
GET  /api/v1/me/tours/:id
GET  /api/v1/me/tours/:id/progress
POST /api/v1/me/tours/:id/complete
```

**Core rules:**

- A user must have only one progress record for the same tour.
- Progress must use explicit states such as `not_started`, `active`, `completed`, and `expired`.
- Completion percentage must be calculated by the backend; the frontend cannot upload the final percentage.
- Repeated submissions for the same checkpoint cannot award points repeatedly.

**Acceptance criteria:**

- Progress is preserved after the user leaves and re-enters the page.
- Users can view current and historical tours.
- The tour automatically becomes completed after all checkpoints are completed.

---

## BE-08 Check-ins, Checkpoint Unlocking, and Anti-cheat Validation

**Priority: P0**

**Related screens:**

- Explore - Map view
- Explore - AR view
- Unlocked Checkpoint
- Get Reward

**Backend responsibilities:**

- GPS check-ins
- QR-code or location-code check-ins
- AR recognition result confirmation
- Checkpoint unlocking
- Check-in records
- Check-in failure reasons
- Duplicate check-in prevention
- Abnormal location records
- Manual check-in adjustment or reversal

**Suggested APIs:**

```http
POST /api/v1/check-ins/location
POST /api/v1/check-ins/qr
POST /api/v1/check-ins/ar
GET  /api/v1/me/check-ins
GET  /api/v1/me/tours/:id/check-ins
```

**Core rules:**

- The backend must determine whether the user is within the valid range.
- Client fields such as `is_valid`, `completed`, and `distance` cannot be treated as authoritative.
- Check-in APIs must be idempotent so network retries do not issue duplicate rewards.
- The same checkpoint may succeed only once under the configured rules.
- Check-in failures must return explicit error codes, such as too far away, tour not started, or prerequisite checkpoint incomplete.

**Product decisions required:**

- Valid GPS radius, such as 50 or 100 meters.
- Whether QR, NFC, and AR check-in methods are all supported.
- Whether checkpoints may be skipped.
- Whether abnormal check-ins require manual review.

---

## BE-09 Points, Levels, and Point Ledger

**Priority: P0**

**Related screens:**

- Home
- Rewards
- Badges
- Get Reward

**Backend responsibilities:**

- Query point balance
- Award points
- Deduct points
- Point ledger
- Route completion rewards
- Checkpoint rewards
- Activity rewards
- Point expiration
- Level calculation
- Manual point adjustment

**Suggested APIs:**

```http
GET /api/v1/me/points
GET /api/v1/me/points/ledger
GET /api/v1/me/level
GET /api/v1/leaderboard
```

**Core rules:**

- Every point change must create a ledger entry.
- The point balance cannot depend only on frontend calculations.
- Every award must reference a source, such as a checkpoint, tour, campaign, or admin adjustment.
- Point deductions must validate the current balance.
- The same business event cannot award points more than once.

**Acceptance criteria:**

- Users can view their current balance and point history.
- Check-ins, tour completion, and reward redemption update points correctly.
- Points remain consistent after refresh, re-login, or switching devices.

---

## BE-10 Badges, Achievements, and Avatar Unlocking

**Priority: P0**

**Related screens:**

- Badges
- Select Avatar
- Rewards
- Unlocked Checkpoint

**Backend responsibilities:**

- Badge definitions
- Badge icons and descriptions
- Badge unlock conditions
- User badge list
- Achievement progress
- Avatar unlock conditions
- Badge and avatar claim status

**Suggested APIs:**

```http
GET /api/v1/badges
GET /api/v1/me/badges
GET /api/v1/me/achievements
GET /api/v1/avatars
GET /api/v1/me/avatars
```

**Core rules:**

- Unlock conditions must be calculated by the backend.
- A badge can be unlocked only once.
- Badge unlocking must reference the triggering event.
- Unlocked content cannot revert after a normal page refresh.

**Acceptance criteria:**

- Users can see locked, in-progress, and unlocked states.
- A badge is unlocked automatically after its conditions are met.
- Unlock status remains consistent across devices.

---

## BE-11 Rewards, Inventory, Claims, and Redemption

**Priority: P0**

**Related screens:**

- Rewards
- Get Reward
- Unlocked Checkpoint

**Backend responsibilities:**

- Reward list
- Reward details
- Point-based eligibility checks
- Reward inventory
- Reward claims
- Redemption-code generation
- Redemption-code validation
- Reward expiration
- Claim history
- Out-of-stock handling
- Reward unpublishing

**Suggested APIs:**

```http
GET  /api/v1/rewards
GET  /api/v1/rewards/:id
POST /api/v1/rewards/:id/claim
GET  /api/v1/me/rewards
GET  /api/v1/me/rewards/:id
POST /api/v1/me/rewards/:id/redeem
```

**Core rules:**

- Eligibility must be determined by the backend.
- Point deduction, inventory deduction, and claim creation must remain consistent.
- Rewards cannot be issued beyond available inventory.
- Repeated requests cannot deduct points or issue rewards repeatedly.
- The frontend may show success only after the backend confirms the claim.

**Acceptance criteria:**

- A user with insufficient points cannot claim a reward.
- An out-of-stock reward cannot be claimed.
- A user cannot claim the same reward beyond its configured limit.
- A redemption code can be redeemed only once.

---

## BE-12 Products, Orders, and Purchase Flow

**Priority: P1**

**Related screens:**

- Tour Detail
- Thank You Purchase Page

**Backend responsibilities:**

- Product or tour pricing
- Order creation
- Order items
- Order status queries
- Order expiration
- Coupons and discounts
- Opening tour access after purchase
- Purchase completion-page data
- Refund requests
- Refund status

**Suggested APIs:**

```http
POST /api/v1/orders
GET  /api/v1/orders
GET  /api/v1/orders/:id
POST /api/v1/orders/:id/cancel
POST /api/v1/orders/:id/refund
```

**Core rules:**

- Order amounts must be calculated by the backend.
- The final amount submitted by the frontend cannot be trusted.
- Order status transitions must be controlled by the backend.
- Order creation must prevent duplicate submissions.
- Tour or product access may be opened only after a successful purchase.

**Product decisions required:**

- Whether the product is actually paid or currently uses simulated payment.
- Payment methods and payment provider.
- Currency, tax, coupon, and refund rules.
- Whether purchased tour access is permanent.

---

## BE-13 Payments and Payment Webhooks

**Priority: P1; required only when real purchases are enabled**

**Related screens:**

- Thank You Purchase Page

**Backend responsibilities:**

- Create payment requests
- Return payment parameters
- Receive payment-provider callbacks
- Verify callback signatures
- Update order status
- Handle payment failures
- Handle payment timeouts
- Handle refund callbacks
- Maintain payment reconciliation records

**Suggested APIs:**

```http
POST /api/v1/orders/:id/pay
POST /api/v1/payments/webhook
GET  /api/v1/payments/:id
POST /api/v1/payments/:id/refund
```

**Core rules:**

- Payment success is determined by the payment provider callback.
- The backend must not trust a frontend request containing `paid=true`.
- Callbacks must be signature-verified and idempotent.
- Payment records, business orders, and access grants must be traceable together.

---

## BE-14 Map and AR Asset Service

**Priority: P1; map support is part of the main flow, AR can be delivered later**

**Related screens:**

- Explore - Map view
- Explore - AR view
- Detail Location

**Backend responsibilities:**

- Map points
- Route coordinate data
- Location images
- AR recognition assets
- AR models or effects
- Asset versions
- Asset publishing and unpublishing
- User asset unlock status
- Asset download URLs

**Suggested APIs:**

```http
GET /api/v1/map/config
GET /api/v1/tours/:id/map
GET /api/v1/locations/:id/ar-assets
GET /api/v1/me/unlocked-assets
```

**Core rules:**

- The frontend renders assets; the backend returns asset access permissions.
- Unpublished assets must not be returned to new users.
- Large assets need versioning and cache control.
- Asset updates must not break historical tour versions.

---

## BE-15 File, Image, and Media Management

**Priority: P1**

**Related screens:**

- All screens containing images, avatars, maps, or AR assets

**Backend responsibilities:**

- Image uploads
- Image access URLs
- Avatar asset management
- Location image management
- Tour cover management
- AR file management
- File type and size validation
- Asset publishing and unpublishing
- Asset replacement and deletion

**Suggested APIs:**

```http
POST   /api/v1/media/upload
GET    /api/v1/media/:id
DELETE /api/v1/media/:id
GET    /api/v1/media/:id/url
```

**Core rules:**

- Local frontend paths cannot be used as production asset URLs.
- Uploaded files must be validated by type, size, and extension.
- User assets and administrative assets require different permissions.
- Before deleting an asset, check whether it is still referenced by a location, tour, or reward.

---

## BE-16 Notifications and Messages

**Priority: P1**

**Related screens:**

- Home
- Rewards
- Tour Detail
- Thank You Purchase Page

**Backend responsibilities:**

- In-app notifications
- Verification-code messages
- Tour-completion notifications
- Checkpoint-unlock notifications
- Reward-claim notifications
- Order-status notifications
- Campaign start and end notifications
- Unread count
- Mark-as-read operations

**Suggested APIs:**

```http
GET  /api/v1/notifications
GET  /api/v1/notifications/unread-count
POST /api/v1/notifications/:id/read
POST /api/v1/notifications/read-all
```

**Acceptance criteria:**

- Users can view their notification list.
- The unread count is accurate.
- Opening a notification can mark it as read.
- Order and reward status changes can create the corresponding notifications.

---

## BE-17 Leaderboards, Events, and Operational Analytics

**Priority: P1**

**Related screens:**

- Home
- Badges
- Rewards
- Tour-completion screens

**Backend responsibilities:**

- User point leaderboard
- Tour-completion leaderboard
- Badge leaderboard
- Location visits
- Tour starts
- Tour completion rate
- Checkpoint completion rate
- Reward claims
- Order volume
- User retention and activity
- User behavior event collection

**Suggested APIs:**

```http
GET  /api/v1/leaderboard
POST /api/v1/events
GET  /api/v1/me/statistics
```

**Core rules:**

- Leaderboard points must come from valid point-ledger entries.
- Event-reporting failures must not block the main business request.
- Test data and production data must be distinguishable in analytics.
- Personal location data must follow privacy and retention requirements.

---

## BE-18 Administrator Content Management

**Priority: P1**

The Figma file does not include a complete admin interface, but long-term operation requires management capabilities for locations, tours, rewards, and campaigns.

**Backend responsibilities:**

- Manage users
- Manage locations
- Manage tours
- Manage tour checkpoints
- Manage home banners
- Manage rewards and inventory
- Manage badges and avatars
- Manage AR assets
- Manage orders and refunds
- Manage check-in records
- Manually grant or revoke points and rewards
- Publish, unpublish, and schedule content

**Suggested APIs:**

```http
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id/status
GET    /api/v1/admin/locations
POST   /api/v1/admin/locations
PATCH  /api/v1/admin/locations/:id
DELETE /api/v1/admin/locations/:id
GET    /api/v1/admin/tours
POST   /api/v1/admin/tours
PATCH  /api/v1/admin/tours/:id
GET    /api/v1/admin/rewards
POST   /api/v1/admin/rewards
PATCH  /api/v1/admin/rewards/:id
GET    /api/v1/admin/orders
GET    /api/v1/admin/check-ins
```

**Core rules:**

- Administrative APIs must not be available to regular users.
- Publishing, unpublishing, deletion, and manual grants must record the operator.
- Unpublish or soft-delete content instead of hard-deleting it whenever possible.
- Administrative changes to core data must preserve before-and-after audit records.

---

## BE-19 System Configuration, Versioning, and Error Handling

**Priority: P1**

**Backend responsibilities:**

- Minimum app-version checks
- Forced-upgrade configuration
- Campaign switches
- Point-rule switches
- Feature flags
- Standard error codes
- Standard pagination format
- Request correlation IDs
- Health checks
- Error logs
- Administrative operation logs

**Suggested APIs:**

```http
GET /api/v1/app/config
GET /api/v1/app/version
GET /api/v1/health
```

**Core rules:**

- Error responses must use stable error codes instead of only natural-language messages.
- The frontend can display different messages based on error codes.
- Business failures and system failures must be distinguishable.
- Important operations must have a request ID for troubleshooting.

## 6. Recommended API Integration Sequence

The backend should provide APIs in the following order so the frontend can integrate progressively.

### Phase 1: Account and Content

```text
Register/login
→ Verify WhatsApp phone number
→ Get user profile
→ Get home data
→ Get location list
→ Get location details
→ Get tour details
```

### Phase 2: Tours and Gamification

```text
Start tour
→ Get tour progress
→ Get map and checkpoints
→ Check in at a checkpoint
→ Unlock location
→ Award points
→ Unlock badge
→ Complete tour
```

### Phase 3: Rewards

```text
View rewards
→ Check points and inventory
→ Claim reward
→ Generate redemption code
→ Query redemption status
```

### Phase 4: Purchase and Operations

```text
Create order
→ Start payment
→ Receive payment callback
→ Grant tour entitlement
→ Render purchase completion page
→ Manage content and orders
```

## 7. General Backend Requirements

All core APIs must satisfy the following requirements:

- Return a consistent response and error structure.
- Authenticate every protected API.
- Authorize every administrative API.
- Support idempotency for points, inventory, orders, and rewards.
- Store `created_at` and `updated_at` on key business records.
- Preserve the source and related business ID for key records.
- Prefer unpublishing or soft deletion for content.
- Store location, phone, order, and other sensitive data according to the minimum-necessary principle.
- Do not trust points, amounts, completion states, or payment states sent by the frontend.
- Return identifiable errors when external payment, messaging, or map services fail.
- Make all core business changes traceable through logs.

## 8. Product Decisions Required Before Development

The following decisions directly affect APIs and business rules and must be confirmed before implementation:

1. Login methods: email, phone, WhatsApp, or multiple methods.
2. Verification-code channel and provider.
3. Map-service provider.
4. Valid GPS check-in radius.
5. Whether QR, NFC, and AR check-in methods are supported.
6. Whether tour checkpoints must be completed in order.
7. Point rules, level rules, and point expiration.
8. Badge unlock conditions.
9. Reward inventory, claim limits, and redemption expiration.
10. Whether real payments are required.
11. Payment provider, currency, refund rules, and taxes.
12. How long user location data is retained.
13. Administrator roles and management scope.
14. Whether multiple languages are required.
15. Whether a public leaderboard is required.

## 9. Backend Version-One Completion Criteria

The first backend version should meet at least the following criteria:

- Users can register, log in, and complete phone verification.
- Users can enter the home page and receive real content.
- Users can browse locations, maps, and tours.
- Users can start a tour and view progress.
- Users can complete checkpoint check-ins.
- The backend awards points correctly and records the point ledger.
- Users can unlock badges and avatars.
- Users can view and claim rewards.
- Repeated requests do not duplicate points, inventory deductions, or orders.
- Business state remains consistent after refresh, re-login, or switching devices.
- Administrators can manage locations, tours, checkpoints, rewards, and banners.
- Key business records contain creation time, update time, and operation records.

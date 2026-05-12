# IdP Feature Build Prompts

> Generated from `openapi_fixed.yaml` — 121 verified endpoints  
> Use each section as a standalone prompt to Claude Code

---

## FEATURE 1 — User Registration & Identity Creation

```
Build the user registration flow for the IdP system using these verified API contracts:

STEP 1 — Collect and submit registration details
  POST /api/v1/users/register
  Request fields: name, date_of_birth (string/date), mobile_number, email_address
  Response: user_id, otp sent to mobile + email

STEP 2 — Dual OTP verification (mobile + email)
  POST /api/v1/users/verify-otp
  Request fields: user_id, mobile_otp, email_otp
  Response: verified status

STEP 3 — Generate OIDC-compliant UUID
  POST /api/v1/users/generate-uuid
  Request fields: user_id
  Response: oidc_uuid assigned to user

STEP 4 — Create IdP identity record
  POST /v1/app/identity
  Auth: BearerAuth (JWT)
  Request fields: user_id, national_id
  Response: identity_id

STEP 5 — Initiate KYC
  POST /api/v1/kyc/initiate
  Request fields: user_id
  Response: kyc_session_id

STEP 6 — Verify via UAEPASS (or equivalent national ID provider)
  POST /api/v1/kyc/verify-uaepass
  Request fields: user_id, uaepass_token
  Response: kyc_status

STEP 7 — Link bank user to IdP identity
  POST /api/v1/idp/link-user
  Request fields: user_id, idp_user_id
  Response: linked status

IMPLEMENTATION REQUIREMENTS:
- Each step must be atomic — partial failures must roll back or queue for retry
- Store user_id, identity_id, and oidc_uuid in the user session after Step 3
- OTP expiry is 5 minutes — show countdown timer in UI
- KYC steps (5-6) run asynchronously — poll status, do not block UI
- national_id field accepts UAEPASS, SINGPASS, or AADHAR format
- Error handling: map HTTP 409 (duplicate) → "Account already exists" user message
- Error handling: map HTTP 422 → show specific field validation errors

Build: registration service class, API client layer, UI form with step indicator
```

---

## FEATURE 2 — Device Binding & FIDO2 Registration

```
Build device binding and FIDO2 credential registration using these verified API contracts:

STEP 1 — Bind mobile device to user account
  POST /api/v1/devices/bind
  Auth: BearerAuth (JWT)
  Request fields: user_id, device_id, device_fingerprint
  Response: binding_id, binding_status

STEP 2 — Register device with IdP (with FIDO2 attestation)
  POST /v1/app/device/register
  Auth: BearerAuth (JWT)
  Request fields:
    identity_id        (string)
    device_permanent_id (string)
    device_model       (string)
    os_type            (string: ios | android)
    os_version         (string)
    device_public_key  (string)
    attestation_object (string/byte — base64 encoded FIDO2 attestation)
    attestation_format (string: packed | tpm | android-key | fido-u2f | none)
  Response: device_id, trust_level

STEP 3 — Setup 2FA with IdP provider
  POST /api/v1/2fa/setup
  Auth: BearerAuth (JWT)
  Request fields: user_id, idp_provider (uaepass | singpass | aadhar)
  Response: 2fa_setup_status, qr_code (if applicable)

STEP 4 — Check device status after registration
  GET /v1/app/device/{device_id}/status
  Auth: BearerAuth (JWT)
  Response: trust_level, binding_status, last_seen

ADDITIONAL DEVICE OPERATIONS:
  GET  /v1/app/device                      List all bound devices
  GET  /v1/app/device/{device_id}          Get device metadata
  PUT  /v1/app/device/{device_id}          Update device name/nickname
  DELETE /v1/app/device/{device_id}        Unbind device
  POST /v1/app/device/{device_id}/revoke   Revoke with reason: LOST | COMPROMISED | REPLACED

FIDO2 ATTESTATION REQUIREMENTS:
- Generate key pair on device secure enclave (iOS: Secure Enclave, Android: StrongBox/TEE)
- attestation_object must be base64-encoded CBOR from WebAuthn authenticatorMakeCredential
- Supported formats: packed, tpm, android-key, fido-u2f, none
- device_public_key is COSE-encoded public key (base64)
- Server must verify attestation against FIDO metadata service

DEVICE VALIDATION (call on every app launch):
  POST /api/v1/devices/validate
  Request fields: user_id, device_fingerprint
  Response: valid (bool), trust_level

IMPLEMENTATION REQUIREMENTS:
- device_fingerprint must be deterministic per device (use hardware identifiers)
- Store device_id and identity_id in secure local storage after Step 2
- Trust levels: TRUSTED | PROVISIONAL | UNTRUSTED — gate features accordingly
- Revoked devices must be cleared from local storage immediately
- Admin revoke path: POST /v1/admin/devices/{device_id}/revoke

Build: device binding service, FIDO2 attestation generator, device management UI screen
```

---

## FEATURE 3 — FIDO2 Authentication (Biometric Login)

```
Build FIDO2 biometric authentication flow using these verified API contracts:

STEP 1 — Initiate authentication (get challenge)
  POST /v1/app/auth
  Auth: BearerAuth (JWT)
  Response: challenge_id, challenge_nonce, expiry

STEP 2 — Retrieve full challenge details
  GET /v1/app/challenge/{challenge_id}
  Auth: BearerAuth (JWT)
  Response: challenge_nonce, allowed_credentials, timeout, user_verification

STEP 3 — User performs biometric (FaceID / TouchID / fingerprint)
  Local device operation — sign challenge_nonce with private key from secure enclave
  Produces: fido2_assertion object containing:
    authenticator_data (base64)
    client_data_json   (base64)
    signature          (base64)
    user_handle        (base64, optional)

STEP 4 — Submit FIDO2 assertion
  POST /v1/app/challenge/{request_id}/respond
  Auth: BearerAuth (JWT)
  Request fields:
    request_id          (string)
    fido2_assertion     (object)
    authenticator_data  (string/base64)
    client_data_json    (string/base64)
    signature           (string/base64)
    user_handle         (string/base64, optional)
    X-Device-Id         (header)
  Response: access_token, token_expiry, session_id

ALTERNATIVE — Biometric via banking app layer:
  POST /api/v1/auth/biometric
  Request fields: user_id, biometric_token, device_id
  Response: session_token, expires_at

PIN FALLBACK:
  POST /api/v1/auth/pin
  Request fields: user_id, pin, device_id
  Response: session_token, expires_at

SESSION MANAGEMENT:
  POST /api/v1/sessions          Create session: user_id, device_id, session_timeout_minutes
  POST /api/v1/sessions/validate Validate: session_id
  GET  /v1/app/challenge/pending Fetch pending challenges for push notification handling

MFA FATIGUE PROTECTION:
  POST /v1/app/challenge/{challenge_id}/fatigue-check
  Request fields: challenge_id, identity_id
  Response: fatigue_status, cooldown_seconds, escalation_required
  — Call before presenting biometric prompt if user has had multiple recent challenges

IMPLEMENTATION REQUIREMENTS:
- challenge_nonce must be signed with the same key registered during device binding (Feature 2)
- Verify client_data_json.challenge matches the server-issued challenge_nonce before signing
- Token storage: access_token in memory only — never persist to disk
- session_timeout_minutes: use 15 for high-security, 60 for standard
- On biometric failure: max 3 attempts then fall back to PIN
- On PIN failure: max 5 attempts then lock account and call /v1/admin/identities/{identity_id}/status PATCH with status=locked

Build: FIDO2 authenticator service, challenge handler, session manager, biometric UI with fallback
```

---

## FEATURE 4 — Bank-Initiated 2FA Login Approval (CIBA Flow)

```
Build the bank-initiated backchannel authentication flow where the bank requests
user login approval via the IdP mobile app using these verified API contracts:

FLOW OVERVIEW:
  Bank backend → IdP CIBA endpoint → Push notification → User approves in IdP app → Bank polls result

BANK SIDE — Initiate authentication request:

STEP 1 — Bank initiates CIBA auth request
  POST /v1/ciba/backchannel-auth-request
  Auth: NationalIdOAuth (client credentials)
  Request fields:
    client_id    (string — bank's registered OAuth client)
    login_hint   (string — user identifier: phone | email | national_id)
  Response: auth_req_id, expires_in, interval (polling interval seconds)

STEP 2 — Bank polls for approval status
  GET /v1/ciba/backchannel-auth-request/{auth_req_id}/status
  Auth: NationalIdOAuth
  Response: status (pending | approved | denied | expired), access_token (when approved)

ALTERNATIVE BANK FLOW (simplified):
  POST /v1/bank/2fa-request
  Request fields: identity_id, transaction_id
  Response: request_id, expires_in

  GET /v1/bank/2fa/{request_id}/status
  Response: status, approved_at

BANK ALSO USES:
  POST /v1/initiate-auth        Banking app initiates user auth via IdP
  GET  /callback/oauth          Bank receives auth code; exchange for token
  POST /v1/oidc/token           Exchange auth code for access + refresh tokens
    Request fields: grant_type, auth_req_id, client_id

USER SIDE — IdP mobile app receives and handles approval:

STEP 1 — App receives push notification, fetches pending challenge
  GET /v1/app/challenge/pending
  Auth: BearerAuth (JWT from device session)
  Response: list of pending challenges with challenge_id, type, requester, expiry

STEP 2 — User views login request details and approves/denies
  POST /app/2fa-approval
  Auth: BearerAuth
  Request fields:
    transaction_id  (string — links to auth_req_id)
    user_id         (string)
    approved        (bool)
    timestamp       (string/ISO8601)
  Response: approval_status, recorded_at

CIBA AUTHORIZATION (alternative path):
  POST /v1/ciba/authorize
  Auth: NationalIdOAuth
  Response: authorization confirmation

IMPLEMENTATION REQUIREMENTS:
- Bank must register as OAuth client first: POST /v1/admin/clients
- Polling interval from CIBA response — respect it, do not poll faster
- auth_req_id expiry is typically 120 seconds — show countdown in bank UI
- Push notification must contain: requester name, action type, expiry time
- User must be able to see full request context before approving
- Denied requests must be recorded in audit log automatically (server-side)
- Implement exponential backoff if polling returns 429

Build: CIBA client (bank side), push handler + approval UI (IdP app side), polling service
```

---

## FEATURE 5 — Transaction Approval (Bank High-Value Transactions)

```
Build the transaction approval flow where the bank requests 2FA for high-value
transactions and the user approves via the IdP mobile app using these verified API contracts:

BANK SIDE — Request transaction approval:

STEP 1 — Bank creates 2FA challenge for transaction
  POST /v1/bank/2fa
  Auth: NationalIdOAuth
  Request fields:
    identity_id    (string)
    transaction_id (string)
  Response: request_id, challenge_type, expires_in

STEP 2 — Bank requests formal transaction approval with full details
  POST /v1/transaction/approve
  Auth: NationalIdOAuth
  Request fields:
    user_id         (string)
    transaction_id  (string)
    amount          (number/decimal)
    currency        (string)
    idp_request_id  (string — from Step 1 response)
  Response: approval_request_id, status, expires_in

STEP 3 — Bank polls for approval decision
  GET /v1/bank/2fa/{request_id}/status
  Auth: NationalIdOAuth
  Response: status (pending | approved | denied | timeout), approved_at, denied_reason

USER SIDE — IdP app presents transaction for approval:

STEP 1 — App receives push, fetches pending challenge
  GET /v1/app/challenge/pending
  Auth: BearerAuth
  Response: pending challenges including transaction type

STEP 2 — User reviews and responds to transaction challenge
  POST /app/transaction-confirmation
  Auth: BearerAuth
  Request fields:
    transaction_id  (string)
    user_id         (string)
    approved        (bool)
    timestamp       (string/ISO8601)
    biometric_proof (string, optional — FIDO2 assertion for high-security)
  Response: confirmation_status, recorded_at

STEP 3 — MFA fatigue check (call before presenting if multiple recent approvals)
  POST /v1/app/challenge/{challenge_id}/fatigue-check
  Request fields: challenge_id, identity_id
  Response: fatigue_status, cooldown_seconds

TRANSACTION DISPLAY REQUIREMENTS:
- Show: amount, currency, recipient name, bank name, timestamp, transaction reference
- For amounts > 10,000 (configure threshold): require biometric re-authentication
- Display remaining expiry countdown — auto-deny on expiry
- Show requester's registered name (from OAuth client record)

AUTHORIZATION RULES (user-configurable):
  POST /api/v1/authorization-rules
  Request fields: user_id, rule_type, threshold_amount, ...
  — Allow users to pre-configure auto-approve rules for trusted payees under threshold

AUDIT:
  POST /v1/admin/audit/log          Server auto-logs all approval/denial events
  GET  /v1/admin/audit/log/{identity_id}   Retrieve audit trail per identity

IMPLEMENTATION REQUIREMENTS:
- Transaction approval window: 120 seconds default — bank configures per request
- Biometric re-auth required for transactions above configurable threshold
- Denied transaction must propagate back to bank within 2 seconds via polling
- All approval events are tamper-evident via audit chain: GET /v1/admin/audit/verify-chain
- Never auto-approve — always require explicit user action
- On app backgrounding during approval: re-authenticate on return

Build: transaction approval service, approval UI with transaction details card, audit trail viewer
```

---

## FEATURE 6 — Merchant Transaction Approval (Merchant OIDC Flow)

```
Build the merchant login and transaction approval flow where the merchant app
authenticates users via the IdP and requests payment approval using these verified API contracts:

MERCHANT LOGIN FLOW:

STEP 1 — Merchant initiates OIDC login
  POST /v1/merchant/login
  Auth: NationalIdOAuth (merchant client credentials)
  Request fields:
    client_id    (string — merchant's registered OAuth client)
    redirect_uri (string — merchant callback URL)
  Response: authorization_url (redirect user to this)

STEP 2 — User authenticates at IdP (handled by IdP — FIDO2 or PIN)
  Internal IdP flow — see Feature 3

STEP 3 — IdP redirects back to merchant with auth code
  GET /callback
  Auth: none (public callback)
  Query params: code (authorization_code), state
  Response: merchant UI receives code

STEP 4 — Merchant exchanges code for tokens
  POST /v1/oidc/token
  Auth: NationalIdOAuth (client credentials)
  Request fields:
    grant_type   (authorization_code)
    auth_req_id  (string — use code from callback)
    client_id    (string)
  Response: access_token, refresh_token, id_token, expires_in

MERCHANT TRANSACTION APPROVAL (payment at merchant terminal):

STEP 5 — Merchant requests payment approval via CIBA
  POST /v1/ciba/backchannel-auth-request
  Auth: NationalIdOAuth (merchant client)
  Request fields:
    client_id   (string — merchant client)
    login_hint  (string — customer phone or national_id)
  Response: auth_req_id, expires_in, interval

STEP 6 — Merchant polls for customer approval
  GET /v1/ciba/backchannel-auth-request/{auth_req_id}/status
  Auth: NationalIdOAuth
  Response: status, access_token (on approval)

CUSTOMER SIDE — IdP app handles merchant approval:
  GET  /v1/app/challenge/pending              Receive merchant payment request
  POST /app/2fa-approval                      Customer approves/denies
    Request: transaction_id, user_id, approved (bool), timestamp

MERCHANT CLIENT MANAGEMENT (admin):
  POST /v1/admin/clients                      Register new merchant as OAuth client
    Request: organization_name, redirect_uris, jwks_uri,
             token_endpoint_auth_method, grant_types_allowed,
             is_fapi_compliant, is_ciba_enabled
  GET  /v1/admin/client/{client_id}           Get merchant client details
  PUT  /v1/admin/client/{client_id}           Update merchant client config
  POST /v1/admin/client/{client_id}/rotate-secret    Rotate client secret
  POST /v1/admin/client/{client_id}/audit-consent    Record consent audit

TOKEN MANAGEMENT:
  POST /v1/oidc/revoke        Revoke token: token, token_type_hint, client_id
  POST /v1/oidc/introspect    Validate token: token, token_type_hint, client_id
  GET  /.well-known/jwks.json Public keys for token verification
  GET  /.well-known/openid-configuration  OIDC discovery document

IMPLEMENTATION REQUIREMENTS:
- Merchant client must have is_ciba_enabled: true for payment approval flows
- is_fapi_compliant: true required for financial-grade merchants
- redirect_uri must exactly match registered value — reject any mismatch
- id_token contains customer identity claims — merchant must not store beyond session
- Customer must see merchant name, amount, and purpose before approving
- Payment approval window: 60 seconds — merchant terminal shows countdown
- On denial: return HTTP 403 to merchant with reason code
- Token introspection endpoint must be called per transaction — do not cache token validity
- Audit consent record required for every merchant that processes customer data

Build: merchant OAuth client, CIBA payment flow, customer approval notification handler,
       merchant admin panel for client management
```

---

## FEATURE 7 — National ID Verification (UAEPASS / SINGPASS / AADHAR)

```
Build the national ID verification flow that binds a user's IdP identity to their
government-issued national ID using these verified API contracts:

STEP 1 — Submit national ID for verification
  POST /v1/app/verify/national-id
  Auth: BearerAuth (JWT)
  Request fields:
    national_id  (string — format varies by provider)
    identity_id  (string)
  Response: verification_id, status (initiated)

STEP 2 — Poll verification status
  GET /v1/app/verify/national-id/{identity_id}/status
  Auth: BearerAuth
  Response: status (pending | verified | failed | manual_review), verified_at

STEP 3 — Submit identity verification with assertion
  POST /v1/app/identity/{identity_id}/verify
  Auth: BearerAuth
  Request fields:
    identity_id            (string)
    provider_code          (string: uaepass | singpass | aadhar)
    assertion_reference    (string — token from national ID provider OAuth)
    payload_checksum       (string — integrity check)
    identity_assurance_level (string: low | substantial | high)
  Response: verification_status, assurance_level_confirmed

STEP 4 — Submit biometric for liveness + face match
  POST /v1/app/verify/biometric
  Auth: BearerAuth
  Request fields:
    identity_id    (string)
    biometric_data (string/base64)
    biometric_type (string: face | fingerprint)
  Response: biometric_verification_id, status

STEP 5 — Check biometric verification status
  GET /v1/app/verify/biometric/{identity_id}/status
  Auth: BearerAuth
  Response: status, liveness_score, match_confidence, verified_at

PROVIDER-SPECIFIC NOTES:
  UAEPASS  — UAE national ID + face biometric. assertion_reference is UAEPASS OAuth token.
             Use /api/v1/kyc/verify-uaepass for banking app layer integration.
  SINGPASS — Singapore MyInfo. assertion_reference is Singpass auth code.
  AADHAR   — India Aadhaar OTP + biometric. Requires UIDAI registered entity.

IDENTITY ASSURANCE LEVELS:
  low         — email/mobile verified only
  substantial — national ID document verified
  high        — national ID + biometric liveness verified

ADMIN OPERATIONS:
  GET   /v1/admin/identities                     List all identities (paginated)
  GET   /v1/admin/identities/{identity_id}       Get single identity
  PATCH /v1/admin/identities/{identity_id}/status  Update: lock | suspend | revoke | reactivate
  GET   /v1/admin/identities/{identity_id}/devices List devices for identity

IMPLEMENTATION REQUIREMENTS:
- identity_assurance_level must reach 'high' before device FIDO2 registration (Feature 2)
- biometric_data must be processed on-device — send only the verification result token
- liveness_score threshold: reject if < 0.85
- match_confidence threshold: reject if < 0.90
- Verification timeout: 30 seconds for national ID, 60 seconds for biometric
- Failed verification after 3 attempts: escalate to manual_review status
- Store assurance_level in identity record — gate transaction limits by level

Build: national ID verification service, biometric capture UI, verification status poller,
       admin identity management panel
```

---

## CROSS-FEATURE SHARED CONTRACTS

```
These endpoints are used across multiple features — build as shared services:

OIDC DISCOVERY & KEYS:
  GET /.well-known/openid-configuration   IdP discovery document
  GET /.well-known/jwks.json              Public signing keys
  GET /v1/oidc/jwks                       JWKS endpoint (alternate)

TOKEN OPERATIONS:
  POST /v1/oidc/token       Exchange code/grant for tokens
  POST /v1/oidc/revoke      Revoke access or refresh token
  POST /v1/oidc/introspect  Validate token and get claims

ADMIN AUTH:
  POST /v1/admin/auth/token   Service account JWT (for bank/merchant backends)

AUDIT:
  POST /v1/admin/audit/log              Log security event
  GET  /v1/admin/audit/log/{identity_id} Get identity audit trail
  GET  /v1/admin/audit/verify-chain      Verify audit chain integrity

KEY MANAGEMENT:
  POST /v1/admin/key/rotate             Rotate signing keys
  GET  /v1/admin/key                    List active keys
  POST /v1/admin/key/{key_id}/revoke    Revoke specific key

MONITORING:
  GET /health                                         Health check
  GET /v1/admin/monitoring/overview                   System overview
  GET /v1/admin/monitoring/journey-funnels            Auth funnel metrics
  GET /v1/admin/monitoring/journey-performance        Latency/success rates
  GET /v1/admin/monitoring/journey-errors             Error breakdown

IMPLEMENTATION NOTES:
- Cache JWKS for 1 hour — refresh on signature verification failure
- All admin endpoints require service account JWT from /v1/admin/auth/token
- Audit chain must be verified before presenting audit logs to compliance team
- Health check must be called by load balancer every 10 seconds
```

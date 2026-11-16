# Payments: plug-and-play gateways, configured by the super admin

Request (2026-11-15): "payment method integration dynamic and configurable and like plug and play sort of.. from superadmin".

## Shape

- `PaymentGateway` contract (`app/contracts`): `start` (checkout → gateway page or manual), `verify` (server-to-server
  check of what came back), `check` (test the keys). Drivers in `app/providers/payments`: `manual`, `bkash` (tokenized
  checkout: grant → create → execute), `sslcommerz` (session → hosted page → validation API). New driver = one file + one
  match arm in `payments::make` + one enum value (`PaymentDriver`, SQL CHECK, `make types`).
- `payment_gateways` rows: slug, driver, names (en/bn), public JSON (manual instructions, account to pay into), sandbox,
  active, sort, and `secrets` = AES-256-GCM (APP_KEY) of the driver's keys. Keys are write-only in the admin: the API says
  only whether each is set. Without APP_KEY nothing can be stored (the admin shows a warning).
- `payments`: one row per checkout (tier, months 1–24, amount = monthly price × months, status pending → review → paid /
  failed / cancelled / refunded). Settling is one guarded UPDATE in a transaction with the account change, so a repeated
  return or IPN cannot apply twice.
- A paid tier ends on `users.tier_expires_on` (30 days per month; buying the same tier again extends it). Past that day
  the account is on the default tier (checked on every request; no cron). A tier set by an admin has no end day.

## Flows

- Gateway: `POST /me/checkout` → redirect to bKash / SSLCommerz → back to `/api/v1/billing/return/{id}` (GET for bKash,
  POST form and IPN for SSLCommerz) → verified with the gateway (bKash execute = Completed with our invoice; SSLCommerz
  VALID/VALIDATED with our tran_id, BDT) and the amount must equal ours → `/account?billing=paid|failed|cancelled|pending`.
- Manual (bKash / Nagad Send Money, bank): the payer sees the account and amount, types the TrxID (review); an admin matches
  it with the statement and approves (paid) or rejects (failed).
- Admin → Payments: filter by status, search email / payment id / TrxID, approve / reject / mark refunded (the refund
  itself is done in the gateway's own panel). Admin → Payment gateways (super admin): add, fill keys, test, switch on.
  Everything is written to the audit log (never the key values).

## Before going live

- Merchant accounts: bKash tokenized (app key/secret, username/password) and SSLCommerz (store id/password); test in
  sandbox first. `APP_URL` must be the public https address (gateways call it back).
- Keep APP_KEY safe and stable: changing it makes stored keys unreadable (re-enter them).

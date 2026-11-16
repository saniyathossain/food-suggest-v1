-- Payments, plug and play: each gateway is a row the super admin adds and configures (driver, sandbox or live, public
-- settings, secrets encrypted with APP_KEY), and each driver is one implementation of the PaymentGateway contract
-- (manual, bkash, sslcommerz…). A payment buys a tier for some months; when it is confirmed (by the gateway's own server,
-- or by an admin for manual transfers) the account moves to that tier until `tier_expires_on`.
ALTER TABLE users ADD COLUMN tier_expires_on varchar(10);

CREATE TABLE payment_gateways (
  id         serial PRIMARY KEY,
  slug       varchar(40) NOT NULL UNIQUE,
  driver     text NOT NULL CHECK (driver IN ('manual', 'bkash', 'sslcommerz')),
  name       jsonb NOT NULL,
  -- what the payer sees: instructions, the account to send to, a logo word
  public     jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- AES-256-GCM (APP_KEY) of the driver's secret JSON (keys, passwords); never sent to a browser
  secrets    text,
  sandbox    boolean NOT NULL DEFAULT true,
  active     boolean NOT NULL DEFAULT false,
  sort       integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id          varchar(32) PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tier_id     integer NOT NULL REFERENCES tiers (id) ON DELETE RESTRICT,
  gateway_id  integer NOT NULL REFERENCES payment_gateways (id) ON DELETE RESTRICT,
  months      smallint NOT NULL CHECK (months BETWEEN 1 AND 24),
  amount_bdt  integer NOT NULL CHECK (amount_bdt >= 0),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'paid', 'failed', 'cancelled', 'refunded')),
  -- the gateway's id for it (bKash paymentID, SSLCommerz val_id…) and the payer's transaction id for manual transfers
  gateway_ref varchar(120) NOT NULL DEFAULT '',
  payer_ref   varchar(120) NOT NULL DEFAULT '',
  -- what the gateway answered (never card data)
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  paid_on     varchar(10)
);
CREATE INDEX payments_user_idx ON payments (user_id, created_at DESC);
CREATE INDEX payments_status_idx ON payments (status, created_at DESC);
CREATE INDEX payments_gateway_idx ON payments (gateway_id);
CREATE INDEX payments_tier_idx ON payments (tier_id);

-- a manual transfer gateway to start with (off until the super admin fills in the account and switches it on)
INSERT INTO payment_gateways (slug, driver, name, public, sandbox, active, sort) VALUES
  ('bkash-send-money', 'manual', jsonb_build_object('en', 'bKash Send Money', 'bn', 'বিকাশ সেন্ড মানি'),
   jsonb_build_object('instructions', jsonb_build_object('en', 'Send the amount to the bKash number below with Send Money, then enter the Transaction ID (TrxID). We switch your plan on after checking it.', 'bn', 'নিচের বিকাশ নম্বরে সেন্ড মানি করে টাকা পাঠান, তারপর ট্রানজ্যাকশন আইডি (TrxID) দিন। যাচাইয়ের পর আপনার প্ল্যান চালু করা হবে।'), 'account', ''),
   false, false, 0)
ON CONFLICT (slug) DO NOTHING;

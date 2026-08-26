-- Every genuine quote request and contact message, written before the email is
-- sent so a lead is never lost to a mail outage. Applied with
--   npx wrangler d1 migrations apply instinct-apparel-leads --remote   (production)
--   npx wrangler d1 migrations apply instinct-apparel-leads --local    (astro dev)
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at   TEXT    NOT NULL,             -- ISO 8601, UTC
  type          TEXT    NOT NULL,             -- 'quote' | 'contact'
  name          TEXT    NOT NULL DEFAULT '',
  role          TEXT    NOT NULL DEFAULT '',
  email         TEXT    NOT NULL DEFAULT '',
  phone         TEXT    NOT NULL DEFAULT '',
  org           TEXT    NOT NULL DEFAULT '',  -- club / school / group
  sport         TEXT    NOT NULL DEFAULT '',
  garments      TEXT    NOT NULL DEFAULT '',
  quantity      TEXT    NOT NULL DEFAULT '',
  needed_by     TEXT    NOT NULL DEFAULT '',
  message       TEXT    NOT NULL DEFAULT '',  -- quote notes or contact message
  artwork       TEXT    NOT NULL DEFAULT '',  -- attached filenames (the files themselves are only in the email)
  source        TEXT    NOT NULL DEFAULT '',  -- JSON: utm_*, gclid, fbclid, referrer, landing, at
  page          TEXT    NOT NULL DEFAULT '',  -- hostname the form was posted on
  email_status  TEXT    NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  email_error   TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS submissions_received_at ON submissions (received_at);
CREATE INDEX IF NOT EXISTS submissions_type ON submissions (type);

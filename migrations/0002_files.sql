-- Stored artwork: JSON array of {key, name, size, type} pointing at objects in
-- the ARTWORK KV namespace (12-month expiry). The `artwork` column keeps the
-- human-readable filename list.
ALTER TABLE submissions ADD COLUMN files TEXT NOT NULL DEFAULT '';

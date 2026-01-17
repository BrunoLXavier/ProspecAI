-- SQL to assign 'admin' role to existing admin users if missing
-- Run this against the ProspecAI Postgres database.
-- Two variants provided: prefer the one that matches your Postgres extensions.

-- VARIANT A: If your Postgres has pgcrypto (gen_random_uuid)
-- (Run: CREATE EXTENSION IF NOT EXISTS pgcrypto; )

INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
SELECT gen_random_uuid(), u.id, 'admin', u.tenant_id, now()
FROM users u
WHERE u.email = 'admin@prospecai.com'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'admin'
  );

-- VARIANT B: If your Postgres has uuid-ossp (uuid_generate_v4)
-- (Run: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; )

-- INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
-- SELECT uuid_generate_v4(), u.id, 'admin', u.tenant_id, now()
-- FROM users u
-- WHERE u.email = 'admin@prospecai.com'
--   AND NOT EXISTS (
--     SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'admin'
--   );

-- If neither extension is enabled, you can generate a UUID client-side and run a parameterized insert, for example in psql:
-- \set ur_id `uuidgen`
-- INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
-- SELECT :'ur_id', u.id, 'admin', u.tenant_id, now()
-- FROM users u
-- WHERE u.email = 'admin@prospecai.com'
--   AND NOT EXISTS (
--     SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'admin'
--   );

-- Disposable local development credentials; never apply this file in production.
CREATE ROLE dayjoin_migrator LOGIN PASSWORD 'local_migration_only'
  NOSUPERUSER NOCREATEROLE CREATEDB NOREPLICATION NOBYPASSRLS;
CREATE ROLE dayjoin_app LOGIN PASSWORD 'local_app_only'
  NOSUPERUSER NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS;

ALTER DATABASE dayjoin OWNER TO dayjoin_migrator;
REVOKE ALL ON DATABASE dayjoin FROM PUBLIC;
GRANT CONNECT ON DATABASE dayjoin TO dayjoin_app;
ALTER SCHEMA public OWNER TO dayjoin_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO dayjoin_app;
-- Future migrations must enable and test tenant RLS before any business data is served.
ALTER DEFAULT PRIVILEGES FOR ROLE dayjoin_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dayjoin_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dayjoin_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dayjoin_app;

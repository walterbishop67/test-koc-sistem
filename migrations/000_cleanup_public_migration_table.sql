-- Migration: 000_cleanup_public_migration_table
-- public._schema_migrations tablosu PostgREST schema cache'ini bozuyordu.
-- extensions schema'ya taşındı; eskisi varsa düşür.
DROP TABLE IF EXISTS public._schema_migrations;

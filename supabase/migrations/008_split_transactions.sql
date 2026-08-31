-- Migration: split transactions
-- Run in Supabase SQL Editor. Adds a column linking pieces of a split
-- transaction together — purely informational, not used for any balance
-- math (each piece is a normal transaction that affects the balance on its
-- own). If you're setting up a brand new project, schema.sql already
-- includes this column and you don't need to run this file.

alter table transactions add column if not exists split_parent_id uuid;

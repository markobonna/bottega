-- Software revision 4: Spark builds software directly (designed HTML/CSS/JS),
-- no block-catalog straitjacket. The brief is the user's description; the
-- files are the generated app + bounded revision history.
alter table public.apps add column if not exists brief text;
alter table public.apps add column if not exists build_files jsonb;

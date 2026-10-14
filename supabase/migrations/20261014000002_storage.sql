-- Private bucket for original source documents (the Word/PDF files the templates came from).
-- Only the administrator can list or download them (via short-lived signed URLs); visitors cannot.
-- Needs the Supabase `storage` schema, so this file is applied separately from the schema migration.

insert into storage.buckets (id, name, public, file_size_limit)
values ('source-documents', 'source-documents', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists source_documents_admin_read on storage.objects;
create policy source_documents_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'source-documents' and public.is_admin());

drop policy if exists source_documents_admin_write on storage.objects;
create policy source_documents_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'source-documents' and public.is_admin());

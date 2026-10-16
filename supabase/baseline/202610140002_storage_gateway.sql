begin;
-- Storage creates a placeholder row before the gateway attaches validated metadata.
-- Size/MIME limits are enforced by the trusted Storage gateway via bucket settings.
-- User JWTs cannot access the storage schema via PostgREST (only public is exposed).
drop policy photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated with check (
 bucket_id='job-photos' and public.photo_upload_allowed(name));
commit;

-- Run once as postgres in Supabase SQL Editor, after the account confirms its email
-- and completes a patient profile at /cuenta. Replace only the email placeholder.
-- No passwords or secret keys belong in this file.
BEGIN;
DO $bootstrap$
DECLARE target_user uuid; target_profile uuid;
BEGIN
 SELECT id INTO STRICT target_user FROM auth.users
 WHERE lower(email)=lower('REEMPLAZAR_CORREO_ADMIN') AND email_confirmed_at IS NOT NULL;
 target_profile := private.bootstrap_access_admin(target_user);
 INSERT INTO public.role_assignments(profile_id,role,granted_by)
 VALUES(target_profile,'operations_admin',target_profile);
 INSERT INTO public.audit_events(system_actor,action,entity_type,entity_id)
 VALUES('sql_bootstrap','bootstrap_operations_admin','profiles',target_profile);
END;
$bootstrap$;
COMMIT;

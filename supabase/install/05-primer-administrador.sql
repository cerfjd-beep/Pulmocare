-- Run as postgres in Supabase SQL Editor after confirming the account email.
-- Creates the administrator profile directly; a patient profile is not required.
-- No passwords or secret keys belong in this file.
BEGIN;
DO $bootstrap$
DECLARE target_user uuid; target_profile uuid; confirmed_at timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(11092026);
 SELECT id,email_confirmed_at INTO target_user,confirmed_at FROM auth.users
 WHERE lower(email)=lower('13.guzman@gmail.com');
 IF target_user IS NULL THEN
  RAISE EXCEPTION 'Crea primero 13.guzman@gmail.com en Authentication > Users con su contraseña';
 END IF;
 IF confirmed_at IS NULL THEN
  RAISE EXCEPTION 'Confirma el correo 13.guzman@gmail.com en Authentication antes de continuar';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_user::text,0));
 SELECT id INTO target_profile FROM public.profiles WHERE auth_user_id=target_user;
 IF target_profile IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id=target_profile AND active
 ) THEN
  RAISE EXCEPTION 'El perfil está desactivado; revisa su estado antes de conceder accesos';
 END IF;
 IF target_profile IS NULL THEN
  INSERT INTO public.profiles(auth_user_id,display_name)
  VALUES(target_user,'Administrador Pulmocare') RETURNING id INTO target_profile;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.role_assignments
  WHERE profile_id=target_profile AND role='access_admin' AND revoked_at IS NULL) THEN
  target_profile := private.bootstrap_access_admin(target_user);
 END IF;
 INSERT INTO public.role_assignments(profile_id,role,granted_by)
 VALUES(target_profile,'operations_admin',target_profile)
 ON CONFLICT (profile_id,role) WHERE revoked_at IS NULL DO NOTHING;
 IF FOUND THEN
  INSERT INTO public.audit_events(system_actor,action,entity_type,entity_id)
  VALUES('sql_bootstrap','bootstrap_operations_admin','profiles',target_profile);
 END IF;
END;
$bootstrap$;
COMMIT;
SELECT p.display_name, u.email, r.role
FROM public.profiles p JOIN auth.users u ON u.id=p.auth_user_id
JOIN public.role_assignments r ON r.profile_id=p.id AND r.revoked_at IS NULL
WHERE lower(u.email)='13.guzman@gmail.com';

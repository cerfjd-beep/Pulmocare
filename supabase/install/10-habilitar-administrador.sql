-- Ejecutar como postgres en SQL Editor. Cuenta autorizada: 13.guzman@gmail.com.
-- Conserva los administradores existentes y todos los perfiles de paciente.
BEGIN;
DO $grant_admin$
DECLARE target_user uuid; target_profile uuid; assigned_role text; assignment uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(11092026);
  SELECT id INTO target_user FROM auth.users
    WHERE lower(email) = '13.guzman@gmail.com' AND email_confirmed_at IS NOT NULL;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'No existe la cuenta confirmada 13.guzman@gmail.com';
  END IF;
  SELECT id INTO target_profile FROM public.profiles
    WHERE auth_user_id = target_user AND active FOR UPDATE;
  IF target_profile IS NULL THEN
    RAISE EXCEPTION 'La cuenta debe tener un perfil activo antes de asignar los permisos';
  END IF;
  FOREACH assigned_role IN ARRAY ARRAY['access_admin', 'operations_admin'] LOOP
    assignment := NULL;
    INSERT INTO public.role_assignments(profile_id, role, granted_by)
      VALUES (target_profile, assigned_role, target_profile)
      ON CONFLICT (profile_id, role) WHERE revoked_at IS NULL DO NOTHING
      RETURNING id INTO assignment;
    IF assignment IS NOT NULL THEN
      INSERT INTO public.audit_events(system_actor, action, entity_type, entity_id)
      VALUES ('sql_administration', 'authorized_admin_role_granted', 'role_assignments', assignment);
    END IF;
  END LOOP;
END;
$grant_admin$;
COMMIT;
SELECT u.email, p.active AS profile_active, array_agg(r.role ORDER BY r.role) AS roles
FROM auth.users u
JOIN public.profiles p ON p.auth_user_id = u.id
JOIN public.role_assignments r ON r.profile_id = p.id AND r.revoked_at IS NULL
WHERE lower(u.email) = '13.guzman@gmail.com'
GROUP BY u.email, p.active;

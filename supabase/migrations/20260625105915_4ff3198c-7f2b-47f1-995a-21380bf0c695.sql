
DROP FUNCTION IF EXISTS public.get_author_info(uuid);
DROP FUNCTION IF EXISTS private.get_author_info(uuid);

CREATE FUNCTION private.get_author_info(_user_id uuid)
RETURNS TABLE(display_name text, is_professional boolean, is_provider boolean, contributions integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    COALESCE((SELECT p.display_name FROM public.profiles p WHERE p.id = _user_id), 'Member'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'professional'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'provider'),
    (
      (SELECT COUNT(*) FROM public.buildings WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.wells WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.hazard_reports WHERE user_id = _user_id) +
      (SELECT COUNT(*) FROM public.soil_data WHERE user_id = _user_id)
    )::int;
$$;

CREATE FUNCTION public.get_author_info(_user_id uuid)
RETURNS TABLE(display_name text, is_professional boolean, is_provider boolean, contributions integer)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$ SELECT * FROM private.get_author_info(_user_id) $$;

GRANT EXECUTE ON FUNCTION public.get_author_info(uuid) TO anon, authenticated;

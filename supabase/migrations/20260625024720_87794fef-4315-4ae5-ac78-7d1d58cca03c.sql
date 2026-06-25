-- Attach trigger so profiles and user_roles rows are created on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users that lack a profile/role row
INSERT INTO public.profiles (id, display_name, license_number)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)),
       NULLIF(u.raw_user_meta_data->>'license_number','')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       COALESCE((u.raw_user_meta_data->>'role')::public.app_role, 'local')
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;
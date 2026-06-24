DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
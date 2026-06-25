-- Allow guest (anon) read access to community data so guest users can browse InfoHub.
-- Authoring/mutations remain limited to signed-in owners.

-- Buildings
GRANT SELECT ON public.buildings TO anon;
DROP POLICY IF EXISTS "Buildings readable by anon" ON public.buildings;
CREATE POLICY "Buildings readable by anon" ON public.buildings FOR SELECT TO anon USING (true);

-- Wells
GRANT SELECT ON public.wells TO anon;
DROP POLICY IF EXISTS "Wells readable by anon" ON public.wells;
CREATE POLICY "Wells readable by anon" ON public.wells FOR SELECT TO anon USING (true);

-- Well readings
GRANT SELECT ON public.well_readings TO anon;
DROP POLICY IF EXISTS "Well readings readable by anon" ON public.well_readings;
CREATE POLICY "Well readings readable by anon" ON public.well_readings FOR SELECT TO anon USING (true);

-- Hazard reports
GRANT SELECT ON public.hazard_reports TO anon;
DROP POLICY IF EXISTS "Reports readable by anon" ON public.hazard_reports;
CREATE POLICY "Reports readable by anon" ON public.hazard_reports FOR SELECT TO anon USING (true);

-- Soil data
GRANT SELECT ON public.soil_data TO anon;
DROP POLICY IF EXISTS "Soil readable by anon" ON public.soil_data;
CREATE POLICY "Soil readable by anon" ON public.soil_data FOR SELECT TO anon USING (true);

-- Ensure guests can resolve author display name / contribution badge / role
GRANT EXECUTE ON FUNCTION public.get_author_info(uuid) TO anon;
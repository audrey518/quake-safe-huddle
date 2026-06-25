GRANT SELECT ON public.buildings TO anon;
GRANT SELECT ON public.wells TO anon;
GRANT SELECT ON public.well_readings TO anon;
GRANT SELECT ON public.hazard_reports TO anon;
GRANT SELECT ON public.soil_data TO anon;

CREATE POLICY "Buildings readable by anon" ON public.buildings FOR SELECT TO anon USING (true);
CREATE POLICY "Wells readable by anon" ON public.wells FOR SELECT TO anon USING (true);
CREATE POLICY "Well readings readable by anon" ON public.well_readings FOR SELECT TO anon USING (true);
CREATE POLICY "Reports readable by anon" ON public.hazard_reports FOR SELECT TO anon USING (true);
CREATE POLICY "Soil readable by anon" ON public.soil_data FOR SELECT TO anon USING (true);
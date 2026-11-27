CREATE TABLE public.pathogens (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), user_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE, name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120), gram text NOT NULL DEFAULT '?' CHECK (gram IN ('+','-','?')), who_priority text NOT NULL DEFAULT 'none' CHECK (who_priority IN ('critical','high','medium','none')), family text NOT NULL DEFAULT '' CHECK (char_length(family) <= 120), resistance_genes text NOT NULL DEFAULT '' CHECK (char_length(resistance_genes) <= 500));
CREATE UNIQUE INDEX pathogens_owner_name_idx ON public.pathogens (user_id, lower(name)) NULLS NOT DISTINCT;
GRANT SELECT ON public.pathogens TO anon;
GRANT SELECT, INSERT, DELETE ON public.pathogens TO authenticated;
GRANT ALL ON public.pathogens TO service_role;
ALTER TABLE public.pathogens ENABLE ROW LEVEL SECURITY;
CREATE POLICY pathogens_read_public ON public.pathogens FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY pathogens_read ON public.pathogens FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = (select auth.uid()));
CREATE POLICY pathogens_insert_own ON public.pathogens FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY pathogens_delete_own ON public.pathogens FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

CREATE TABLE public.antibiotics (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), user_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE, name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120), drug_class text NOT NULL DEFAULT '' CHECK (char_length(drug_class) <= 120), disk_r numeric CHECK (disk_r BETWEEN 5 AND 50), disk_s numeric CHECK (disk_s BETWEEN 5 AND 50), mic_s numeric CHECK (mic_s > 0 AND mic_s <= 1024), mic_r numeric CHECK (mic_r > 0 AND mic_r <= 1024), CHECK (disk_r IS NULL OR disk_s IS NULL OR disk_r < disk_s), CHECK ((disk_r IS NULL) = (disk_s IS NULL)), CHECK ((mic_s IS NULL) = (mic_r IS NULL)), CHECK (mic_s IS NULL OR mic_s <= mic_r));
CREATE UNIQUE INDEX antibiotics_owner_name_idx ON public.antibiotics (user_id, lower(name)) NULLS NOT DISTINCT;
GRANT SELECT ON public.antibiotics TO anon;
GRANT SELECT, INSERT, DELETE ON public.antibiotics TO authenticated;
GRANT ALL ON public.antibiotics TO service_role;
ALTER TABLE public.antibiotics ENABLE ROW LEVEL SECURITY;
CREATE POLICY antibiotics_read_public ON public.antibiotics FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY antibiotics_read ON public.antibiotics FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = (select auth.uid()));
CREATE POLICY antibiotics_insert_own ON public.antibiotics FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY antibiotics_delete_own ON public.antibiotics FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

INSERT INTO public.pathogens (user_id, name, gram, who_priority, family, resistance_genes) VALUES
(NULL,'Escherichia coli','-','critical','Enterobacteriaceae','CTX-M (БЛРС), NDM, OXA-48, mcr-1'),
(NULL,'Klebsiella pneumoniae','-','critical','Enterobacteriaceae','CTX-M, SHV, KPC, NDM, OXA-48'),
(NULL,'Acinetobacter baumannii','-','critical','Moraxellaceae','OXA-23, OXA-24/40, NDM'),
(NULL,'Pseudomonas aeruginosa','-','high','Pseudomonadaceae','VIM, IMP, MexAB-OprM, OprD'),
(NULL,'Staphylococcus aureus','+','high','Staphylococcaceae','mecA (PBP2a), blaZ, vanA'),
(NULL,'Enterococcus faecium','+','high','Enterococcaceae','vanA, vanB'),
(NULL,'Serratia marcescens','-','critical','Yersiniaceae','AmpC, SME, KPC'),
(NULL,'Enterobacter cloacae','-','critical','Enterobacteriaceae','AmpC, CTX-M, NDM'),
(NULL,'Streptococcus pneumoniae','+','medium','Streptococcaceae','PBP мутации, ermB, mefA'),
(NULL,'Salmonella enterica','-','high','Enterobacteriaceae','CTX-M, qnr, gyrA');

INSERT INTO public.antibiotics (user_id, name, drug_class, disk_r, disk_s, mic_s, mic_r) VALUES
(NULL,'Амоксициллин','Аминопенициллины',13,17,8,8),
(NULL,'Цефтриаксон','Цефалоспорины III',19,23,1,2),
(NULL,'Цефепим','Цефалоспорины IV',23,27,1,4),
(NULL,'Пиперациллин/тазобактам','Ингибиторозащищённые пенициллины',19,20,8,8),
(NULL,'Меропенем','Карбапенемы',15,22,2,8),
(NULL,'Имипенем','Карбапенемы',18,22,2,4),
(NULL,'Ципрофлоксацин','Фторхинолоны',21,26,0.25,0.5),
(NULL,'Левофлоксацин','Фторхинолоны',18,23,0.5,1),
(NULL,'Гентамицин','Аминогликозиды',16,17,2,2),
(NULL,'Амикацин','Аминогликозиды',17,18,8,8),
(NULL,'Колистин','Полимиксины',NULL,NULL,2,2),
(NULL,'Ванкомицин','Гликопептиды',NULL,NULL,2,2),
(NULL,'Линезолид','Оксазолидиноны',20,21,4,4);

ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_bacteria_check;
ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_antibiotic_check;
ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_diameter_mm_check;
ALTER TABLE public.measurements ADD CONSTRAINT measurements_bacteria_len CHECK (char_length(trim(bacteria)) BETWEEN 2 AND 120);
ALTER TABLE public.measurements ADD CONSTRAINT measurements_antibiotic_len CHECK (char_length(trim(antibiotic)) BETWEEN 2 AND 120);
ALTER TABLE public.measurements ADD CONSTRAINT measurements_diameter_range CHECK (diameter_mm IS NULL OR diameter_mm BETWEEN 6 AND 50);
ALTER TABLE public.measurements ADD COLUMN city text CHECK (city IS NULL OR char_length(trim(city)) BETWEEN 1 AND 120);
ALTER TABLE public.measurements ADD COLUMN biomaterial text CHECK (biomaterial IS NULL OR biomaterial IN ('Кровь','Мокрота','Моча','Раневое отделяемое','Ликвор'));
ALTER TABLE public.measurements ADD COLUMN method text NOT NULL DEFAULT 'disk' CHECK (method IN ('disk','mic'));
ALTER TABLE public.measurements ADD COLUMN mic_mgl numeric CHECK (mic_mgl IS NULL OR (mic_mgl > 0 AND mic_mgl <= 1024));
ALTER TABLE public.measurements ADD COLUMN photo_path text CHECK (photo_path IS NULL OR char_length(photo_path) <= 300);
ALTER TABLE public.measurements ALTER COLUMN diameter_mm DROP NOT NULL;
ALTER TABLE public.measurements ADD CONSTRAINT measurements_method_value CHECK ((method = 'disk' AND diameter_mm IS NOT NULL) OR (method = 'mic' AND mic_mgl IS NOT NULL));
GRANT DELETE ON public.measurements TO authenticated;
CREATE POLICY measurements_delete_own ON public.measurements FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_measurement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE r numeric; s numeric; ms numeric; mr numeric; legacy boolean := false; BEGIN
IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Invalid owner'; END IF;
IF NEW.bacteria = 'S. aureus' AND NEW.antibiotic IN ('Амоксициллин','Ципрофлоксацин','Цефтриаксон') THEN legacy := true; CASE NEW.antibiotic WHEN 'Амоксициллин' THEN r := 20; s := 29; WHEN 'Ципрофлоксацин' THEN r := 15; s := 21; ELSE r := 13; s := 21; END CASE;
ELSIF NEW.bacteria IN ('E. coli','K. pneumoniae') AND NEW.antibiotic IN ('Амоксициллин','Ципрофлоксацин','Цефтриаксон') THEN legacy := true; CASE NEW.antibiotic WHEN 'Амоксициллин' THEN r := 13; s := 17; WHEN 'Ципрофлоксацин' THEN r := 21; s := 26; ELSE r := 19; s := 23; END CASE;
END IF;
IF NOT legacy THEN
  IF NOT EXISTS (SELECT 1 FROM public.pathogens p WHERE lower(p.name) = lower(trim(NEW.bacteria)) AND (p.user_id IS NULL OR p.user_id = NEW.user_id)) THEN RAISE EXCEPTION 'Unknown pathogen'; END IF;
  SELECT a.disk_r, a.disk_s, a.mic_s, a.mic_r INTO r, s, ms, mr FROM public.antibiotics a WHERE lower(a.name) = lower(trim(NEW.antibiotic)) AND (a.user_id IS NULL OR a.user_id = NEW.user_id) ORDER BY a.user_id NULLS LAST LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown antibiotic'; END IF;
END IF;
NEW.location := trim(NEW.location); NEW.bacteria := trim(NEW.bacteria); NEW.antibiotic := trim(NEW.antibiotic);
IF NEW.method = 'disk' THEN
  IF r IS NULL THEN RAISE EXCEPTION 'No disk breakpoints'; END IF;
  NEW.mic_mgl := NULL;
  NEW.status := CASE WHEN NEW.diameter_mm <= r THEN 'R' WHEN NEW.diameter_mm >= s THEN 'S' ELSE 'I' END;
  NEW.is_borderline := abs(NEW.diameter_mm-r) <= 1.5 OR abs(NEW.diameter_mm-s) <= 1.5;
ELSE
  IF ms IS NULL THEN RAISE EXCEPTION 'No MIC breakpoints'; END IF;
  NEW.diameter_mm := NULL;
  NEW.status := CASE WHEN NEW.mic_mgl <= ms THEN 'S' WHEN NEW.mic_mgl > mr THEN 'R' ELSE 'I' END;
  NEW.is_borderline := abs(log(2::numeric, NEW.mic_mgl) - log(2::numeric, ms)) <= 1 OR abs(log(2::numeric, NEW.mic_mgl) - log(2::numeric, mr)) <= 1;
END IF;
NEW.created_at := now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.validate_measurement() FROM PUBLIC, anon, authenticated;

CREATE POLICY plate_photos_read_own ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'plate-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY plate_photos_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'plate-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY plate_photos_delete_own ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'plate-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);
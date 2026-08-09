-- =====================================================================
-- Batch 9.14 (CORRECTED) — Chinese names for the international schools,
-- from your MOE .doc source (converted to
-- International_Schools_English_Chinese.csv).
--
-- WHY THE ORIGINAL 9.14 FAILED:
-- Six of the "official" international-school rows Batch 9.13 imported
-- are actually the SAME real-world schools as six hand-typed entries
-- already sitting in the table from Batch 9.12 — just under a different
-- name_zh string. Batch 9.12 guessed a Chinese name up front (e.g.
-- '臺北美國學校' for Taipei American School); Batch 9.13's official MOE
-- source had no Chinese name at all, so it stored the English name in
-- name_zh as a placeholder ('Taipei American School'). Because those are
-- two different literal strings, the unique(name_zh) constraint never
-- caught the overlap — both rows made it into the table. The original
-- 9.14 script then tried to rename the 9.13 row to the school's real
-- Chinese name, which collided head-on with the 9.12 row already
-- sitting on that exact name_zh:
--   ERROR: duplicate key value violates unique constraint
--   "taiwan_high_schools_name_zh_key" — Key (name_zh)=(臺北美國學校)
--   already exists.
--
-- THE FIX:
-- Before renaming anything, merge each duplicate pair into a single row.
-- We keep the Batch 9.13-origin row (it has the correct name_en) and
-- retire the Batch 9.12-origin row — but first re-point anything that
-- might already reference the old row's id, so nothing silently
-- disappears:
--   - student_academic_config.school_id -> repointed to the surviving row
--     (a student who already selected the old hand-typed entry keeps
--     their selection, it just now points at the merged row)
--   - school_courses usage counts -> merged into the surviving row's
--     counts (added together), not dropped by the "on delete cascade"
--     that would otherwise silently wipe them when the old row is deleted
-- Only then do we delete the retired row and proceed with the renames,
-- exactly as the original migration intended.
--
-- ONE JUDGMENT CALL WORTH FLAGGING:
-- Batch 9.12's hand-typed entry "馬禮遜美國學校" (generic "Morrison
-- Academy") didn't specify which of Morrison's three Taiwan campuses —
-- Kaohsiung / New Taipei City / Taichung, all separate rows in the
-- official 9.13 import — it meant. This migration assumes it meant the
-- original/main Taichung campus. If anyone had already selected this
-- school and actually meant the Kaohsiung or New Taipei City campus,
-- they'll need to reselect it after this runs — worth a quick check
-- since it's an assumption, not a certainty.
--
-- Everything else is unchanged from the original 9.14:
-- 1. "American Schoolin Taichung" — a missing-space typo already present
--    in the ORIGINAL International.csv source, carried through Batch
--    9.13. Your new source confirms the correct name is "American School
--    in Taichung", so this migration fixes the typo in name_en too, not
--    just adding name_zh.
-- 2. 臺北伯大尼美國學校 / Taipei Bethany American School was in your new
--    source but was NOT one of the 22 schools in the original
--    International.csv, so there's nothing to match/update — it's
--    inserted as a new row instead.
-- 3. Four schools from the Batch 9.13 list aren't in your new source
--    (Asia American International Academy, Hsinchu County American
--    School, Morrison Academy – New Taipei City, Taoyuan American
--    School) and are left untouched — still English-name-only until a
--    Chinese name turns up for them specifically.
--
-- Safe to run even if some/all of the merge has already happened (each
-- step checks before acting), so re-running this is not harmful.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- =====================================================================

-- ---- STEP 1: merge the six duplicate pairs before any renaming ----
do $$
declare
  old_id uuid;
  new_id uuid;
  pairs text[][] := array[
    array['臺北美國學校', 'Taipei American School'],
    array['臺北歐洲學校', 'Taipei European School Foundation'],
    array['陽明山美國學校', 'Grace Christian Academy'],
    array['馬禮遜美國學校', 'Morrison Academy -Taichung'],
    array['道明外僑學校', 'Dominican International School'],
    array['奉元國際學校', 'Kaohsiung American School']
  ];
  pair text[];
begin
  foreach pair slice 1 in array pairs
  loop
    select id into old_id from public.taiwan_high_schools
      where school_type = 'international' and name_zh = pair[1];
    select id into new_id from public.taiwan_high_schools
      where school_type = 'international' and name_zh = pair[2];

    if old_id is not null and new_id is not null and old_id <> new_id then
      -- Keep any student's existing school selection pointed at a valid row.
      update public.student_academic_config
        set school_id = new_id
        where school_id = old_id;

      -- Merge course-usage counts into the surviving row instead of
      -- losing them to the "on delete cascade" that fires when the old
      -- row is deleted below.
      insert into public.school_courses (school_id, course_catalog_id, usage_count)
        select new_id, course_catalog_id, usage_count
        from public.school_courses
        where school_id = old_id
      on conflict (school_id, course_catalog_id)
        do update set usage_count = public.school_courses.usage_count + excluded.usage_count;

      delete from public.school_courses where school_id = old_id;

      -- Retire the duplicate row now that nothing references it.
      delete from public.taiwan_high_schools where id = old_id;
    end if;
  end loop;
end $$;

-- ---- STEP 2: now safe to rename — the collision rows are gone ----
update public.taiwan_high_schools set name_zh = '臺北美國學校' where school_type = 'international' and name_zh = 'Taipei American School';
update public.taiwan_high_schools set name_zh = '恩慈美國學校' where school_type = 'international' and name_zh = 'Grace Christian Academy';
update public.taiwan_high_schools set name_zh = '臺北市私立道明外僑學校' where school_type = 'international' and name_zh = 'Dominican International School';
update public.taiwan_high_schools set name_zh = '臺北復臨美國學校' where school_type = 'international' and name_zh = 'Taipei Adventist American School';
update public.taiwan_high_schools set name_zh = '臺北歐洲學校' where school_type = 'international' and name_zh = 'Taipei European School Foundation';
update public.taiwan_high_schools set name_zh = '臺北市日僑學校' where school_type = 'international' and name_zh = 'Taipei Japanese School';
update public.taiwan_high_schools set name_zh = '臺北韓國學校' where school_type = 'international' and name_zh = 'Taipei Korean School';
update public.taiwan_high_schools set name_zh = '新竹美國學校' where school_type = 'international' and name_zh = 'Hsinchu American School';
update public.taiwan_high_schools set name_zh = '新竹荷蘭國際學校' where school_type = 'international' and name_zh = 'Hsinchu International School';
update public.taiwan_high_schools set name_zh = '亞太美國學校' where school_type = 'international' and name_zh = 'Pacific American School, Hsinchu County';
update public.taiwan_high_schools set name_zh = '臺中日僑學校' where school_type = 'international' and name_zh = 'Taichung Japanese School';
update public.taiwan_high_schools set name_zh = '高雄美國學校' where school_type = 'international' and name_zh = 'Kaohsiung American School';
update public.taiwan_high_schools set name_zh = '私立道明外僑小學' where school_type = 'international' and name_zh = 'Dominican International School Kaohsiung';
update public.taiwan_high_schools set name_zh = '高雄市日僑學校' where school_type = 'international' and name_zh = 'Kaohsiung Japanese School';
update public.taiwan_high_schools set name_zh = '高雄韓國學校' where school_type = 'international' and name_zh = 'Kaohsiung Korean International School';
update public.taiwan_high_schools set name_zh = '高雄馬禮遜學校' where school_type = 'international' and name_zh = 'Morrison Academy  -Kaohsiung';
update public.taiwan_high_schools set name_zh = '馬禮遜學校' where school_type = 'international' and name_zh = 'Morrison Academy -Taichung';

-- Typo fix + Chinese name together.
update public.taiwan_high_schools
  set name_zh = '臺中美國學校', name_en = 'American School in Taichung'
  where school_type = 'international' and name_zh = 'American Schoolin Taichung';

-- New school, not in the original 22 — insert fresh.
insert into public.taiwan_high_schools (name_zh, name_en, level, school_type) values
  ('臺北伯大尼美國學校', 'Taipei Bethany American School', 'both', 'international')
on conflict (name_zh) do nothing;

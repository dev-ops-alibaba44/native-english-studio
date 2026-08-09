-- =====================================================================
-- Batch 9.13 — official Taiwan school directory data, replacing the
-- hand-typed starter list from Batch 9.11/9.12 with real open-data
-- sources you provided:
--
-- (a) Comprehensive High Schools at the Secondary School Level
--     https://data.gov.tw/en/datasets/46316 (Comprehensive_High_Schools.csv)
--     108 unique schools after de-duplicating across the multiple years
--     in the source file (kept each school once). No public/private field
--     in this source — inferred from the presence of "私立" (private) in
--     the school's own name, which is how these are conventionally named;
--     anything without it is treated as public (國立/市立/縣立 etc).
--
-- (b) List of Independent Senior Secondary Schools
--     https://data.gov.tw/en/datasets/6090 (Indep.csv)
--     3 unique schools (all 進修學校 / continuing-education senior
--     secondary schools) after de-duplicating across years. This source
--     does include a 公/私立 column, used directly.
--
-- (c) Taiwan international schools list, Ministry of Education
--     https://english.moe.gov.tw/cp-108-18978-da64a-1.html (International.csv)
--     22 unique schools. This source only gives English names, so those
--     are stored as both name_zh and name_en (same fallback used for
--     custom user-added entries elsewhere) — genuinely no Chinese name
--     available from the source to put in name_zh instead.
--
-- This does NOT include ordinary single-track senior highs like 建國中學
-- or 北一女中 — those weren't in the three sources you sent (they're
-- "分流高中", not "完全中學/獨立高中"), which is why the Batch 9.11
-- hand-typed starter list (kept, not removed by this migration) still
-- matters — the two lists are complementary, not overlapping. Both use
-- "on conflict do nothing" against the same unique(name_zh) constraint,
-- so this is safe to run even where a name happens to already exist.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- =====================================================================

insert into public.taiwan_high_schools (name_zh, name_en, level, school_type) values
('三信學校財團法人高雄市私立三信高級家事商業職業學校', null, 'senior', 'private'),
('中山學校財團法人高雄市中山高級工商職業學校', null, 'senior', 'public'),
('光啟學校財團法人桃園市光啟高級中等學校', null, 'senior', 'public'),
('台中市私立明道高級中學', null, 'senior', 'private'),
('台南市私立德光高級中學', null, 'senior', 'private'),
('台東縣私立公東高級工業職業學校', null, 'senior', 'private'),
('嘉義市立仁高級中學', null, 'senior', 'public'),
('嘉義縣私立協志高級工商職業學校', null, 'senior', 'private'),
('四維學校財團法人花蓮縣四維高級中學', null, 'senior', 'public'),
('國立中壢高級商業職業學校', null, 'senior', 'public'),
('國立二林高級工商職業學校', null, 'senior', 'public'),
('國立佳冬高級農業職業學校', null, 'senior', 'public'),
('國立光復高級商工職業學校', null, 'senior', 'public'),
('國立內埔高級農工職業學校', null, 'senior', 'public'),
('國立北斗高級家事商業職業學校', null, 'senior', 'public'),
('國立北門高級農工職業學校', null, 'senior', 'public'),
('國立南投高級商業職業學校', null, 'senior', 'public'),
('國立台東女子高級中學', null, 'senior', 'public'),
('國立台東高級中等學校', null, 'senior', 'public'),
('國立嘉義高級商業職業學校', null, 'senior', 'public'),
('國立嘉義高級工業職業學校', null, 'senior', 'public'),
('國立土庫高級商工職業學校', null, 'senior', 'public'),
('國立基隆高級商工職業學校', null, 'senior', 'public'),
('國立大甲高中實技班', null, 'senior', 'public'),
('國立宜蘭高級商業職業學校', null, 'senior', 'public'),
('國立屏北高級中學', null, 'senior', 'public'),
('國立彰化師範大學附屬高級工業職業學校', null, 'senior', 'public'),
('國立彰化高級商業職業學校', null, 'senior', 'public'),
('國立後壁高級中學', null, 'senior', 'public'),
('國立恆春高級工商職業學校', null, 'senior', 'public'),
('國立成功商業水產職業學校', null, 'senior', 'public'),
('國立新化高級工業職業學校', null, 'senior', 'public'),
('國立新竹高級商業職業學校', null, 'senior', 'public'),
('國立新竹高級工業職業學校', null, 'senior', 'public'),
('國立新豐高級中學', null, 'senior', 'public'),
('國立暨南國際大學附屬高級中學', null, 'senior', 'public'),
('國立曾文高級家事商業職業學校', null, 'senior', 'public'),
('國立曾文高級農工職業學校', null, 'senior', 'public'),
('國立溪湖高級中學', null, 'senior', 'public'),
('國立玉井高級工商職業學校', null, 'senior', 'public'),
('國立玉里高級中學', null, 'senior', 'public'),
('國立立楊梅高級中學', null, 'senior', 'public'),
('國立竹山高級中學', null, 'senior', 'public'),
('國立羅東高級商業職業學校', null, 'senior', 'public'),
('國立臺南大學附屬高級中學', null, 'senior', 'public'),
('國立臺東高級商業職業學校', null, 'senior', 'public'),
('國立華僑高級中等學校', null, 'senior', 'public'),
('國立華南高級商業職業學校', null, 'senior', 'public'),
('國立西螺高級農工職業學校', null, 'senior', 'public'),
('國立關西高級中學', null, 'senior', 'public'),
('國立陽明交大附中', null, 'senior', 'public'),
('國立頭城高級家事商業職業學校', null, 'senior', 'public'),
('國立馬祖高級中學', null, 'senior', 'public'),
('宜蘭縣立南澳高級中學', null, 'senior', 'public'),
('彰化縣私立文興高級中學', null, 'senior', 'private'),
('新北市私立淡江高級中學', null, 'senior', 'private'),
('新北市立光復高級中學', null, 'senior', 'public'),
('新北市立瑞芳高級工業職業學校', null, 'senior', 'public'),
('新北市立石碇高級中學', null, 'senior', 'public'),
('新北市立金山高級中學', null, 'senior', 'public'),
('新北市立雙溪高級中學', null, 'senior', 'public'),
('新竹市私立光復高級中學', null, 'senior', 'private'),
('新竹縣私立內思高級工業職業學校', null, 'senior', 'private'),
('新竹縣私立忠信高級中學', null, 'senior', 'private'),
('新興學校財團法人桃園市新興高級中等學校', null, 'senior', 'public'),
('明陽中學', null, 'senior', 'public'),
('桃園市立中壢商業高級中等學校', null, 'senior', 'public'),
('桃園市立楊梅高級中等學校', null, 'senior', 'public'),
('桃園育達學校財團法人桃園市育達高級中等學校', null, 'senior', 'public'),
('治平學校財團法人桃園市治平高級中等學校', null, 'senior', 'public'),
('清華學校財團法人桃園市清華高級中等學校', null, 'senior', 'public'),
('私立育達高中', null, 'senior', 'private'),
('立志學校財團法人高雄市立志高級中學', null, 'senior', 'public'),
('能仁學校財團法人新北市能仁高級家事商業職業學校', null, 'senior', 'public'),
('臺中市立大甲高級中等學校', null, 'senior', 'public'),
('臺中市青年高級中學', null, 'senior', 'public'),
('臺北市大安高級工業職業學校', null, 'senior', 'public'),
('臺北市私立滬江高級中學', null, 'senior', 'private'),
('臺北市私立金甌女子高級中學', null, 'senior', 'private'),
('臺北市私立開南高級商工職業學校', null, 'senior', 'private'),
('臺北市私立靜修女子高級中學', null, 'senior', 'private'),
('臺北市立南港高級工業職業學校', null, 'senior', 'public'),
('臺北市立大理高級中學', null, 'senior', 'public'),
('臺北市立成淵高級中學', null, 'senior', 'public'),
('臺北市立木柵高級工業職業學校', null, 'senior', 'public'),
('臺北市立松山高級工農職業學校', null, 'senior', 'public'),
('臺南光華學校臺南市光華高級中學', null, 'senior', 'public'),
('臺南市私立慈幼高級工商職業學校', null, 'senior', 'private'),
('臺南市私立新榮高級中學', null, 'senior', 'private'),
('臺東縣立蘭嶼高級中學', null, 'senior', 'public'),
('花蓮縣私立海星高級中學', null, 'senior', 'private'),
('花蓮縣立南平中學', null, 'senior', 'public'),
('苗栗縣私立大成高級中學', null, 'senior', 'private'),
('苗栗縣私立建臺高級中學', null, 'senior', 'private'),
('苗栗縣立三義高級中學', null, 'senior', 'public'),
('苗栗縣立興華高級中學', null, 'senior', 'public'),
('苗栗縣縣立苑裡高級中學', null, 'senior', 'public'),
('華德學校財團法人高雄市華德高級工業家事職業學校', null, 'senior', 'public'),
('雲林縣私立巨人高級中學', null, 'senior', 'private'),
('雲林縣私立永年高級中學', null, 'senior', 'private'),
('高雄市私立樹德高級家事商業職業學校', null, 'senior', 'private'),
('高雄市立三民家事商業職業學校', null, 'senior', 'public'),
('高雄市立中正高級工業職業學校', null, 'senior', 'public'),
('高雄市立楠梓高級中學', null, 'senior', 'public'),
('高雄市立海青高級工商職業學校', null, 'senior', 'public'),
('高雄市立高雄高級商業職業學校', null, 'senior', 'public'),
('高雄市立高雄高級工業職業學校', null, 'senior', 'public'),
('高雄縣私立高苑高級工商職業學校', null, 'senior', 'private'),
('私立光華高商進修學校', null, 'senior', 'private'),
('私立南華高中進修學校', null, 'senior', 'private'),
('私立志仁中學進修學校', null, 'senior', 'private'),
('American Schoolin Taichung', 'American Schoolin Taichung', 'both', 'international'),
('Asia American Internationl Academy', 'Asia American Internationl Academy', 'both', 'international'),
('Dominican International School', 'Dominican International School', 'both', 'international'),
('Dominican International School Kaohsiung', 'Dominican International School Kaohsiung', 'both', 'international'),
('Grace Christian Academy', 'Grace Christian Academy', 'both', 'international'),
('Hsinchu American School', 'Hsinchu American School', 'both', 'international'),
('Hsinchu County American School', 'Hsinchu County American School', 'both', 'international'),
('Hsinchu International School', 'Hsinchu International School', 'both', 'international'),
('Kaohsiung American School', 'Kaohsiung American School', 'both', 'international'),
('Kaohsiung Japanese School', 'Kaohsiung Japanese School', 'both', 'international'),
('Kaohsiung Korean International School', 'Kaohsiung Korean International School', 'both', 'international'),
('Morrison Academy  -Kaohsiung', 'Morrison Academy  -Kaohsiung', 'both', 'international'),
('Morrison Academy  -New Taipei City', 'Morrison Academy  -New Taipei City', 'both', 'international'),
('Morrison Academy -Taichung', 'Morrison Academy -Taichung', 'both', 'international'),
('Pacific American School, Hsinchu County', 'Pacific American School, Hsinchu County', 'both', 'international'),
('Taichung Japanese School', 'Taichung Japanese School', 'both', 'international'),
('Taipei Adventist American School', 'Taipei Adventist American School', 'both', 'international'),
('Taipei American School', 'Taipei American School', 'both', 'international'),
('Taipei European School Foundation', 'Taipei European School Foundation', 'both', 'international'),
('Taipei Japanese School', 'Taipei Japanese School', 'both', 'international'),
('Taipei Korean School', 'Taipei Korean School', 'both', 'international'),
('Taoyuan American School', 'Taoyuan American School', 'both', 'international')
on conflict (name_zh) do nothing;

-- =====================================================================
-- Part 2: student_activities — backs the four remaining 學習檔案
-- sub-pages (課外活動 / 運動 / 獎項與榮譽 / 志工與工讀). One shared table,
-- distinguished by `category`, since three of the four (EC, sport,
-- service) are structurally identical (title, org, month/year date
-- range, hours/week, 50-word description) and only 獎項與榮譽 differs
-- (single date, no hours/week — end_month/end_year just stay null for
-- that category).
-- =====================================================================

create table if not exists public.student_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('extracurricular', 'sport', 'award', 'service')),
  title text not null,
  organization text,
  start_month integer check (start_month between 1 and 12),
  start_year integer check (start_year between 2000 and 2100),
  end_month integer check (end_month between 1 and 12),
  end_year integer check (end_year between 2000 and 2100),
  hours_per_week numeric(4,1) check (hours_per_week is null or (hours_per_week >= 0 and hours_per_week <= 168)),
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_activities_student_category_idx
  on public.student_activities (student_id, category, sort_order);

alter table public.student_activities enable row level security;

create policy "student_activities: student manages own" on public.student_activities
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "student_activities: advisor manages agency-wide" on public.student_activities
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  ) with check (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

create policy "student_activities: agency admin manages agency-wide" on public.student_activities
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  ) with check (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  );


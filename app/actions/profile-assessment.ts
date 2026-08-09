"use server";

import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropic, AI_FEEDBACK_MODEL } from "@/lib/anthropic";
import { MONTHLY_PROFILE_ASSESSMENT_LIMIT } from "@/lib/ai-limits";

function hashProfileSummary(summary: string): string {
  return createHash("sha256").update(summary).digest("hex");
}

function periodStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

// Shared by the "產生評估" button (to enforce the cap) and, if useful
// later, an account-settings gauge — same pattern as
// getEssayFeedbackUsage in ai-feedback.ts.
export async function getProfileAssessmentUsage(studentId: string): Promise<{ used: number; limit: number }> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profile_assessment_log")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", periodStart().toISOString());
  return { used: count ?? 0, limit: MONTHLY_PROFILE_ASSESSMENT_LIMIT };
}

const GRADE_LEVEL_LABEL: Record<number, string> = { 11: "高二", 12: "高三" };

function buildProfileSummary(profile: {
  grades: any[];
  gradingScale: string;
  testScores: any[];
  activities: any[];
  applications: any[];
}): string {
  const sections: string[] = [];

  if (profile.grades.length > 0) {
    const byLevel: Record<number, any[]> = {};
    for (const g of profile.grades) (byLevel[g.grade_level] ||= []).push(g);
    let block = "【成績】（制度：" + profile.gradingScale + "）\n";
    for (const level of [11, 12]) {
      const rows = byLevel[level];
      if (!rows?.length) continue;
      block += `${GRADE_LEVEL_LABEL[level]}：\n`;
      for (const r of rows) {
        const terms = [r.term_1_grades, r.term_2_grades, r.term_3_grades, r.term_4_grades]
          .map((t) => t?.[profile.gradingScale])
          .filter(Boolean)
          .join(", ");
        block += `- ${r.course_name}: ${terms || "（未填）"}\n`;
      }
    }
    sections.push(block.trim());
  } else {
    sections.push("【成績】尚未填寫。");
  }

  if (profile.testScores.length > 0) {
    let block = "【測驗成績】\n";
    for (const t of profile.testScores) {
      const date = t.test_month && t.test_year ? `${t.test_year}/${t.test_month}` : "日期未填";
      block += `- [${t.category}] ${t.exam_name}（${date}）：${t.score || "未填成績"}\n`;
    }
    sections.push(block.trim());
  } else {
    sections.push("【測驗成績】尚未填寫。");
  }

  if (profile.activities.length > 0) {
    const byCat: Record<string, any[]> = {};
    for (const a of profile.activities) (byCat[a.category] ||= []).push(a);
    const CAT_LABEL: Record<string, string> = {
      extracurricular: "課外活動",
      sport: "運動",
      award: "獎項與榮譽",
      service: "志工與工讀",
    };
    let block = "【活動與獎項】\n";
    for (const [cat, rows] of Object.entries(byCat)) {
      block += `${CAT_LABEL[cat] || cat}：\n`;
      for (const a of rows) {
        const dateRange =
          a.start_year && a.end_year
            ? `${a.start_year}/${a.start_month}–${a.end_year}/${a.end_month}`
            : a.start_year
              ? `${a.start_year}/${a.start_month}起`
              : "日期未填";
        const hours = a.hours_per_week ? `，每週 ${a.hours_per_week} 小時` : "";
        block += `- ${a.title}（${a.organization || "無組織資訊"}, ${dateRange}${hours}）：${a.description || "無描述"}\n`;
      }
    }
    sections.push(block.trim());
  } else {
    sections.push("【活動與獎項】尚未填寫。");
  }

  if (profile.applications.length > 0) {
    let block = "【正在準備的申請文書】\n";
    for (const app of profile.applications) {
      block += `- ${app.school?.name || "未知學校"}（目前階段：${app.stage}）\n`;
    }
    sections.push(block.trim());
  } else {
    sections.push("【正在準備的申請文書】目前尚未建立任何學校的申請項目。");
  }

  return sections.join("\n\n");
}

export async function generateProfileAssessment(
  studentId: string
): Promise<
  | { success: true; content: string; cached: false }
  | { success: true; content: string; cached: true; cachedAt: string }
  | { success: false; error: string }
> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ai_not_configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  // Confirms access via RLS (the row-fetches below would just come back
  // empty for someone without access, but this gives an explicit,
  // honest error instead of silently generating an assessment from no
  // data).
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", studentId)
    .maybeSingle();
  if (!studentProfile) return { success: false, error: "not_authorized" };

  const [{ data: academicConfig }, { data: grades }, { data: testScores }, { data: activities }, { data: applications }] =
    await Promise.all([
      supabase.from("student_academic_config").select("grading_scale").eq("student_id", studentId).maybeSingle(),
      supabase
        .from("student_grades")
        .select("grade_level, course_name, term_1_grades, term_2_grades, term_3_grades, term_4_grades")
        .eq("student_id", studentId),
      supabase
        .from("student_test_scores")
        .select("category, exam_name, test_month, test_year, score")
        .eq("student_id", studentId),
      supabase
        .from("student_activities")
        .select("category, title, organization, start_month, start_year, end_month, end_year, hours_per_week, description")
        .eq("student_id", studentId),
      supabase.from("applications").select("stage, school:schools(name)").eq("student_id", studentId),
    ]);

  const summary = buildProfileSummary({
    grades: grades || [],
    gradingScale: academicConfig?.grading_scale || "percentage",
    testScores: testScores || [],
    activities: activities || [],
    applications: (applications || []) as any[],
  });
  const inputHash = hashProfileSummary(summary);

  // If nothing in the underlying profile has changed since the student's
  // last generate, don't spend a real AI call (or a slot of their
  // monthly cap) on a result that will just say the same thing again —
  // hand back the previous one instead. The cap check below only runs
  // for a genuinely new generation.
  const admin = createAdminClient();
  const { data: lastLog } = await admin
    .from("profile_assessment_log")
    .select("input_hash, content, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastLog?.input_hash && lastLog.input_hash === inputHash && lastLog.content) {
    return { success: true, content: lastLog.content, cached: true, cachedAt: lastLog.created_at };
  }

  const { used, limit } = await getProfileAssessmentUsage(studentId);
  if (used >= limit) return { success: false, error: "monthly_limit_reached" };

  let assessmentText: string;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let cacheCreationTokens: number | null = null;
  let cacheReadTokens: number | null = null;

  try {
    const message = await getAnthropic().messages.create({
      model: AI_FEEDBACK_MODEL,
      max_tokens: 1400,
      system: [
        {
          type: "text",
          text:
            "You are an experienced US/UK college admissions counselor working for a Taiwan-based " +
            "consultancy, reviewing a student's application profile (grades, test scores, " +
            "extracurricular activities, and in-progress essays). Write your entire response in " +
            "Traditional Chinese (繁體中文) — school names, exam names, and course titles may stay " +
            "in their original English/proper-noun form, but all commentary must be Traditional " +
            "Chinese.\n\n" +
            "Structure your response in exactly these four sections, each with a clear heading:\n\n" +
            "1. 整體優劣勢與加強建議 — Assess how well-rounded the profile is across academics, " +
            "testing, and activities. Note genuine strengths first. Give specific, actionable " +
            "suggestions for what would most strengthen the application (e.g. a gap in leadership " +
            "activities, an untested language proficiency, thin sophomore/junior year academic " +
            "rigor) — concrete next steps, not vague encouragement.\n\n" +
            "2. 適合的學校與科系方向 — Based on the profile, suggest 4-6 university/program " +
            "directions or specific schools that could be a good fit, briefly explaining why each " +
            "one fits (academic interest signals from activities/courses, competitiveness level, " +
            "etc.). Vary the selectivity level across the suggestions rather than only naming the " +
            "most famous schools.\n\n" +
            "3. 目前準備中申請項目的機會等級 — For EACH school listed under 正在準備的申請文書 in the " +
            "profile below, give a qualitative tier: 衝刺 (Reach), 目標 (Target), or 保底 (Likely). " +
            "NEVER give a numeric percentage or any other numeric probability — tiers only. If no " +
            "schools are listed yet, say so plainly instead of inventing any.\n\n" +
            "4. 重要提醒 — Always include, verbatim in spirit but written naturally in Chinese, a " +
            "clear disclaimer that: this is a rough, automated estimate based only on the " +
            "self-reported data above; it is NOT a professional admissions prediction or a " +
            "guarantee of any outcome; actual admissions decisions depend heavily on essay quality, " +
            "recommendation letters, interviews (where applicable), and holistic factors this tool " +
            "cannot see, plus how competitive that year's overall applicant pool is; the student " +
            "should discuss this with their advisor rather than treat it as a final answer.\n\n" +
            "Keep the whole response under 500 words. Do not use markdown bold/asterisks — plain " +
            "text with the four numbered headings is enough.",
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `以下是「${studentProfile.display_name}」的學習檔案資料：\n\n${summary}`,
        },
      ],
    });

    assessmentText = message.content
      .map((block: any) => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n\n");
    inputTokens = message.usage?.input_tokens ?? null;
    outputTokens = message.usage?.output_tokens ?? null;
    cacheCreationTokens = (message.usage as any)?.cache_creation_input_tokens ?? null;
    cacheReadTokens = (message.usage as any)?.cache_read_input_tokens ?? null;

    if (!assessmentText.trim()) {
      return { success: false, error: "ai_empty_response" };
    }
  } catch (err) {
    console.error("generateProfileAssessment: Anthropic API call failed", err);
    return { success: false, error: "ai_request_failed" };
  }

  try {
    await admin.from("profile_assessment_log").insert({
      student_id: studentId,
      requested_by: user.id,
      model: AI_FEEDBACK_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_tokens: cacheCreationTokens,
      cache_read_tokens: cacheReadTokens,
      input_hash: inputHash,
      content: assessmentText,
    });
  } catch (err) {
    console.error("generateProfileAssessment: failed to log usage", err);
  }

  return { success: true, content: assessmentText, cached: false };
}

export interface SavedAssessment {
  id: string;
  content: string;
  createdAt: string;
  requestedByName: string;
}

export async function saveProfileAssessment(
  studentId: string,
  content: string
): Promise<{ success: true; assessment: SavedAssessment } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const { data: requester } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();

  const { data: inserted, error } = await supabase
    .from("profile_assessments")
    .insert({ student_id: studentId, requested_by: user.id, content })
    .select("id, content, created_at")
    .single();

  if (error || !inserted) {
    console.error("saveProfileAssessment failed:", error);
    return { success: false, error: "save_failed" };
  }

  return {
    success: true,
    assessment: {
      id: inserted.id,
      content: inserted.content,
      createdAt: inserted.created_at,
      requestedByName: requester?.display_name || "使用者",
    },
  };
}

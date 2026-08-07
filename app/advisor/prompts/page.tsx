import { createClient } from "@/lib/supabase/server";
import { BrainstormWorkspace } from "@/components/BrainstormWorkspace";
import { BrainstormAnswers } from "@/components/BrainstormAnswers";
import { type ArchivedSession } from "@/components/BrainstormSessionArchive";
import { QueryPicker } from "@/components/QueryPicker";
import { QUESTIONS } from "@/lib/brainstorm-questions";

export default async function AdvisorPromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: studentId } = await searchParams;
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "student")
    .order("display_name");

  let studentAnswers: Record<string, { text: string; updatedAt: string | null }> = {};
  let studentSessions: ArchivedSession[] = [];
  let selectedStudent = null as { id: string; display_name: string } | null;

  if (studentId) {
    selectedStudent = (students || []).find((s) => s.id === studentId) || null;

    const { data: answerRows } = await supabase
      .from("brainstorm_answers")
      .select("question_key, answer_text, updated_at")
      .eq("student_id", studentId);
    for (const row of answerRows || []) {
      studentAnswers[row.question_key] = { text: row.answer_text, updatedAt: row.updated_at };
    }

    const { data: sessionRows } = await supabase
      .from("brainstorm_sessions")
      .select("id, transcript, created_at, author:profiles!author_id(display_name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    studentSessions = (sessionRows || []).map((s: any) => ({
      id: s.id,
      authorName: s.author?.display_name || "使用者",
      createdAt: s.created_at,
      transcript: s.transcript,
    }));
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">發想與大綱</h1>
      <p className="text-sm text-slate mb-6">
        先選一位學生，就可以一起腦力激盪、查看他填寫的問題，以及過去封存的對話紀錄。
      </p>

      <QueryPicker
        basePath="/advisor/prompts"
        paramName="student"
        placeholder="選擇一位學生"
        activeId={studentId || null}
        options={(students || []).map((s) => ({ id: s.id, label: s.display_name }))}
      />

      {!selectedStudent ? (
        <p className="text-sm text-slate mt-4">請先選擇一位學生。</p>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          <BrainstormWorkspace
            studentId={selectedStudent.id}
            archiveLabel={`封存到「${selectedStudent.display_name}」名下`}
            initialSessions={studentSessions}
            heading="📄 封存的對話"
            betweenSlot={
              <div className="mt-6">
                <h3 className="font-display font-bold text-base mb-2">
                  {selectedStudent.display_name} 填寫的問題
                </h3>
                <BrainstormAnswers questions={QUESTIONS} initialAnswers={studentAnswers} readOnly />
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

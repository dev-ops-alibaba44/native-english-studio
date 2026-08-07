import { createClient } from "@/lib/supabase/server";
import { BrainstormAnswers } from "@/components/BrainstormAnswers";
import { BrainstormWorkspace } from "@/components/BrainstormWorkspace";
import { type ArchivedSession } from "@/components/BrainstormSessionArchive";
import { QUESTIONS } from "@/lib/brainstorm-questions";

export default async function PromptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: answerRows } = await supabase
    .from("brainstorm_answers")
    .select("question_key, answer_text, updated_at")
    .eq("student_id", user!.id);

  const initialAnswers: Record<string, { text: string; updatedAt: string | null }> = {};
  for (const row of answerRows || []) {
    initialAnswers[row.question_key] = { text: row.answer_text, updatedAt: row.updated_at };
  }

  const { data: sessionRows } = await supabase
    .from("brainstorm_sessions")
    .select("id, transcript, created_at, author:profiles!author_id(display_name)")
    .eq("student_id", user!.id)
    .order("created_at", { ascending: false });

  const sessions: ArchivedSession[] = (sessionRows || []).map((s: any) => ({
    id: s.id,
    authorName: s.author?.display_name || "使用者",
    createdAt: s.created_at,
    transcript: s.transcript,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">發想與大綱</h1>
      <p className="text-sm text-slate mb-6">從幾個問題開始想，不用一次就寫得完美。</p>

      <BrainstormAnswers questions={QUESTIONS} initialAnswers={initialAnswers} />

      <div className="mt-6">
        <BrainstormWorkspace studentId={user!.id} initialSessions={sessions} />
      </div>
    </div>
  );
}

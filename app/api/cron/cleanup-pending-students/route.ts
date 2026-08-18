import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Batch 24: the automatic side of the seat-assignment-failure safety
// net. app/actions/student-signup.ts sets profiles.pending_seat_deadline
// when a newly created student account fails to get a seat attached;
// app/actions/seats.ts (assignSeat) clears it the moment any seat does
// get attached. This route is what actually deletes an account if
// nobody fixed it in time — meant to run on a schedule (see vercel.json)
// rather than be called directly by any user-facing flow.
//
// Auth: Vercel Cron automatically sends `Authorization: Bearer
// ${CRON_SECRET}` on every scheduled invocation when a CRON_SECRET env
// var is set on the project — this just checks that header matches.
// Without CRON_SECRET set, the route refuses to run at all (fails
// closed), so it can't be triggered by a guessed URL.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set — refusing to run." },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: overdue } = await admin
    .from("profiles")
    .select("id, display_name, email, pending_seat_deadline")
    .eq("role", "student")
    .not("pending_seat_deadline", "is", null)
    .lte("pending_seat_deadline", new Date().toISOString());

  const deleted: string[] = [];
  const skipped: string[] = [];

  for (const row of overdue || []) {
    // Re-check for a seat right before deleting, not just trusting the
    // flag — a last-second manual assignment should always win over the
    // cron, and assignSeat already clears the flag on success, but this
    // is cheap insurance against any ordering edge case.
    const { data: seat } = await admin
      .from("seats")
      .select("id")
      .eq("assigned_student_id", row.id)
      .maybeSingle();

    if (seat) {
      await admin.from("profiles").update({ pending_seat_deadline: null }).eq("id", row.id);
      skipped.push(row.id);
      continue;
    }

    // Deleting the auth user cascades to the profiles row via the
    // on delete cascade FK already in schema.sql — no separate delete
    // needed here.
    const { error } = await admin.auth.admin.deleteUser(row.id);
    if (!error) {
      deleted.push(row.id);
    }
  }

  return NextResponse.json({
    checked: overdue?.length || 0,
    deleted: deleted.length,
    skipped_had_seat_after_all: skipped.length,
  });
}

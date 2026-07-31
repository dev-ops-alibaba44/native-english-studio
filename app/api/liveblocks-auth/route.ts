import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { createClient } from "@/lib/supabase/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || "",
});

// Room ids are always "application:<applicationId>" — see LiveDocument.tsx.
function applicationIdFromRoomId(roomId: string): string | null {
  const match = /^application:(.+)$/.exec(roomId);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return NextResponse.json(
      { error: "Liveblocks is not configured (missing LIVEBLOCKS_SECRET_KEY)." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const { room } = await request.json();

  if (typeof room !== "string") {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  const applicationId = applicationIdFromRoomId(room);
  if (!applicationId) {
    return NextResponse.json({ error: "Unrecognized room id." }, { status: 400 });
  }

  // This is the actual access check: it reuses the SAME Postgres RLS policies
  // that already govern who can read an application (student owner, their
  // advisor, or their agency's admin) — see schema.sql "applications: ..."
  // policies. If RLS lets this query return a row, the person is allowed
  // into that application's live document; if not, this comes back empty
  // and we deny the room.
  const { data: application } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ error: "Not authorized for this document." }, { status: 403 });
  }

  const ROLE_COLORS: Record<string, string> = {
    student: "#172983",
    advisor: "#DD0E20",
    agency_admin: "#3F6B4E",
  };
  const ROLE_LABELS: Record<string, string> = {
    student: "學生",
    advisor: "顧問",
    agency_admin: "機構管理者",
  };

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: profile?.display_name || user.email || "User",
      role: ROLE_LABELS[profile?.role || ""] || "",
      color: ROLE_COLORS[profile?.role || ""] || "#666666",
    },
  });

  session.allow(room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}

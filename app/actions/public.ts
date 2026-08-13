"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  isValidEmail,
  isValidWaitlistRole,
} from "@/lib/public-form-validation";

// Both actions here are reachable by anyone on the internet, signed in
// or not — this is the public marketing site, not a portal. They use
// the regular (anon-key) server client, NOT the admin client: RLS's
// "insert-only, no select" policy (batch10_public_inquiries.sql) is
// what actually protects these tables, the same way every other table
// in this app is protected by RLS rather than by trusting the caller.

export type PublicFormResult =
  | { success: true }
  | { success: false; error: string };

// Simple honeypot: a field named "website" that's hidden from real users
// via CSS in the form component. Bots that blindly fill every input trip
// it; real visitors never see or touch it. Silently "succeeds" so a bot
// gets no signal that it was caught.
function isHoneypotTripped(formData: FormData): boolean {
  return ((formData.get("website") as string) || "").trim().length > 0;
}

export async function submitAgencyInquiry(
  formData: FormData
): Promise<PublicFormResult> {
  if (isHoneypotTripped(formData)) {
    return { success: true };
  }

  const orgName = ((formData.get("org_name") as string) || "").trim();
  const contactName = ((formData.get("contact_name") as string) || "").trim();
  const contactEmail = ((formData.get("contact_email") as string) || "").trim();
  const contactPhone = ((formData.get("contact_phone") as string) || "").trim();
  const city = ((formData.get("city") as string) || "").trim();
  const estimatedStudents = ((formData.get("estimated_students") as string) || "").trim();
  const message = ((formData.get("message") as string) || "").trim();
  const agreedToTerms = (formData.get("agreed_to_terms") as string) === "yes";

  // Server-side backstop — mirrors the client-side required-field check
  // in AgencyInquiryForm.tsx. Never trust the client alone.
  if (!orgName || !contactName || !contactEmail) {
    return { success: false, error: "missing_required_fields" };
  }
  if (!isValidEmail(contactEmail)) {
    return { success: false, error: "invalid_email" };
  }
  if (!agreedToTerms) {
    return { success: false, error: "must_agree_to_terms" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("agency_inquiries").insert({
    org_name: orgName,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone || null,
    city: city || null,
    estimated_students: estimatedStudents || null,
    message: message || null,
  });

  if (error) {
    console.error("submitAgencyInquiry: insert failed", error);
    return { success: false, error: "insert_failed" };
  }

  return { success: true };
}

export async function submitWaitlistSignup(
  formData: FormData
): Promise<PublicFormResult> {
  if (isHoneypotTripped(formData)) {
    return { success: true };
  }

  const role = ((formData.get("role") as string) || "").trim();
  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const city = ((formData.get("city") as string) || "").trim();
  const notes = ((formData.get("notes") as string) || "").trim();
  const agreedToTerms = (formData.get("agreed_to_terms") as string) === "yes";

  if (!email || !isValidWaitlistRole(role)) {
    return { success: false, error: "missing_required_fields" };
  }
  if (!isValidEmail(email)) {
    return { success: false, error: "invalid_email" };
  }
  if (!agreedToTerms) {
    return { success: false, error: "must_agree_to_terms" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_signups").insert({
    role,
    name: name || null,
    email,
    city: city || null,
    notes: notes || null,
  });

  if (error) {
    console.error("submitWaitlistSignup: insert failed", error);
    return { success: false, error: "insert_failed" };
  }

  return { success: true };
}

// Chatbot email capture — deliberately a dedicated small form in the widget
// (ChatWidget.tsx), not something parsed out of free chat text. Free-text
// extraction ("did the visitor mention an email in their message?") is
// unreliable both ways: it can miss a real email typed conversationally,
// and it can misfire on something that only looks like one. A plain input
// the visitor explicitly fills in is simple and always correct.
export async function submitChatbotEmail(email: string): Promise<PublicFormResult> {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    return { success: false, error: "invalid_email" };
  }

  // Reuses the same session_id cookie the /api/chat route sets, so this
  // lead links back to that session's transcript in chatbot_messages.
  // If someone somehow submits the email field before ever sending a chat
  // message, there's no session cookie yet — the widget only renders this
  // field after at least one exchange, so that path shouldn't occur, but
  // fall back to a fresh id rather than failing outright.
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("nes_chat_sid")?.value ?? crypto.randomUUID();

  const supabase = await createClient();
  const { error } = await supabase.from("chatbot_messages").insert({
    session_id: sessionId,
    role: "lead",
    content: "",
    email: trimmed,
  });

  if (error) {
    console.error("submitChatbotEmail: insert failed", error);
    return { success: false, error: "insert_failed" };
  }

  return { success: true };
}

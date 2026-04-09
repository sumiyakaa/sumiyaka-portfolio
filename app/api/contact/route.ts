import { NextRequest, NextResponse } from "next/server";
import { sendContactMail } from "@/lib/mail";

const rateMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  rateMap.set(ip, recent);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  return false;
}

function validate(body: unknown): {
  ok: true;
  data: { name: string; email: string; budget: string; deadline: string; message: string };
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const { name, email, budget, deadline, message } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
    return { ok: false, error: "氏名を正しく入力してください" };
  }
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return { ok: false, error: "メールアドレスを正しく入力してください" };
  }
  if (typeof message !== "string" || message.trim().length === 0 || message.length > 5000) {
    return { ok: false, error: "お問い合わせ内容を入力してください（5000文字以内）" };
  }

  return {
    ok: true,
    data: {
      name: name.trim(),
      email: email.trim(),
      budget: typeof budget === "string" ? budget : "",
      deadline: typeof deadline === "string" ? deadline : "",
      message: message.trim(),
    },
  };
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "送信回数の上限に達しました。しばらく経ってからお試しください。" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = validate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await sendContactMail(result.data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}

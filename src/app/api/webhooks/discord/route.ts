/**
 * Manual trigger endpoint to re-send a Discord notification.
 * Also used as a health-check by Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { notify } from "@/lib/discord";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { level = "info", title, description } = await req.json();
  await notify(level, title, description);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}

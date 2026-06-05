import { NextResponse } from "next/server";
import { sendReminder } from "@/lib/reminders";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await sendReminder(params.id, { manual: true }));
}

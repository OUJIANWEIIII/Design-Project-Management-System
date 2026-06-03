import { NextResponse } from "next/server";
import { revokeReminder } from "@/lib/reminders";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await revokeReminder(params.id));
}

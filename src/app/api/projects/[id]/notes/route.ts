import { NextResponse } from "next/server";
import { updateProjectNotes } from "@/lib/projects";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const input = await request.json();
  return NextResponse.json(await updateProjectNotes(params.id, input.notes || ""));
}

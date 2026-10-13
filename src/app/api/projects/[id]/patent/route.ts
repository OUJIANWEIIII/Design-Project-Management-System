import { NextResponse } from "next/server";
import { updateProjectPatent } from "@/lib/projects";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const input = await request.json();
  return NextResponse.json(await updateProjectPatent(params.id, {
    status: String(input.status || "UNKNOWN"),
    applicationNo: String(input.applicationNo || ""),
    applicationDate: input.applicationDate || null,
    notes: String(input.notes || "")
  }));
}

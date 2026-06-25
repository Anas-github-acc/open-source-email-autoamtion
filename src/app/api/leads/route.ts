import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/app/actions/admin-actions";

type CreateLeadBody = {
  name: string;
  email: string;
  company?: string;
  role?: string;
  source?: string;
  status?: string;
  private?: boolean;
  user_id?: string | null;
  campaign_id?: string | null;
  linkedin_url?: string | null;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateLeadBody;

  if (!body?.name || !body?.email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const result = await createLead(body);

  if (typeof result === "object" && result !== null && "error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result }, { status: 201 });
}

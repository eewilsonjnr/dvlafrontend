import { NextRequest, NextResponse } from "next/server";

// Use server-only var first (not exposed to browser), fall back to public var
const BACKEND = (process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:5000");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = req.headers.get("authorization") ?? "";

  const upstream = await fetch(`${BACKEND}/api/permits/${id}/preview`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Preview failed" }, { status: upstream.status });
  }

  const pdf = await upstream.arrayBuffer();
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

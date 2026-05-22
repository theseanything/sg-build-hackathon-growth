import { NextResponse } from "next/server"

const backendApiBaseUrl = (
  process.env.FUNDINGFIT_API_BASE_URL ??
  process.env.BACKEND_API_URL ??
  "http://localhost:8000"
).replace(/\/$/, "")

async function readJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function POST() {
  try {
    const upstreamResponse = await fetch(`${backendApiBaseUrl}/api/admin/reset`, {
      method: "POST",
      cache: "no-store",
    })
    const payload = await readJson(upstreamResponse)

    return NextResponse.json(payload, { status: upstreamResponse.status })
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the FundingFit API" },
      { status: 502 },
    )
  }
}

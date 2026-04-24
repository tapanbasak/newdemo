import { NextResponse } from "next/server";
import { mapJobCodeDescriptionToRole } from "@/lib/role-mapping";

const GRAPHQL_ENDPOINT = "https://api-s.drift.nam.nsroot.net/graphql";

function normalizeSoeid(input: unknown) {
  return String(input ?? "").trim().toLowerCase();
}

function escapeGraphqlString(input: string) {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const soeid = normalizeSoeid(url.searchParams.get("soeid") || "tb97406");
  const query = `{
    users(page: 1, size: 10, filter: {soeId: {equals: "${escapeGraphqlString(soeid)}"}}) {
      id
      soeId
      firstName
      lastName
      emailAddress
      jobCode
      jobCodeDescription
      departmentName
    }
  }`;

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GraphQL call failed: ${res.status}`);
    const payload = (await res.json()) as { data?: { users?: Array<Record<string, unknown>> } };
    const user = payload?.data?.users?.[0];
    if (!user) throw new Error("No user returned");
    return NextResponse.json({
      source: "graphql",
      user: {
        id: String(user.id ?? ""),
        soeId: String(user.soeId ?? soeid).toUpperCase(),
        firstName: String(user.firstName ?? ""),
        lastName: String(user.lastName ?? ""),
        emailAddress: String(user.emailAddress ?? ""),
        jobCode: String(user.jobCode ?? ""),
        jobCodeDescription: String(user.jobCodeDescription ?? ""),
        departmentName: String(user.departmentName ?? ""),
        mappedRole: mapJobCodeDescriptionToRole(String(user.jobCodeDescription ?? "")),
      },
    });
  } catch {
    return NextResponse.json({
      source: "simulated",
      user: {
        id: "1010597406",
        soeId: "TB97406",
        firstName: "Tapan",
        lastName: "Basak",
        emailAddress: "tapan.basak@iu.citi.com",
        jobCode: "NE1849",
        jobCodeDescription: "tester",
        departmentName: "USPB CLOUD & API PLATFORM ENGINEERING (L8)",
        mappedRole: mapJobCodeDescriptionToRole("tester"),
      },
    });
  }
}

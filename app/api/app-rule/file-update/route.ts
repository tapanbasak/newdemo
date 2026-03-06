import { NextRequest } from "next/server";

type FileUpdatePayload = {
  environment: string;
  country: string;
  business: string;
  channel: string;
  applicationId?: string | null;
  key: string;
  fileName: string;
  config: unknown;
};

// Dummy endpoint for updating a single file's JSON under a key.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<FileUpdatePayload>;
  const {
    environment = "",
    country = "",
    business = "",
    channel = "",
    applicationId = null,
    key = "",
    fileName = "",
  } = body;

  return Response.json(
    {
      ok: true,
      message: "File update accepted (dummy endpoint).",
      environment,
      country,
      business,
      channel,
      applicationId,
      key,
      fileName,
    },
    { status: 200 }
  );
}


import { NextRequest } from "next/server";

type FileDeletePayload = {
  environment: string;
  country: string;
  business: string;
  channel: string;
  applicationId?: string | null;
  key: string;
  fileName: string;
};

// Dummy endpoint for deleting a single file under a key.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<FileDeletePayload>;
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
      message: "File delete accepted (dummy endpoint).",
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


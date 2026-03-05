import { NextRequest } from "next/server";

type AppRulePayload = {
  environment: string;
  country: string;
  business: string;
  channel: string;
  applicationId?: string | null;
  crNumber?: string | null;
  key: string;
  baseUrl: string;
  config: unknown;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<AppRulePayload>;

  const {
    environment = "",
    country = "",
    business = "",
    channel = "",
    applicationId = null,
    crNumber = null,
    key = "",
    baseUrl = "",
    config,
  } = body;

  // This is a dummy endpoint for the prototype. In a real app, you would
  // call the appropriate microservice using the computed baseUrl and persist
  // the configuration in your backing store.
  // For now we just echo back some of the payload.

  return Response.json(
    {
      ok: true,
      message: "Mock App Rule config submission received.",
      environment,
      country,
      business,
      channel,
      applicationId,
      crNumber,
      key,
      baseUrl,
      // Do not echo full config in case it is large or sensitive.
    },
    { status: 200 }
  );
}


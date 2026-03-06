import { NextRequest } from "next/server";

type SearchRequest = {
  environment: string;
  country: string;
  business: string;
  channel: string;
  applicationId?: string | null;
  key: string;
};

// Dummy search endpoint for the prototype.
// Returns an example configuration when country is US, otherwise empty object.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<SearchRequest>;
  const { country = "", key = "" } = body;

  if (country.toUpperCase() !== "US" || !key) {
    return Response.json({}, { status: 200 });
  }

  const value = {
    mob_ac: {
      useBAUEndpoint: false,
      urlText: "test.com",
    },
    mob_invest: {
      investFlag: true,
    },
    mob_ac1: {
      useBAUEndpoint: false,
      urlText: "test.com",
    },
  };

  return Response.json(
    {
      [key]: value,
    },
    { status: 200 }
  );
}


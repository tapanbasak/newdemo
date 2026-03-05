import { NextRequest } from "next/server";

type PsgSubmitPayload = {
  csi: string;
  newCsi?: string | null;
  domainType: "nonprod" | "prod" | "both";
  nonProdDomains: string[];
  prodDomains: string[];
  crNumber?: string | null;
  instances: string[];
  baseUrl: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<PsgSubmitPayload>;

  const {
    csi = "",
    newCsi = null,
    domainType = "both",
    nonProdDomains = [],
    prodDomains = [],
    crNumber = null,
    instances = [],
    baseUrl = "",
  } = body;

  // Dummy implementation for the prototype – in a real app this is where
  // you would call the PSG service and persist the whitelist configuration.

  return Response.json(
    {
      ok: true,
      message: "Mock PSG whitelist submission received.",
      csi,
      newCsi,
      domainType,
      nonProdDomainCount: nonProdDomains.length,
      prodDomainCount: prodDomains.length,
      hasCrNumber: !!crNumber,
      instanceCount: instances.length,
      baseUrl,
    },
    { status: 200 }
  );
}


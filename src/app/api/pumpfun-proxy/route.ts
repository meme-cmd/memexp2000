import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface PumpFunResponse {
  metadataUri: string;
  metadata: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    if (!(file instanceof File) && !file) {
      return NextResponse.json(
        { error: "Missing required 'file' field in form data" },
        { status: 400 },
      );
    }

    const apiKey =
      process.env.PUMPFUN_API_KEY ??
      "94r6gy28en1pmwa765456av4cx24ehhh6xd5ew32d145cjhq8rr4wxvta4t6ye9jchwmrgjmadhpmt1ten2pwxa669h3ejufdtr38w3af8upeu2pctpmmxkuet37aka3ddt7mx23cwykuarwn0j3bat32yvjbad15mghn6r6d67cku25xrpwy26ctd74hv589a3egapdn8kuf8";

    try {
      const response = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        console.error(
          `Pump.fun API error: ${response.status} ${response.statusText}`,
        );
        const errorText = await response.text();

        try {
          const errorJson = JSON.parse(errorText) as Record<string, unknown>;
          return NextResponse.json(
            { error: errorJson, statusText: response.statusText },
            { status: response.status },
          );
        } catch (parseError) {
          return NextResponse.json(
            { error: errorText, statusText: response.statusText },
            { status: response.status },
          );
        }
      }

      const data = (await response.json()) as PumpFunResponse;
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error("Fetch error in pumpfun-proxy:", fetchError);
      return NextResponse.json(
        {
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Unknown fetch error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in pumpfun-proxy:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

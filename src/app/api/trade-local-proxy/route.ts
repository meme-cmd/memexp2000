import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUMPFUN_API_KEY =
  "94r6gy28en1pmwa765456av4cx24ehhh6xd5ew32d145cjhq8rr4wxvta4t6ye9jchwmrgjmadhpmt1ten2pwxa669h3ejufdtr38w3af8upeu2pctpmmxkuet37aka3ddt7mx23cwykuarwn0j3bat32yvjbad15mghn6r6d67cku25xrpwy26ctd74hv589a3egapdn8kuf8";

interface TradeLocalBody {
  action: string;
  publicKey: string;
  mint?: string;
  tokenMetadata?: {
    name: string;
    symbol: string;
    uri: string;
  };
  [key: string]: unknown;
}

interface ErrorResponse {
  error: string | Record<string, unknown>;
  statusText?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TradeLocalBody;

    try {
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": PUMPFUN_API_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(
          `Pumpportal.fun API error: ${response.status} ${response.statusText}`,
        );

        try {
          const errorText = await response.text();
          console.error("Error response:", errorText);

          try {
            const errorJson = JSON.parse(errorText) as Record<string, unknown>;
            return NextResponse.json(
              {
                error: errorJson,
                statusText: response.statusText,
              } as ErrorResponse,
              { status: response.status },
            );
          } catch {
            return NextResponse.json(
              {
                error: errorText,
                statusText: response.statusText,
              } as ErrorResponse,
              { status: response.status },
            );
          }
        } catch {
          return NextResponse.json(
            {
              error: `Pump.fun API error: ${response.status} ${response.statusText}`,
            } as ErrorResponse,
            { status: response.status },
          );
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });
    } catch (fetchError) {
      console.error("Fetch error in trade-local-proxy:", fetchError);
      return NextResponse.json(
        {
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Unknown fetch error",
        } as ErrorResponse,
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in trade-local-proxy:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      } as ErrorResponse,
      { status: 500 },
    );
  }
}

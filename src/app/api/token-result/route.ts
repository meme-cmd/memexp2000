import type { NextResponse as NextResponseType } from "next/server";
import { NextResponse } from "next/server";
import { storage } from "@/server/api/routers/r2";

// Define types to prevent linting errors
interface Backroom {
  id: string;
  topic: string;
  [key: string]: unknown;
}

interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  pumpfun: {
    signature: string;
    metadataUri: string;
  };
  [key: string]: unknown;
}

interface PendingToken {
  decimals?: number;
  supply?: number;
  creator?: string;
  [key: string]: unknown;
}

export async function POST(request: Request): Promise<NextResponseType> {
  try {
    const data = (await request.json()) as {
      backroomId?: string;
      tokenInfo?: TokenInfo;
    };
    const { backroomId, tokenInfo } = data;

    if (!backroomId || !tokenInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get the backroom data
    const backroom = await storage.getObject<Backroom>(
      `backrooms/${backroomId}.json`,
    );

    if (!backroom) {
      return NextResponse.json(
        { error: "Backroom not found" },
        { status: 404 },
      );
    }

    // Get pending token info to add additional details
    let pendingTokenInfo: PendingToken | null = null;
    try {
      pendingTokenInfo = await storage.getObject<PendingToken>(
        `backrooms/${backroomId}/pending_token.json`,
      );
    } catch {
      // It's okay if there's no pending token
    }

    // Create final token record
    const completeTokenInfo = {
      ...tokenInfo,
      backroomId: backroomId,
      topic: backroom.topic,
      launchedAt: new Date(),
      // Add any additional fields from pending token if available
      ...(pendingTokenInfo && {
        decimals: pendingTokenInfo.decimals,
        supply: pendingTokenInfo.supply,
        creator: pendingTokenInfo.creator,
      }),
    };

    // Save the final token info
    await storage.saveObject(
      `backrooms/${backroomId}/token.json`,
      completeTokenInfo,
    );

    // Mark pending token as processed
    if (pendingTokenInfo) {
      const processedToken = {
        ...pendingTokenInfo,
        status: "processed",
        processedAt: new Date(),
      };

      await storage.saveObject(
        `backrooms/${backroomId}/pending_token.json`,
        processedToken,
      );
    }

    return NextResponse.json({
      success: true,
      tokenInfo: completeTokenInfo,
    });
  } catch (error) {
    console.error("Error saving token result:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

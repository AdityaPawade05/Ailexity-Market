import { NextRequest, NextResponse } from "next/server";
import { callAI, type ChatMessage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = (await req.json()) as {
      message: string;
      history: ChatMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Fetch brief marketplace context (keep it small to save tokens)
    const [productCount, recentProducts] = await Promise.all([
      prisma.product.count({ where: { published: true } }),
      prisma.product.findMany({
        where: { published: true },
        select: { title: true, type: true, price: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Build a compact context string
    const productList = recentProducts
      .map((p) => `${p.title} (${p.type}, $${p.price})`)
      .join("; ");

    const contextMessage = `[Context: ${productCount} products. Recent: ${productList}]\n\n${message}`;

    // Keep only last 6 history messages to stay well within token limits
    const messages: ChatMessage[] = [
      ...(history || []).slice(-6),
      { role: "user", content: contextMessage },
    ];

    const reply = await callAI(messages);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI Chat error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Something went wrong";

    // Provide helpful fallback if API keys aren't configured
    if (errorMessage.includes("No AI API key")) {
      return NextResponse.json(
        {
          reply:
            "👋 I'm not fully set up yet! The marketplace admin needs to add an AI API key. In the meantime, feel free to browse our products or check the FAQ.",
          configError: true,
        },
        { status: 200 }
      );
    }

    // For any other error, still return a user-friendly message
    return NextResponse.json(
      {
        reply:
          "I'm having a temporary issue connecting. Please try again in a few seconds! 🔄",
      },
      { status: 200 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { title, type, price } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const prompt = `You are an expert copywriter for a digital marketplace. 
Generate a compelling, professional product description for the following product:

Title: "${title}"
Type: ${type} (e.g. ebook, course, or saas tool)
Price: $${price || 0}

The description should:
1. Have an engaging opening hook
2. List 3-4 key bullet points of what the user will get/learn
3. End with a strong call to action
4. Be formatted in clear Markdown
5. Keep it under 250 words

Return ONLY the markdown description text, without any additional conversational text or JSON wrapping.`;

    // Note: Our shared callAI utility expects ChatMessage[]
    const reply = await callAI([{ role: "user", content: prompt }]);

    return NextResponse.json({ description: reply.trim() });
  } catch (error) {
    console.error("Generate Description error:", error);
    return NextResponse.json(
      { error: "Failed to generate description. Check your AI API keys." },
      { status: 500 }
    );
  }
}

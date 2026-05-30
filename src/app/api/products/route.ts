import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { published: true };
  if (type === "ebook" || type === "course" || type === "saas") where.type = type;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      seller: {
        select: { id: true, name: true, avatar: true },
      },
      _count: {
        select: { purchases: true },
      },
    },
    orderBy: [
      {
        purchases: {
          _count: "desc",
        },
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "seller", "buyer", "user"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, price, type, imageUrl, fileUrl, audioUrl, duration, pages, courseContent, published } = body;

    if (!title || !description || price == null || !type) {
      return NextResponse.json(
        { error: "Title, description, price, and type are required" },
        { status: 400 }
      );
    }

    if (type !== "ebook" && type !== "course" && type !== "saas") {
      return NextResponse.json({ error: "Type must be ebook, course, or saas" }, { status: 400 });
    }

    let parsedCourseContent: string | null = null;
    if (courseContent) {
      parsedCourseContent = typeof courseContent === 'string' ? courseContent : JSON.stringify(courseContent);
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        type,
        imageUrl: imageUrl || null,
        fileUrl: fileUrl || null,
        audioUrl: (audioUrl || null) as any,
        duration: duration || null,
        pages: pages ? parseInt(pages) : null,
        courseContent: parsedCourseContent,
        sellerId: session.userId,
        published: published === true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

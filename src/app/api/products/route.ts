import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parsePrice } from "@/lib/money";
import { Prisma } from "@prisma/client";

const SORTS = ["popular", "newest", "price_asc", "price_desc"] as const;
type Sort = (typeof SORTS)[number];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sortParam = searchParams.get("sort");
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "popular";

  const where: Prisma.ProductWhereInput = { published: true };
  if (type === "ebook" || type === "course" || type === "saas") where.type = type;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  const min = minPrice !== null ? Number(minPrice) : null;
  const max = maxPrice !== null ? Number(maxPrice) : null;
  if ((min !== null && Number.isFinite(min)) || (max !== null && Number.isFinite(max))) {
    where.price = {
      ...(min !== null && Number.isFinite(min) ? { gte: min } : {}),
      ...(max !== null && Number.isFinite(max) ? { lte: max } : {}),
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "newest"
      ? [{ createdAt: "desc" }]
      : sort === "price_asc"
      ? [{ price: "asc" }]
      : sort === "price_desc"
      ? [{ price: "desc" }]
      : [{ purchases: { _count: "desc" } }, { createdAt: "desc" }];

  const session = await getSession();

  const products = await prisma.product.findMany({
    where,
    include: {
      seller: {
        select: { id: true, name: true, avatar: true },
      },
      _count: {
        select: { purchases: true },
      },
      reviews: {
        select: { rating: true },
      },
      ...(session?.userId
        ? { wishlistItems: { where: { userId: session.userId }, select: { id: true } } }
        : {}),
    },
    orderBy,
  });

  const withRatings = products.map(({ reviews, wishlistItems, ...product }) => ({
    ...product,
    avgRating: reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null,
    reviewCount: reviews.length,
    isSaved: Array.isArray(wishlistItems) && wishlistItems.length > 0,
  }));

  return NextResponse.json(withRatings);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
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

    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
    }

    let parsedCourseContent: string | null = null;
    if (courseContent) {
      parsedCourseContent = typeof courseContent === 'string' ? courseContent : JSON.stringify(courseContent);
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parsedPrice,
        type,
        imageUrl: imageUrl || null,
        fileUrl: fileUrl || null,
        audioUrl: audioUrl || null,
        duration: duration || null,
        pages: pages ? parseInt(pages, 10) || null : null,
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

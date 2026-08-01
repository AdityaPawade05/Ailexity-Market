import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parsePrice } from "@/lib/money";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (!product.published) {
    const session = await getSession();
    const isOwner = session?.userId === product.sellerId;
    const isAdmin = session?.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
  }

  return NextResponse.json(product);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (session.role !== "admin" && product.sellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    let price = product.price;
    if (body.price != null) {
      const parsedPrice = parsePrice(body.price);
      if (parsedPrice === null) {
        return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
      }
      price = parsedPrice;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        title: body.title ?? product.title,
        description: body.description ?? product.description,
        price,
        type: body.type ?? product.type,
        imageUrl: body.imageUrl ?? product.imageUrl,
        fileUrl: body.fileUrl ?? product.fileUrl,
        audioUrl: body.audioUrl ?? product.audioUrl,
        duration: body.duration ?? product.duration,
        pages: body.pages != null ? parseInt(body.pages, 10) || null : product.pages,
        published: body.published ?? product.published,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (session.role !== "admin" && product.sellerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

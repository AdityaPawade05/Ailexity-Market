import { prisma } from "@/lib/prisma";

// A "business" in the dashboard is either a Product or a Channel (called
// "community" in URLs/UI). Resolves who owns it, or null if it doesn't exist.
export async function resolveBusinessOwner(businessType: string, businessId: string): Promise<string | null> {
  if (businessType === "product") {
    const product = await prisma.product.findUnique({ where: { id: businessId }, select: { sellerId: true } });
    return product?.sellerId ?? null;
  }
  if (businessType === "community") {
    const channel = await prisma.channel.findUnique({ where: { id: businessId }, select: { ownerId: true } });
    return channel?.ownerId ?? null;
  }
  return null;
}

export async function getBusinessName(businessType: string, businessId: string): Promise<string | null> {
  if (businessType === "product") {
    const product = await prisma.product.findUnique({ where: { id: businessId }, select: { title: true } });
    return product?.title ?? null;
  }
  if (businessType === "community") {
    const channel = await prisma.channel.findUnique({ where: { id: businessId }, select: { name: true } });
    return channel?.name ?? null;
  }
  return null;
}

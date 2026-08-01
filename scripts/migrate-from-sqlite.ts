import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const dir = "C:\\Users\\adity\\AppData\\Local\\Temp\\migration";

function load(table: string): any[] {
  const file = path.join(dir, `${table}.json`);
  const raw = fs.readFileSync(file, "utf-8").trim();
  return raw ? JSON.parse(raw) : [];
}

const toDate = (ms: number) => new Date(ms);
const toBool = (v: number) => v === 1;

async function main() {
  // Wipe current placeholder data (cascades to Product, Channel, Post, etc.)
  await prisma.user.deleteMany({});

  const users = load("User");
  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        coverImageUrl: u.coverImageUrl,
        bio: u.bio,
        location: u.location,
        socialLinks: u.socialLinks,
        username: u.username,
        emailVerified: toBool(u.emailVerified),
        verifyToken: u.verifyToken,
        verifyTokenExp: u.verifyTokenExp ? toDate(u.verifyTokenExp) : null,
        createdAt: toDate(u.createdAt),
        updatedAt: toDate(u.updatedAt),
      },
    });
  }
  console.log(`Restored ${users.length} users`);

  const products = load("Product");
  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        type: p.type,
        imageUrl: p.imageUrl,
        fileUrl: p.fileUrl,
        audioUrl: p.audioUrl,
        duration: p.duration,
        pages: p.pages,
        courseContent: p.courseContent,
        sellerId: p.sellerId,
        published: toBool(p.published),
        createdAt: toDate(p.createdAt),
        updatedAt: toDate(p.updatedAt),
      },
    });
  }
  console.log(`Restored ${products.length} products`);

  const channels = load("Channel");
  for (const c of channels) {
    await prisma.channel.create({
      data: {
        id: c.id,
        name: c.name,
        description: c.description,
        coverImageUrl: c.coverImageUrl,
        avatarUrl: c.avatarUrl,
        category: c.category,
        price: c.price,
        ownerId: c.ownerId,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
      },
    });
  }
  console.log(`Restored ${channels.length} channels`);

  const posts = load("Post");
  for (const p of posts) {
    await prisma.post.create({
      data: {
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
        attachmentUrl: p.attachmentUrl,
        attachmentType: p.attachmentType,
        authorId: p.authorId,
        channelId: p.channelId,
        createdAt: toDate(p.createdAt),
      },
    });
  }
  console.log(`Restored ${posts.length} posts`);

  const channelFollows = load("ChannelFollow");
  for (const cf of channelFollows) {
    await prisma.channelFollow.create({
      data: {
        id: cf.id,
        followerId: cf.followerId,
        channelId: cf.channelId,
        createdAt: toDate(cf.createdAt),
      },
    });
  }
  console.log(`Restored ${channelFollows.length} channel follows`);

  const likes = load("Like");
  for (const l of likes) {
    await prisma.like.create({
      data: {
        id: l.id,
        userId: l.userId,
        postId: l.postId,
        createdAt: toDate(l.createdAt),
      },
    });
  }
  console.log(`Restored ${likes.length} likes`);

  const comments = load("Comment");
  for (const c of comments) {
    await prisma.comment.create({
      data: {
        id: c.id,
        content: c.content,
        userId: c.userId,
        postId: c.postId,
        attachmentUrl: c.attachmentUrl,
        attachmentType: c.attachmentType,
        createdAt: toDate(c.createdAt),
      },
    });
  }
  console.log(`Restored ${comments.length} comments`);

  const follows = load("Follow");
  for (const f of follows) {
    await prisma.follow.create({
      data: {
        id: f.id,
        followerId: f.followerId,
        followingId: f.followingId,
        createdAt: toDate(f.createdAt),
      },
    });
  }
  console.log(`Restored ${follows.length} follows`);

  const invoices = load("Invoice");
  for (const i of invoices) {
    await prisma.invoice.create({
      data: {
        id: i.id,
        amount: i.amount,
        status: i.status,
        dueDate: toDate(i.dueDate),
        description: i.description,
        customerName: i.customerName,
        customerEmail: i.customerEmail,
        sellerId: i.sellerId,
        productId: i.productId,
        createdAt: toDate(i.createdAt),
        updatedAt: toDate(i.updatedAt),
      },
    });
  }
  console.log(`Restored ${invoices.length} invoices`);

  const checkoutLinks = load("CheckoutLink");
  for (const c of checkoutLinks) {
    await prisma.checkoutLink.create({
      data: {
        id: c.id,
        title: c.title,
        amount: c.amount,
        sellerId: c.sellerId,
        productId: c.productId,
        status: c.status,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
      },
    });
  }
  console.log(`Restored ${checkoutLinks.length} checkout links`);

  const purchases = load("Purchase");
  for (const p of purchases) {
    await prisma.purchase.create({
      data: {
        id: p.id,
        buyerId: p.buyerId,
        sellerId: p.sellerId,
        productId: p.productId,
        channelId: p.channelId,
        amount: p.amount,
        commissionAmount: 0,
        sellerEarning: p.amount,
        referredBy: p.referredBy,
        createdAt: toDate(p.createdAt),
      } as any,
    });
  }
  console.log(`Restored ${purchases.length} purchases`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

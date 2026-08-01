import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);
  let admin = await prisma.user.findUnique({
    where: { email: "admin@ailexity.com" },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: "admin@ailexity.com",
        password: adminPassword,
        name: "Admin",
        role: "admin",
        emailVerified: true,
      },
    });
  } else {
    admin = await prisma.user.update({
      where: { email: "admin@ailexity.com" },
      data: {
        password: adminPassword,
        name: "Admin",
        role: "admin",
        emailVerified: true,
      },
    });
  }
  console.log("Admin user:", admin.email, "| Password: admin123");

  const sellerPassword = await bcrypt.hash("seller123", 12);
  let seller = await prisma.user.findUnique({
    where: { email: "seller@ailexity.com" },
  });
  if (!seller) {
    seller = await prisma.user.create({
      data: {
        email: "seller@ailexity.com",
        password: sellerPassword,
        name: "Sample Seller",
        role: "user",
        emailVerified: true,
      },
    });
  } else {
    seller = await prisma.user.update({
      where: { email: "seller@ailexity.com" },
      data: {
        password: sellerPassword,
        name: "Sample Seller",
        role: "user",
        emailVerified: true,
      },
    });
  }
  console.log("Seller user:", seller.email, "| Password: seller123");

  let buyerUser = await prisma.user.findUnique({
    where: { email: "buyer@ailexity.com" },
  });
  if (!buyerUser) {
    buyerUser = await prisma.user.create({
      data: {
        email: "buyer@ailexity.com",
        password: await bcrypt.hash("buyer123", 12),
        name: "Sample Buyer",
        role: "user",
        emailVerified: true,
      },
    });
  } else {
    buyerUser = await prisma.user.update({
      where: { email: "buyer@ailexity.com" },
      data: {
        password: await bcrypt.hash("buyer123", 12),
        name: "Sample Buyer",
        role: "user",
        emailVerified: true,
      },
    });
  }
  console.log("Buyer user: buyer@ailexity.com | Password: buyer123");

  const adityaPassword = await bcrypt.hash("aditya123", 12);
  let aditya = await prisma.user.findUnique({
    where: { email: "aditya@ailexity.com" },
  });
  if (!aditya) {
    aditya = await prisma.user.create({
      data: {
        email: "aditya@ailexity.com",
        password: adityaPassword,
        name: "Aditya Pawade",
        role: "user",
        emailVerified: true,
      },
    });
  } else {
    aditya = await prisma.user.update({
      where: { email: "aditya@ailexity.com" },
      data: {
        password: adityaPassword,
        name: "Aditya Pawade",
        role: "user",
        emailVerified: true,
      },
    });
  }
  console.log("Aditya user:", aditya.email, "| Password: aditya123");

  const peterPassword = await bcrypt.hash("peter123", 12);
  let peter = await prisma.user.findUnique({
    where: { email: "peter@ailexity.com" },
  });
  if (!peter) {
    peter = await prisma.user.create({
      data: {
        email: "peter@ailexity.com",
        password: peterPassword,
        name: "Peter Parker",
        role: "user",
        emailVerified: true,
      },
    });
  } else {
    peter = await prisma.user.update({
      where: { email: "peter@ailexity.com" },
      data: {
        password: peterPassword,
        name: "Peter Parker",
        role: "user",
        emailVerified: true,
      },
    });
  }
  console.log("Peter user:", peter.email, "| Password: peter123");

  const buyer = await prisma.user.findUnique({
    where: { email: "buyer@ailexity.com" },
    select: { id: true },
  });
  if (!buyer) throw new Error("Buyer not found after upsert");

  const existingProducts = await prisma.product.count();
  if (existingProducts === 0) {
    await prisma.product.create({
      data: {
        title: "Complete Guide to Digital Marketing",
        description: "A comprehensive ebook covering SEO, social media, email marketing, and paid ads. Perfect for beginners and intermediates.",
        price: 29.99,
        type: "ebook",
        pages: 250,
        sellerId: seller.id,
        published: true,
        imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
      },
    });

    await prisma.product.create({
      data: {
        title: "React & Next.js Masterclass",
        description: "Learn to build modern web applications with React and Next.js. From basics to advanced patterns.",
        price: 79.99,
        type: "course",
        duration: "12 hours",
        sellerId: seller.id,
        published: true,
        imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
      },
    });

    await prisma.product.create({
      data: {
        title: "Financial Freedom: A Practical Guide",
        description: "Step-by-step strategies for building wealth and achieving financial independence.",
        price: 24.99,
        type: "ebook",
        pages: 180,
        sellerId: seller.id,
        published: true,
        imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
      },
    });

    console.log("Created sample products");
  }

  const existingChannels = await prisma.channel.count();
  if (existingChannels === 0) {
    const sellerChannel = await prisma.channel.create({
      data: {
        name: "Ailexity Studio",
        description: "Ebooks, courses, and creator updates.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200",
        avatarUrl:
          "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200",
        category: "Education",
        ownerId: seller.id,
      },
    });

    const adminChannel = await prisma.channel.create({
      data: {
        name: "Ailexity HQ",
        description: "Company announcements and featured posts.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200",
        avatarUrl:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
        category: "Business",
        ownerId: admin.id,
      },
    });

    const post1 = await prisma.post.create({
      data: {
        content:
          "Tips dropped in Telegram. Match: Arsenal vs Man City. Get it now before kickoff. Don't miss this one!",
        imageUrl:
          "https://images.unsplash.com/photo-1520975682031-a6d29f7a6a4f?w=1000",
        authorId: seller.id,
        channelId: sellerChannel.id,
      },
      include: { author: { select: { id: true } } },
    });

    const post2 = await prisma.post.create({
      data: {
        content:
          "Welcome to Ailexity Market. New creators, new ebooks, new courses every week.",
        authorId: admin.id,
        channelId: adminChannel.id,
      },
    });

    const globalPost = await prisma.post.create({
      data: {
        content:
          "Ailexity Market is live. Log in and start following creators and communities.",
        authorId: admin.id,
        imageUrl:
          "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1000",
      },
    });

    await prisma.like.create({
      data: { userId: buyer.id, postId: post1.id },
    });

    await prisma.comment.create({
      data: {
        content: "This is exactly what I needed. Thanks!",
        userId: buyer.id,
        postId: post1.id,
      },
    });

    // Buyer follows seller for the main feed
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: buyer.id, followingId: seller.id },
      },
    });
    if (!existingFollow) {
      await prisma.follow.create({
        data: { followerId: buyer.id, followingId: seller.id },
      });
    }

    // Buyer follows seller's channel
    await prisma.channelFollow.create({
      data: { followerId: buyer.id, channelId: sellerChannel.id },
    });

    console.log("Created sample channels + posts");
  }

  console.log("\nSeed completed! Admin login: admin@ailexity.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

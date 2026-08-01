import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"],
  product: ["application/pdf", "application/zip", "video/mp4", "application/octet-stream"],
  audio: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/aac", "audio/x-wav"],
  chat: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const rawType = (formData.get("type") as string | null) ?? "image";
  // Only accept known upload types — rawType is user input and is used as a
  // directory name below, so anything else must be rejected.
  const type = Object.hasOwn(ALLOWED, rawType) ? rawType : "image";

  if (!file || file.size === 0) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 50 MB)" }, { status: 400 });
  }

  const allowed = ALLOWED[type];
  if (!allowed.includes(file.type)) {
    return Response.json(
      { error: `File type "${file.type}" is not allowed for upload type "${type}"` },
      { status: 400 }
    );
  }

  // Keep only safe characters — the extension comes from the user-supplied
  // file name and ends up in a filesystem path.
  const rawExt = file.name.includes(".") ? file.name.split(".").pop()! : "";
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = cleanExt || "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", type);

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadDir, safeName), buffer);

  return Response.json({ url: `/uploads/${type}/${safeName}` });
}

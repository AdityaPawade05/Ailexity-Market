export type UploadType = "image" | "product" | "audio" | "chat" | "video";

export async function uploadFile(file: File, type: UploadType): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("type", type);

  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

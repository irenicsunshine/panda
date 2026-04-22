import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const edgestoreUrl = await redis.get<string>(token);

  if (!edgestoreUrl) {
    return new NextResponse("File not found or already used.", { status: 404 });
  }

  // Delete from Redis immediately so it can't be used again
  await redis.del(token);

  // Fetch the file from EdgeStore
  const fileRes = await fetch(edgestoreUrl);
  if (!fileRes.ok) {
    return new NextResponse("Failed to fetch file.", { status: 502 });
  }

  const contentType = fileRes.headers.get("content-type") ?? "application/octet-stream";
  const contentDisposition = fileRes.headers.get("content-disposition") ?? "attachment";
  const buffer = await fileRes.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
    },
  });
}

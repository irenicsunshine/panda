"use server";

import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

const redis = Redis.fromEnv();

export async function createOneTimeUrl(edgestoreUrl: string): Promise<string> {
  const token = randomUUID();
  // Store token → edgestore URL, expires in 7 days
  await redis.set(token, edgestoreUrl, { ex: 60 * 60 * 24 * 7 });
  return token;
}

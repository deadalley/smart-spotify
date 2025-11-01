import { createClient, RedisClientType } from "redis";

const client: RedisClientType = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

client.on("error", (err: Error) => {
  console.error("Redis Client Error:", err);
});

client.on("connect", () => {
  console.log("🔗 Connected to Redis");
});

export const connectRedis = async () => {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
};

export { client as redisClient };

import { redisClient } from "../redis";

export interface UserSourceData {
  userId: string;
  accessToken: string;
  refreshToken?: string;
}

export interface AuthUser {
  createdAt?: string;
  ytMusic?: UserSourceData;
  spotify?: UserSourceData;
}

export class AuthService {
  // Generic function to generate Redis keys
  private getRedisKey(userId: string): string {
    const namespace = `smart-spotify:user`;

    return `${namespace}:${userId}`;
  }

  async getUser(userId: string): Promise<AuthUser | null> {
    const userKey = this.getRedisKey(userId);
    const userData = await redisClient.hGetAll(userKey);

    if (!userData || Object.keys(userData).length === 0) {
      return null;
    }

    return {
      spotify: userData.spotify ? JSON.parse(userData.spotify) : undefined,
      ytMusic: userData.ytMusic ? JSON.parse(userData.ytMusic) : undefined,
    };
  }

  async createUser(userId: string): Promise<string> {
    const userKey = this.getRedisKey(userId);
    const exists = await redisClient.exists(userKey);

    if (exists) {
      return userId;
    }

    await redisClient.hSet(userKey, "createdAt", new Date().toISOString());
    return userId;
  }

  async storeSpotifyToken(userId: string, data: AuthUser["spotify"]) {
    const userKey = this.getRedisKey(userId);
    await redisClient.hSet(userKey, "spotify", JSON.stringify(data));
  }

  async storeYouTubeToken(userId: string, data: AuthUser["ytMusic"]) {
    const userKey = this.getRedisKey(userId);
    await redisClient.hSet(userKey, "ytMusic", JSON.stringify(data));
  }
}

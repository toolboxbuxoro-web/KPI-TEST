import Redis from 'ioredis'

// Support Railway Redis via REDIS_URL
const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL

class RedisClient {
  private client: Redis | null = null

  constructor() {
    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null
          return Math.min(times * 100, 3000)
        }
      })
      
      this.client.on('error', (err) => {
        console.error('Redis connection error:', err)
      })
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null
    try {
      return await this.client.get(key)
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  // Compatible with Upstash API: redis.set(key, value, { ex: TTL })
  async set(key: string, value: string | object, options?: { ex?: number }): Promise<void> {
    if (!this.client) return
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      if (options?.ex) {
        await this.client.set(key, stringValue, 'EX', options.ex)
      } else {
        await this.client.set(key, stringValue)
      }
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return
    try {
      await this.client.del(key)
    } catch (error) {
      console.error('Redis delete error:', error)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return []
    try {
      return await this.client.keys(pattern)
    } catch (error) {
      console.error('Redis keys error:', error)
      return []
    }
  }
}

export const redis = new RedisClient()

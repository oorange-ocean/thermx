// IndexedDB 缓存工具类
import SHA256 from 'crypto-js/sha256';
import { enc } from 'crypto-js';

interface CacheOptions {
  // 缓存过期时间（毫秒），默认1小时
  expireTime?: number;
}

// 缓存项结构
interface CacheItem<T> {
  key: string;
  data: T;
  timestamp: number;
  expireTime: number;
  hash: string; // 添加哈希值
}

class IndexedDBCache {
  private dbName = 'thermalDataCache';
  private storeName = 'dataStore';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<boolean>;

  private defaultOptions: CacheOptions = {
    expireTime: 60 * 60 * 1000, // 默认1小时
  };

  // 添加用于存储原始数据的缓存键名
  private readonly RAW_DATA_CACHE_KEY = 'rawSteadyStateData';

  constructor() {
    this.dbReady = this.initDB();
  }

  /**
   * 计算数据的哈希值
   * @param data 要计算哈希的数据
   * @returns 哈希字符串
   */
  private calculateHash(data: any): string {
    // 将数据转换为JSON字符串，然后计算SHA-256哈希
    const jsonStr = JSON.stringify(data);
    return SHA256(jsonStr).toString(enc.Hex);
  }

  /**
   * 初始化数据库
   */
  private async initDB(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('[缓存] 无法打开IndexedDB:', event);
        reject(false);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('[缓存] IndexedDB连接成功');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储，使用key作为索引
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('hash', 'hash', { unique: false }); // 添加哈希索引
          console.log('[缓存] 创建IndexedDB存储');
        }
      };
    });
  }

  /**
   * 保存数据到缓存
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param options 缓存选项
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    await this.dbReady;
    if (!this.db) {
      console.error('[缓存] 数据库未初始化');
      return;
    }

    const opts = { ...this.defaultOptions, ...options };
    const hash = this.calculateHash(data);

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const item: CacheItem<T> = {
          key,
          data,
          timestamp: Date.now(),
          expireTime: opts.expireTime!,
          hash,
        };

        const request = store.put(item);

        request.onsuccess = () => {
          console.log(`[缓存] 数据已保存: ${key} (哈希: ${hash.substring(0, 8)}...)`);
          resolve();
        };

        request.onerror = (event) => {
          console.error(`[缓存] 保存数据失败: ${key}`, event);
          reject(event);
        };
      } catch (error) {
        console.error(`[缓存] 保存数据时发生错误: ${key}`, error);
        reject(error);
      }
    });
  }

  /**
   * 检查数据哈希是否匹配
   * @param key 缓存键
   * @param data 要比较的数据
   * @returns 如果哈希匹配则返回true
   */
  async compareHash<T>(key: string, data: T): Promise<boolean> {
    await this.dbReady;
    if (!this.db) {
      console.error('[缓存] 数据库未初始化');
      return false;
    }

    const newHash = this.calculateHash(data);

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result as CacheItem<T> | undefined;

          if (!item) {
            resolve(false);
            return;
          }

          const isMatch = item.hash === newHash;
          console.log(
            `[缓存] 哈希对比: ${isMatch ? '匹配' : '不匹配'} (${item.hash.substring(0, 8)}... vs ${newHash.substring(0, 8)}...)`
          );
          resolve(isMatch);
        };

        request.onerror = () => {
          resolve(false);
        };
      } catch (error) {
        console.error(`[缓存] 对比哈希时发生错误: ${key}`, error);
        resolve(false);
      }
    });
  }

  /**
   * 从缓存获取数据
   * @param key 缓存键
   * @returns 缓存的数据，如果已过期或不存在则返回null
   */
  async get<T>(key: string): Promise<T | null> {
    await this.dbReady;
    if (!this.db) {
      console.error('[缓存] 数据库未初始化');
      return null;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result as CacheItem<T> | undefined;

          if (!item) {
            console.log(`[缓存] 未找到: ${key}`);
            resolve(null);
            return;
          }

          const now = Date.now();
          if (now - item.timestamp > item.expireTime) {
            console.log(`[缓存] 已过期: ${key} (哈希: ${item.hash.substring(0, 8)}...)`);
            this.clear(key); // 删除过期项
            resolve(null);
            return;
          }

          console.log(`[缓存] 命中: ${key} (哈希: ${item.hash.substring(0, 8)}...)`);
          resolve(item.data);
        };

        request.onerror = (event) => {
          console.error(`[缓存] 获取数据失败: ${key}`, event);
          reject(event);
        };
      } catch (error) {
        console.error(`[缓存] 获取数据时发生错误: ${key}`, error);
        reject(error);
      }
    });
  }

  /**
   * 获取缓存项的元数据（不包含实际数据）
   * @param key 缓存键
   * @returns 元数据对象
   */
  async getMetadata(key: string): Promise<{ hash: string; timestamp: number } | null> {
    await this.dbReady;
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result as CacheItem<any> | undefined;
          if (!item) {
            resolve(null);
            return;
          }

          resolve({
            hash: item.hash,
            timestamp: item.timestamp,
          });
        };

        request.onerror = () => resolve(null);
      } catch (error) {
        console.error(`[缓存] 获取元数据失败: ${key}`, error);
        resolve(null);
      }
    });
  }

  /**
   * 清除特定缓存
   * @param key 缓存键
   */
  async clear(key: string): Promise<void> {
    await this.dbReady;
    if (!this.db) {
      console.error('[缓存] 数据库未初始化');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          console.log(`[缓存] 已清除: ${key}`);
          resolve();
        };

        request.onerror = (event) => {
          console.error(`[缓存] 清除数据失败: ${key}`, event);
          reject(event);
        };
      } catch (error) {
        console.error(`[缓存] 清除数据时发生错误: ${key}`, error);
        reject(error);
      }
    });
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    await this.dbReady;
    if (!this.db) {
      console.error('[缓存] 数据库未初始化');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[缓存] 已清除所有缓存');
          resolve();
        };

        request.onerror = (event) => {
          console.error('[缓存] 清除所有数据失败', event);
          reject(event);
        };
      } catch (error) {
        console.error('[缓存] 清除所有数据时发生错误', error);
        reject(error);
      }
    });
  }

  /**
   * 清除过期缓存
   */
  async clearExpired(): Promise<void> {
    await this.dbReady;
    if (!this.db) {
      console.error('[缓存] 数据库未初始化');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('timestamp');
        const now = Date.now();

        // 获取所有缓存项
        const request = index.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

          if (cursor) {
            const item = cursor.value as CacheItem<any>;

            // 检查是否过期
            if (now - item.timestamp > item.expireTime) {
              console.log(`[缓存] 清除过期项: ${item.key}`);
              const deleteRequest = cursor.delete();
              deleteRequest.onerror = (event) => {
                console.error(`[缓存] 删除过期项失败: ${item.key}`, event);
              };
            }

            cursor.continue();
          } else {
            console.log('[缓存] 过期项清理完成');
            resolve();
          }
        };

        request.onerror = (event) => {
          console.error('[缓存] 清除过期项失败', event);
          reject(event);
        };
      } catch (error) {
        console.error('[缓存] 清除过期项时发生错误', error);
        reject(error);
      }
    });
  }

  /**
   * 保存原始稳态数据到缓存
   * @param data 要缓存的原始CSV数据
   * @param options 缓存选项
   */
  async saveRawSteadyStateData<T>(data: T, options?: CacheOptions): Promise<void> {
    return this.set(this.RAW_DATA_CACHE_KEY, data, options);
  }

  /**
   * 获取原始稳态数据
   * @returns 缓存的原始数据，如果已过期或不存在则返回null
   */
  async getRawSteadyStateData<T>(): Promise<T | null> {
    return this.get<T>(this.RAW_DATA_CACHE_KEY);
  }

  /**
   * 检查原始稳态数据是否已缓存
   * @returns 如果已缓存且未过期返回true
   */
  async hasRawSteadyStateData(): Promise<boolean> {
    const metadata = await this.getMetadata(this.RAW_DATA_CACHE_KEY);
    return metadata !== null;
  }
}

// 导出单例
export const dbCache = new IndexedDBCache();

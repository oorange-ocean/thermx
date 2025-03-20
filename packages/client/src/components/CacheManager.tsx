import React, { useState, useEffect } from 'react';
import { dbCache } from '../utils/indexedDBCache';

export const CacheManager: React.FC = () => {
  const [clearingCache, setClearingCache] = useState(false);
  const [message, setMessage] = useState('');
  const [cacheInfo, setCacheInfo] = useState<{
    localViewCached: boolean;
    globalViewCached: boolean;
    lastUpdated: {
      localView: string;
      globalView: string;
    };
  }>({
    localViewCached: false,
    globalViewCached: false,
    lastUpdated: {
      localView: '未知',
      globalView: '未知',
    },
  });

  // 获取缓存信息
  const loadCacheInfo = async () => {
    try {
      const localViewMeta = await dbCache.getMetadata('localViewData');
      const globalViewMeta = await dbCache.getMetadata('globalViewData');

      setCacheInfo({
        localViewCached: !!localViewMeta,
        globalViewCached: !!globalViewMeta,
        lastUpdated: {
          localView: localViewMeta ? new Date(localViewMeta.timestamp).toLocaleString() : '未缓存',
          globalView: globalViewMeta
            ? new Date(globalViewMeta.timestamp).toLocaleString()
            : '未缓存',
        },
      });
    } catch (error) {
      console.error('获取缓存信息失败:', error);
    }
  };

  // 初始加载缓存信息
  useEffect(() => {
    loadCacheInfo();
  }, []);

  const handleClearCache = async () => {
    try {
      setClearingCache(true);
      setMessage('正在清除缓存...');

      await dbCache.clearAll();

      setMessage('缓存已清除，下次访问将重新加载数据');
      await loadCacheInfo();
    } catch (error) {
      console.error('清除缓存失败:', error);
      setMessage('清除缓存失败，请稍后再试');
    } finally {
      setClearingCache(false);
    }
  };

  const handleRefreshCache = async () => {
    try {
      setClearingCache(true);
      setMessage('正在刷新缓存...');

      // 只清除缓存，不重新加载数据
      await Promise.all([dbCache.clear('localViewData'), dbCache.clear('globalViewData')]);

      setMessage('缓存已清除，请刷新页面重新加载数据');
      await loadCacheInfo();
    } catch (error) {
      console.error('刷新缓存失败:', error);
      setMessage('刷新缓存失败，请稍后再试');
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="cache-manager">
      <h3>缓存管理</h3>

      <div className="cache-info">
        <div>聚类数据缓存: {cacheInfo.localViewCached ? '✅ 已缓存' : '❌ 未缓存'}</div>
        <div>最后更新: {cacheInfo.lastUpdated.localView}</div>

        <div>稳态数据缓存: {cacheInfo.globalViewCached ? '✅ 已缓存' : '❌ 未缓存'}</div>
        <div>最后更新: {cacheInfo.lastUpdated.globalView}</div>
      </div>

      <div className="cache-actions">
        <button onClick={handleClearCache} disabled={clearingCache}>
          清除所有缓存
        </button>

        <button onClick={handleRefreshCache} disabled={clearingCache}>
          强制刷新缓存
        </button>
      </div>

      {message && <div className="cache-message">{message}</div>}
    </div>
  );
};

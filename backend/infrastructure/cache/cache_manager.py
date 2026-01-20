"""
Multi-layer Caching System
Implements RF-07: Enhanced caching architecture with Redis + Memory layers
L1: In-memory LRU cache for hot data
L2: Redis for shared distributed cache
L3: Database for persistent storage
"""
import asyncio
import hashlib
import json
import logging
import pickle
import time
from datetime import timedelta
from typing import Union
from enum import Enum
from functools import wraps
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

import redis.asyncio as redis
from pydantic import BaseModel


logger = logging.getLogger(__name__)


class CacheLevel(Enum):
    """Cache level enumeration"""
    L1_MEMORY = "memory"
    L2_REDIS = "redis"
    L3_DATABASE = "database"


class CacheMetrics(BaseModel):
    """Cache performance metrics"""
    l1_hits: int = 0
    l1_misses: int = 0
    l2_hits: int = 0
    l2_misses: int = 0
    total_requests: int = 0
    average_response_time_ms: float = 0.0
    cache_size_bytes: int = 0
    eviction_count: int = 0


class CacheConfig(BaseModel):
    """Cache configuration"""
    redis_url: str = "redis://redis:6379/0"
    l1_max_size: int = 10000
    l1_ttl_seconds: int = 900  # 15 minutes
    l2_default_ttl_seconds: int = 3600  # 1 hour
    enable_compression: bool = True
    key_prefix: str = "prospecai"


class CacheManager:
    """
    Multi-layer cache management system
    Provides intelligent caching with automatic failover and metrics
    """
    
    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.redis_client: Optional[redis.Redis] = None
        
        # L1 Memory cache with LRU eviction
        self._l1_cache: Dict[str, Dict[str, Any]] = {}
        self._l1_access_order: List[str] = []
        
        # Metrics tracking
        self.metrics = CacheMetrics()
        
        # Performance tracking
        self._request_times: List[float] = []
        self._lock = asyncio.Lock()
        
    async def initialize(self) -> None:
        """Initialize Redis connection and validate configuration"""
        try:
            self.redis_client = redis.from_url(
                self.config.redis_url,
                decode_responses=False,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            # Test Redis connection
            await self.redis_client.ping()
            logger.info("Cache manager initialized with Redis backend")
            
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using memory-only cache.")
            self.redis_client = None
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        Get value from cache with multi-layer fallback
        
        Args:
            key: Cache key
            default: Default value if not found
            
        Returns:
            Cached value or default
        """
        start_time = time.time()
        
        try:
            # Generate prefixed key
            full_key = self._get_full_key(key)
            
            # L1: Memory cache check
            l1_result = await self._get_from_l1(full_key)
            if l1_result is not None:
                self.metrics.l1_hits += 1
                await self._update_metrics(start_time)
                logger.debug(f"L1 cache hit: {key}")
                return l1_result
            
            self.metrics.l1_misses += 1
            
            # L2: Redis cache check
            if self.redis_client:
                l2_result = await self._get_from_l2(full_key)
                if l2_result is not None:
                    # Store in L1 for faster access
                    await self._store_in_l1(full_key, l2_result)
                    self.metrics.l2_hits += 1
                    await self._update_metrics(start_time)
                    logger.debug(f"L2 cache hit: {key}")
                    return l2_result
            
            self.metrics.l2_misses += 1
            await self._update_metrics(start_time)
            
            return default
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            await self._update_metrics(start_time)
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[Union[timedelta, int]] = None,
        level: CacheLevel = CacheLevel.L2_REDIS
    ) -> bool:
        """
        Set value in cache with optional TTL
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live (defaults to config)
            level: Which cache level to store in
            
        Returns:
            Success boolean
        """
        try:
            full_key = self._get_full_key(key)
            
            # Always store in L1 for immediate access
            await self._store_in_l1(full_key, value, ttl)
            
            # Store in L2 Redis if enabled and requested
            if (level == CacheLevel.L2_REDIS and 
                self.redis_client and 
                await self._store_in_l2(full_key, value, ttl)):
                logger.debug(f"Stored in L2 cache: {key}")
                
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from all cache levels"""
        try:
            full_key = self._get_full_key(key)
            
            # Remove from L1
            if full_key in self._l1_cache:
                del self._l1_cache[full_key]
                if full_key in self._l1_access_order:
                    self._l1_access_order.remove(full_key)
            
            # Remove from L2 Redis
            if self.redis_client:
                await self.redis_client.delete(full_key)
                
            return True
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        deleted_count = 0
        
        try:
            full_pattern = self._get_full_key(pattern)
            
            # Delete from L1 (simple pattern matching)
            keys_to_delete = [
                k for k in self._l1_cache.keys() 
                if self._matches_pattern(k, full_pattern)
            ]
            
            for key in keys_to_delete:
                del self._l1_cache[key]
                if key in self._l1_access_order:
                    self._l1_access_order.remove(key)
                deleted_count += 1
            
            # Delete from L2 Redis using SCAN
            if self.redis_client:
                async for key in self.redis_client.scan_iter(match=full_pattern):
                    await self.redis_client.delete(key)
                    deleted_count += 1
                    
            logger.info(f"Deleted {deleted_count} keys matching pattern: {pattern}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return deleted_count
    
    async def clear(self) -> bool:
        """Clear all cache levels"""
        try:
            # Clear L1
            self._l1_cache.clear()
            self._l1_access_order.clear()
            
            # Clear L2 Redis (only our keys)
            if self.redis_client:
                pattern = f"{self.config.key_prefix}:*"
                async for key in self.redis_client.scan_iter(match=pattern):
                    await self.redis_client.delete(key)
                    
            logger.info("Cache cleared successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        redis_info = {}
        if self.redis_client:
            try:
                redis_info = await self.redis_client.info("memory")
            except Exception as e:
                logger.warning(f"Could not get Redis stats: {e}")
        
        return {
            "l1_cache_size": len(self._l1_cache),
            "l1_max_size": self.config.l1_max_size,
            "l1_hits": self.metrics.l1_hits,
            "l1_misses": self.metrics.l1_misses,
            "l1_hit_rate": (
                self.metrics.l1_hits / max(1, self.metrics.l1_hits + self.metrics.l1_misses)
            ),
            "l2_hits": self.metrics.l2_hits,
            "l2_misses": self.metrics.l2_misses,
            "l2_hit_rate": (
                self.metrics.l2_hits / max(1, self.metrics.l2_hits + self.metrics.l2_misses)
            ),
            "total_requests": self.metrics.total_requests,
            "average_response_time_ms": self.metrics.average_response_time_ms,
            "redis_memory_used": redis_info.get("used_memory", 0),
            "redis_connected": self.redis_client is not None,
        }
    
    # Private methods
    
    def _get_full_key(self, key: str) -> str:
        """Generate full cache key with prefix"""
        return f"{self.config.key_prefix}:{key}"
    
    async def _get_from_l1(self, key: str) -> Any:
        """Get from L1 memory cache"""
        async with self._lock:
            if key in self._l1_cache:
                cache_entry = self._l1_cache[key]
                
                # Check TTL
                if (cache_entry.get("expires_at") and 
                    time.time() > cache_entry["expires_at"]):
                    del self._l1_cache[key]
                    if key in self._l1_access_order:
                        self._l1_access_order.remove(key)
                    return None
                
                # Update access order
                if key in self._l1_access_order:
                    self._l1_access_order.remove(key)
                self._l1_access_order.append(key)
                
                return cache_entry["value"]
            
            return None
    
    async def _store_in_l1(self, key: str, value: Any, ttl: Optional[Union[timedelta, int]] = None) -> None:
        """Store in L1 memory cache with LRU eviction"""
        async with self._lock:
            # Calculate expiration
            expires_at = None
            if ttl is not None:
                # Allow ttl to be either timedelta or int/float seconds
                if isinstance(ttl, (int, float)):
                    expires_at = time.time() + float(ttl)
                else:
                    expires_at = time.time() + ttl.total_seconds()
            elif self.config.l1_ttl_seconds:
                expires_at = time.time() + self.config.l1_ttl_seconds
            
            # Check if we need to evict
            if len(self._l1_cache) >= self.config.l1_max_size:
                # Remove least recently used
                if self._l1_access_order:
                    lru_key = self._l1_access_order.pop(0)
                    if lru_key in self._l1_cache:
                        del self._l1_cache[lru_key]
                        self.metrics.eviction_count += 1
            
            # Store new value
            self._l1_cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "stored_at": time.time()
            }
            
            # Update access order
            if key in self._l1_access_order:
                self._l1_access_order.remove(key)
            self._l1_access_order.append(key)
    
    async def _get_from_l2(self, key: str) -> Any:
        """Get from L2 Redis cache"""
        try:
            data = await self.redis_client.get(key)
            if data:
                return pickle.loads(data)
        except Exception as e:
            logger.warning(f"L2 cache get error: {e}")
        
        return None
    
    async def _store_in_l2(self, key: str, value: Any, ttl: Optional[Union[timedelta, int]] = None) -> bool:
        """Store in L2 Redis cache"""
        try:
            serialized = pickle.dumps(value)
            
            if self.config.enable_compression and len(serialized) > 1024:
                import gzip
                serialized = gzip.compress(serialized)
                key = f"gz:{key}"
            
            # Compute ttl_seconds supporting timedelta or raw seconds (int/float)
            if ttl is None:
                ttl_seconds = self.config.l2_default_ttl_seconds
            else:
                if isinstance(ttl, (int, float)):
                    ttl_seconds = int(ttl)
                else:
                    ttl_seconds = int(ttl.total_seconds())
            
            await self.redis_client.setex(key, ttl_seconds, serialized)
            return True
            
        except Exception as e:
            logger.warning(f"L2 cache set error: {e}")
            return False
    
    def _matches_pattern(self, key: str, pattern: str) -> bool:
        """Simple pattern matching for cache keys"""
        # Convert glob-style pattern to simple matching
        import fnmatch
        return fnmatch.fnmatch(key, pattern)
    
    async def _update_metrics(self, start_time: float) -> None:
        """Update performance metrics"""
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        self._request_times.append(response_time)
        
        # Keep only last 1000 requests for average calculation
        if len(self._request_times) > 1000:
            self._request_times = self._request_times[-1000:]
        
        self.metrics.total_requests += 1
        self.metrics.average_response_time_ms = sum(self._request_times) / len(self._request_times)


# Cache decorator for easy usage
def cache_result(
    ttl: timedelta = timedelta(minutes=15),
    level: CacheLevel = CacheLevel.L2_REDIS
):
    """
    Decorator for caching function results
    
    Args:
        ttl: Time to live for cached result
        level: Cache level to use
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            from infrastructure.dependencies import get_cache_manager
            
            cache_manager = await get_cache_manager()
            
            # Generate cache key from function signature
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            
            cache_key = ":".join(key_parts)
            cache_key_hash = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Try cache first
            cached_result = await cache_manager.get(cache_key_hash)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key_hash, result, ttl, level)
            
            return result
        
        return wrapper
    return decorator


# Global cache manager instance (initialized during startup)
_cache_manager: Optional[CacheManager] = None


async def get_cache_manager() -> CacheManager:
    """Get global cache manager instance"""
    global _cache_manager
    
    if _cache_manager is None:
        _cache_manager = CacheManager()
        await _cache_manager.initialize()
    
    return _cache_manager


async def initialize_cache() -> CacheManager:
    """Initialize cache manager during application startup"""
    cache_manager = await get_cache_manager()
    logger.info("Cache manager initialized successfully")
    return cache_manager


async def cleanup_cache():
    """Cleanup cache manager during application shutdown"""
    global _cache_manager
    
    if _cache_manager and _cache_manager.redis_client:
        await _cache_manager.redis_client.aclose()
        logger.info("Cache manager cleaned up successfully")
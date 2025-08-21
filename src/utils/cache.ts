interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get all keys that match a pattern
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return keys;
    }
    
    const regex = new RegExp(pattern);
    return keys.filter(key => regex.test(key));
  }

  // Cache schools data specifically
  setSchools(schools: any[]): void {
    this.set('schools', schools, 10 * 60 * 1000); // 10 minutes for schools
  }

  getSchools(): any[] | null {
    return this.get('schools');
  }

  // Cache recent items for auto-complete
  setRecentItems(items: any[]): void {
    this.set('recent-items', items, 30 * 60 * 1000); // 30 minutes for recent items
  }

  getRecentItems(): any[] | null {
    return this.get('recent-items');
  }

  // Add item to recent items cache
  addRecentItem(item: any): void {
    const recentItems = this.getRecentItems() || [];
    
    // Remove if already exists to avoid duplicates
    const filtered = recentItems.filter(recent => 
      recent.name !== item.name || recent.brand !== item.brand
    );
    
    // Add to beginning and limit to 50 items
    const updated = [item, ...filtered].slice(0, 50);
    this.setRecentItems(updated);
  }
}

// Export singleton instance
export const dataCache = new DataCache();

// Local storage utilities for persistent cache
export const persistentCache = {
  set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`csdt-cache-${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  get<T>(key: string, maxAge = 24 * 60 * 60 * 1000): T | null {
    try {
      const item = localStorage.getItem(`csdt-cache-${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check if expired
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(`csdt-cache-${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },

  remove(key: string): void {
    localStorage.removeItem(`csdt-cache-${key}`);
  },

  clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith('csdt-cache-'))
      .forEach(key => localStorage.removeItem(key));
  }
};
// Cache en memoria con TTL

class CacheService {
  constructor(ttlSeconds = 300) { // 5 minutos default
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000; // convertir a ms
  }

  /**
   * Obtiene valor del cache o null si expiro/no existe
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Guarda valor en cache con TTL
   */
  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  /**
   * Elimina una entrada del cache
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas (no necesario, se limpian al acceder)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stats del cache (para debug)
   */
  stats() {
    let active = 0;
    const now = Date.now();
    for (const entry of this.cache.values()) {
      if (now <= entry.expires) active++;
    }
    return {
      total: this.cache.size,
      active,
      expired: this.cache.size - active
    };
  }
}

// Singleton
const cache = new CacheService(300); // 5 min

module.exports = cache;
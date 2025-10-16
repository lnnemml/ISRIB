// Для production використовуйте Vercel KV або Supabase
// Це тимчасове in-memory рішення

class UnsubscribeStore {
  constructor() {
    this.list = new Set();
  }

  add(email) {
    const normalized = email.trim().toLowerCase();
    this.list.add(normalized);
    console.log('[Unsubscribe Store] Added:', normalized, 'Total:', this.list.size);
    
    // TODO: Зберегти в persistent storage
    // await kv.set(`unsub:${normalized}`, true);
  }

  has(email) {
    const normalized = email.trim().toLowerCase();
    return this.list.has(normalized);
  }

  remove(email) {
    const normalized = email.trim().toLowerCase();
    return this.list.delete(normalized);
  }

  size() {
    return this.list.size;
  }
}

// Singleton instance
const store = new UnsubscribeStore();

export default store;

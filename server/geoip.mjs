export class GeoResolver {
  constructor() {
    this.cache = new Map();
  }

  async resolve(ip) {
    if (!ip) return { city: 'unknown', country: null };
    const cached = this.cache.get(ip);
    if (cached) return cached;
    const payload = { city: 'unknown', country: null };
    this.cache.set(ip, payload);
    return payload;
  }
}

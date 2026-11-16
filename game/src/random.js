// A small seeded generator (mulberry32) so a screenshot scene and a replayed run
// always play the same way from the same seed.

export function createRandom(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** A float in [min, max). */
    range(min, max) {
      return min + (max - min) * this.next();
    },
    /** An integer in [min, max). */
    int(min, max) {
      return Math.floor(this.range(min, max));
    },
    /** One element of a non-empty array. */
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}

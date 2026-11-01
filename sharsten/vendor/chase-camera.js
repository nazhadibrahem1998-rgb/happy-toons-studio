/**
 * Third-person camera damping.
 * The blend `current + (target - current) * factor` is the same step
 * three.js OrbitControls uses for spherical damping (MIT).
 * Copyright © 2010-2023 three.js authors.
 * https://github.com/mrdoob/three.js/blob/r160/examples/jsm/controls/OrbitControls.js
 * Licence text: notices/THREE-MIT.txt
 */
export function dampStep(current, target, factor) {
  return current + (target - current) * factor;
}

export function createChase() {
  const state = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, ready: false };
  return {
    snap(x, y, z, lx, ly, lz) {
      state.x = x;
      state.y = y;
      state.z = z;
      state.lx = lx;
      state.ly = ly;
      state.lz = lz;
      state.ready = true;
    },
    follow(x, y, z, lx, ly, lz, factor = 0.22) {
      if (!state.ready || Math.hypot(x - state.x, z - state.z) > 12) {
        this.snap(x, y, z, lx, ly, lz);
        return state;
      }
      state.x = dampStep(state.x, x, factor);
      state.y = dampStep(state.y, y, factor);
      state.z = dampStep(state.z, z, factor);
      state.lx = dampStep(state.lx, lx, factor);
      state.ly = dampStep(state.ly, ly, factor);
      state.lz = dampStep(state.lz, lz, factor);
      return state;
    },
  };
}

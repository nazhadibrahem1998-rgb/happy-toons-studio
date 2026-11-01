/**
 * A small wind bend for instanced grass tufts.
 * The sine offset on the local up-axis follows the instanced-grass
 * approach in the three.js examples (MIT).
 * Copyright © 2010-2023 three.js authors.
 * https://github.com/mrdoob/three.js/tree/r160/examples
 * Licence text: notices/THREE-MIT.txt
 */
export function grassWind(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float gust = sin(uTime + position.x * 6.0) * position.y;
       transformed.x += gust * 0.18;
       transformed.z += cos(uTime * 0.8) * position.y * 0.08;`,
    );
    material.userData.shader = shader;
  };
  return material;
}

export function setGrassTime(material, time) {
  const shader = material.userData && material.userData.shader;
  if (shader) shader.uniforms.uTime.value = time;
}

/**
 * One fullscreen pass for desktop High and Ultra:
 * a soft bloom, a vignette, and a light depth darkening on Ultra.
 */
import * as THREE from './three.module.min.js';

export function createGrade(renderer) {
  let rt = null;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uAo: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform sampler2D tDepth;',
      'uniform vec2 uRes;',
      'uniform float uAo;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec4 c = texture2D(tDiffuse, vUv);',
      '  vec2 px = 3.0 / uRes;',
      '  vec3 glow = vec3(0.0);',
      '  for (int i = 0; i < 8; i++) {',
      '    float a = float(i) * 0.785398;',
      '    vec3 s = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * px).rgb;',
      '    float l = dot(s, vec3(0.3, 0.59, 0.11));',
      '    glow += s * max(0.0, l - 0.9);',
      '  }',
      '  c.rgb += glow * 0.035;',
      '  if (uAo > 0.5) {',
      '    float d = texture2D(tDepth, vUv).r;',
      '    float occ = 0.0;',
      '    vec2 ap = 4.0 / uRes;',
      '    for (int i = 0; i < 8; i++) {',
      '      float a = float(i) * 0.785398;',
      '      float s = texture2D(tDepth, vUv + vec2(cos(a), sin(a)) * ap).r;',
      '      occ += clamp((d - s) * 18.0, 0.0, 1.0);',
      '    }',
      '    c.rgb *= 1.0 - occ * 0.045;',
      '  }',
      '  float vig = smoothstep(0.92, 0.32, length(vUv - 0.5));',
      '  c.rgb *= mix(0.82, 1.0, vig);',
      '  gl_FragColor = c;',
      '}',
    ].join('\n'),
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  function ensure(w, h) {
    const rw = Math.max(2, w | 0);
    const rh = Math.max(2, h | 0);
    if (rt && rt.width === rw && rt.height === rh) return;
    if (rt) rt.dispose();
    const depth = new THREE.DepthTexture(rw, rh);
    rt = new THREE.WebGLRenderTarget(rw, rh, { depthTexture: depth });
    if (THREE.SRGBColorSpace) rt.texture.colorSpace = THREE.SRGBColorSpace;
    mat.uniforms.tDiffuse.value = rt.texture;
    mat.uniforms.tDepth.value = depth;
    mat.uniforms.uRes.value.set(rw, rh);
  }
  return {
    render(scene3, cam, ao) {
      const size = new THREE.Vector2();
      renderer.getDrawingBufferSize(size);
      ensure(size.x, size.y);
      mat.uniforms.uAo.value = ao ? 1 : 0;
      renderer.setRenderTarget(rt);
      renderer.render(scene3, cam);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
  };
}

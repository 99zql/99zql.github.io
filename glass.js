/*
 * Single-canvas Liquid Glass renderer.
 * The wallpaper is uploaded once; rounded glass panels sample and refract it
 * in a fragment shader. DOM remains responsible for all text and controls.
 */
class GlassRenderer {
  constructor(canvas, imageUrl, onInvalidate = () => {}, pixelRatioLimit = 1.25) {
    this.canvas = canvas;
    this.imageUrl = imageUrl;
    this.onInvalidate = onInvalidate;
    this.pixelRatioLimit = pixelRatioLimit;
    this.gl = null;
    this.program = null;
    this.background = null;
    this.buffer = null;
    this.entries = new Set();
    this.ready = false;
    this.lost = false;
    this.dpr = 1;

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.ready = false;
      this.lost = true;
      document.documentElement.classList.add("webgl-lost");
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.init().then((ok) => {
        if (ok) {
          this.lost = false;
          document.documentElement.classList.remove("webgl-lost");
          this.onInvalidate();
        }
      });
    });
  }

  async init() {
    const gl = this.canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false
    });
    if (!gl) return false;
    this.gl = gl;

    const vertex = `
      attribute vec2 a_pos;
      uniform vec4 u_rect;
      uniform vec2 u_view;
      varying vec2 v_local;
      varying vec2 v_screen;
      void main() {
        v_local = a_pos * u_rect.zw;
        v_screen = u_rect.xy + v_local;
        vec2 clip = vec2(v_screen.x / u_view.x * 2.0 - 1.0, 1.0 - v_screen.y / u_view.y * 2.0);
        gl_Position = vec4(clip, 0.0, 1.0);
      }
    `;
    const fragment = `
      precision mediump float;
      uniform sampler2D u_background;
      uniform sampler2D u_mask;
      uniform sampler2D u_normalMask;
      uniform vec2 u_view;
      uniform vec2 u_maskTexel;
      uniform vec4 u_bgRect;
      uniform vec2 u_size;
      uniform vec4 u_glass;
      uniform vec4 u_tint;
      uniform float u_pass;
      uniform float u_masked;
      varying vec2 v_local;
      varying vec2 v_screen;

      vec2 bgUv(vec2 p) {
        return vec2((p.x - u_bgRect.x) / u_bgRect.z, 1.0 - (p.y - u_bgRect.y) / u_bgRect.w);
      }
      float roundedBox(vec2 p, vec2 size, float radius) {
        vec2 q = abs(p - size * 0.5) - (size * 0.5 - vec2(radius));
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
      }
      void main() {
        vec2 uv = bgUv(v_screen);
        if (u_pass < 0.5) {
          vec3 color = texture2D(u_background, uv).rgb * 0.76;
          gl_FragColor = vec4(color, 1.0);
          return;
        }

        float sdf = roundedBox(v_local, u_size, u_glass.z);
        float aa = max(0.65, 1.0 / max(u_glass.w, 1.0));
        float shape = 1.0 - smoothstep(-aa, aa, sdf);
        vec2 normal = vec2(0.0);
        float bend = pow(clamp(1.0 - max(0.0, -sdf) / max(u_glass.x, 1.0), 0.0, 1.0), 2.2);
        float maskEdge = 0.0;
        if (shape <= 0.001) discard;
        if (u_masked > 0.5) {
          vec2 maskUv = vec2(v_local.x / u_size.x, 1.0 - v_local.y / u_size.y);
          float glyph = texture2D(u_mask, maskUv).a;
          shape *= glyph;
          if (shape <= 0.01) discard;
          float h = texture2D(u_normalMask, maskUv).a;
          vec2 grad = vec2(
            texture2D(u_normalMask, maskUv + vec2(u_maskTexel.x, 0.0)).a - texture2D(u_normalMask, maskUv - vec2(u_maskTexel.x, 0.0)).a,
            texture2D(u_normalMask, maskUv - vec2(0.0, u_maskTexel.y)).a - texture2D(u_normalMask, maskUv + vec2(0.0, u_maskTexel.y)).a
          );
          normal = normalize(grad + vec2(0.00001));
          maskEdge = clamp(length(grad) * 6.0, 0.0, 1.0);
          bend = pow(clamp((1.0 - h) * 2.1, 0.0, 1.0), 1.4);
        }

        vec2 halfSize = u_size * 0.5;
        vec2 q = abs(v_local - halfSize) - (halfSize - vec2(u_glass.z));
        vec2 outside = max(q, 0.0);
        vec2 grad;
        float outsideLen = length(outside);
        if (outsideLen > 0.001) {
          grad = sign(v_local - halfSize) * outside / outsideLen;
        } else if (q.x > q.y) {
          grad = vec2(sign(v_local.x - halfSize.x), 0.0);
        } else {
          grad = vec2(0.0, sign(v_local.y - halfSize.y));
        }

        float edgeDistance = max(0.0, -sdf);
        float edge = 1.0 - smoothstep(0.0, max(u_glass.x, 1.0), edgeDistance);
        if (u_masked > 0.5) edge = maskEdge;
        if (u_masked < 0.5) normal = grad;
        vec2 offset = normal * bend * u_glass.y * 0.5 / u_view;
        vec3 color = texture2D(u_background, bgUv(v_screen + offset)).rgb * 0.76;
        if (bend > 0.005) {
          color.g = texture2D(u_background, bgUv(v_screen + offset * 0.92)).g * 0.76;
          color.b = texture2D(u_background, bgUv(v_screen + offset * 0.84)).b * 0.76;
        }
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = clamp(mix(vec3(luminance), color, 1.5) * 1.10, 0.0, 1.0);
        color = mix(color, u_tint.rgb, u_tint.a);

        float fresnel = pow(clamp(1.0 - abs(dot(normal, normalize(vec2(0.7, -0.7)))), 0.0, 1.0), 2.0);
        color += vec3(0.24, 0.28, 0.34) * edge * 0.20;
        color += vec3(1.0) * fresnel * edge * 0.12;
        gl_FragColor = vec4(color, shape);
      }
    `;

    const shader = (type, source) => {
      const result = gl.createShader(type);
      gl.shaderSource(result, source);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        console.warn("Liquid Glass shader unavailable:", gl.getShaderInfoLog(result));
        gl.deleteShader(result);
        return null;
      }
      return result;
    };
    const vs = shader(gl.VERTEX_SHADER, vertex);
    const fs = shader(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return false;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Liquid Glass program unavailable:", gl.getProgramInfoLog(program));
      return false;
    }
    this.program = program;
    gl.useProgram(program);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1
    ]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const image = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = this.imageUrl;
    });
    if (!image) return false;
    this.imageSize = { width: image.naturalWidth, height: image.naturalHeight };
    this.background = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.background);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, "u_background"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_mask"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "u_normalMask"), 2);
    this.uniforms = {};
    ["u_rect", "u_view", "u_bgRect", "u_size", "u_glass", "u_tint", "u_pass", "u_masked", "u_maskTexel"].forEach((key) => {
      this.uniforms[key] = gl.getUniformLocation(program, key);
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    this.ready = true;
    this.resize();
    for (const entry of this.entries) this.uploadMask(entry);
    return true;
  }

  uploadMask(entry) {
    const gl = this.gl;
    if (!entry.mask || !gl || gl.isContextLost()) return;
    entry.maskWidth = entry.mask.width;
    entry.maskHeight = entry.mask.height;
    if (!entry.normalCanvas) {
      entry.normalCanvas = document.createElement("canvas");
      entry.normalCanvas.width = entry.maskWidth;
      entry.normalCanvas.height = entry.maskHeight;
      const ctx = entry.normalCanvas.getContext("2d");
      ctx.filter = `blur(${4.5 * Math.min(devicePixelRatio || 1, this.pixelRatioLimit)}px)`;
      ctx.drawImage(entry.mask, 0, 0);
    }
    entry.maskTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, entry.maskTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, entry.mask);
    entry.normalTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, entry.normalTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, entry.normalCanvas);
  }

  add(pane, width, height, radius, bezel, options = {}) {
    const gl = this.gl;
    const entry = {
      pane, width, height, radius, bezel,
      strength: options.strength || bezel * 2.2,
      tint: this.parseColor(options.tint || (options.mask ? "rgba(255,255,255,0)" : "rgba(255,255,255,.07)")),
      mask: options.mask || null,
      maskTexture: null,
      normalTexture: null,
      normalCanvas: null,
      maskWidth: 1,
      maskHeight: 1,
      x: 0, y: 0, visible: true
    };
    if (entry.mask && gl) this.uploadMask(entry);
    this.entries.add(entry);
    pane._glassEntry = entry;
    this.onInvalidate();
    return entry;
  }

  remove(pane) {
    const entry = pane && pane._glassEntry;
    if (!entry) return;
    if (entry.maskTexture && this.gl) this.gl.deleteTexture(entry.maskTexture);
    if (entry.normalTexture && this.gl) this.gl.deleteTexture(entry.normalTexture);
    this.entries.delete(entry);
    delete pane._glassEntry;
    this.onInvalidate();
  }

  parseColor(value) {
    const parts = String(value).match(/[\d.]+/g) || [];
    if (String(value).startsWith("#")) {
      const hex = value.slice(1);
      const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
      return [parseInt(full.slice(0, 2), 16) / 255, parseInt(full.slice(2, 4), 16) / 255, parseInt(full.slice(4, 6), 16) / 255, 1];
    }
    const scale = parts.slice(0, 3).some((v) => +v > 1) ? 255 : 1;
    return [0, 1, 2].map((i) => +(parts[i] || 255) / scale).concat(+(parts[3] || 0)).map((v, i) => i === 3 ? v : Math.min(1, v));
  }

  resize() {
    if (!this.gl) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.pixelRatioLimit);
    const width = Math.max(1, Math.round(innerWidth * this.dpr));
    const height = Math.max(1, Math.round(innerHeight * this.dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  }

  draw() {
    if (!this.ready || !this.gl || this.gl.isContextLost()) return;
    const gl = this.gl, u = this.uniforms;
    this.resize();
    const width = innerWidth, height = innerHeight;
    const scale = Math.max(width / this.imageSize.width, height / this.imageSize.height);
    const drawWidth = this.imageSize.width * scale, drawHeight = this.imageSize.height * scale;
    const bgRect = [(width - drawWidth) * 0.5, (height - drawHeight) * 0.5, drawWidth, drawHeight];
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.background);
    gl.uniform2f(u.u_view, width, height);
    gl.uniform4f(u.u_bgRect, ...bgRect);
    gl.uniform4f(u.u_rect, 0, 0, width, height);
    gl.uniform1f(u.u_pass, 0);
    gl.uniform1f(u.u_masked, 0);
    gl.uniform2f(u.u_size, width, height);
    gl.uniform4f(u.u_glass, 1, 0, 0, this.dpr);
    gl.uniform4f(u.u_tint, 0, 0, 0, 0);
    gl.uniform2f(u.u_maskTexel, 1, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const entries = [...this.entries].filter((entry) => entry.visible && entry.pane.isConnected && entry.width > 0 && entry.height > 0);
    const layer = (pane) => {
      for (let node = pane; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.position !== "static" && style.zIndex !== "auto") return Number(style.zIndex) || 0;
      }
      return 0;
    };
    entries.sort((a, b) => {
      const z = layer(a.pane) - layer(b.pane);
      if (z) return z;
      const order = a.pane.compareDocumentPosition(b.pane);
      return order & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : order & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
    });
    gl.uniform1f(u.u_pass, 1);
    for (const entry of entries) {
      gl.uniform4f(u.u_rect, entry.x, entry.y, entry.width, entry.height);
      gl.uniform2f(u.u_size, entry.width, entry.height);
      gl.uniform4f(u.u_glass, entry.bezel, entry.strength, entry.radius, this.dpr);
      gl.uniform4f(u.u_tint, ...entry.tint);
      gl.uniform1f(u.u_masked, entry.maskTexture ? 1 : 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, entry.maskTexture);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, entry.normalTexture);
      gl.uniform2f(u.u_maskTexel, 1 / entry.maskWidth, 1 / entry.maskHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }
}

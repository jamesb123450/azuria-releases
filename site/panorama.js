// Display a real Minecraft cubemap as one continuous, static wide view.
// No motion, generated scenery, tracking or remote requests are involved.
export async function mountPanorama(canvas) {
  if (navigator.connection?.saveData) return;
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) return;
  let program, buffer, texture;
  const dispose = () => {
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    canvas.classList.remove("is-ready");
  };
  try {
    const images = await Promise.all(
      Array.from(
        { length: 6 },
        (_, i) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = `${canvas.dataset.panoramaBase}${i}.webp`;
          }),
      ),
    );
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error("Panorama shader unavailable");
      }
      return shader;
    };
    const vertex = compile(
      gl.VERTEX_SHADER,
      "attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,0.,1.);}",
    );
    const fragment = compile(
      gl.FRAGMENT_SHADER,
      "precision mediump float; varying vec2 uv; uniform samplerCube scene; uniform float aspect; void main(){float fov=1.05;vec3 ray=normalize(vec3(uv.x*fov,uv.y*fov/aspect-0.08,1.));gl_FragColor=textureCube(scene,ray);}",
    );
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Panorama linking unavailable");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    // Minecraft face order: front, right, back, left, up, down.
    const targets = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    ];
    images.forEach((image, index) =>
      gl.texImage2D(
        targets[index],
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      ),
    );
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "scene"), 0);
    const aspect = gl.getUniformLocation(program, "aspect");
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height || gl.isContextLost()) return;
      const scale = Math.min(
        window.devicePixelRatio || 1,
        1.5,
        2560 / bounds.width,
      );
      canvas.width = Math.max(1, Math.round(bounds.width * scale));
      canvas.height = Math.max(1, Math.round(bounds.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(aspect, bounds.width / bounds.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (gl.getError() === gl.NO_ERROR) canvas.classList.add("is-ready");
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    canvas.addEventListener(
      "webglcontextlost",
      () => {
        observer.disconnect();
        dispose();
      },
      { once: true },
    );
  } catch {
    dispose();
  } // The credited CSS screenshot remains visible on any failure.
}

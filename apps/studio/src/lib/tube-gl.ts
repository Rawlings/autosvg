// A small WebGL2 renderer for the tube data of `tube3d.ts`: instanced cylinders and spheres, lit like a real object
// (key light, sky reflection, fresnel), a soft shadow on a floor, and the vector-to-vector morph done in the vertex shader.
// Nothing here is kept between frames except the buffers: `draw` is a pure function of the numbers it is given.
import { CYLINDER_FLOATS, SPHERE_FLOATS, type TubeData } from './tube3d.ts'

export type Colour = readonly [number, number, number]

/** How the tube looks: a colour and how much of a metal it is (0 glossy plastic, 1 polished metal). */
export interface Look {
  color: Colour
  metal: number
}

/** Everything a picture of the vector depends on. */
export interface Frame {
  /** The morph, 0 for the first vector and 1 for the second. */
  t: number
  /** Turn about the vertical axis and tilt about the horizontal one, in radians. */
  yaw: number
  pitch: number
  /** The stroke width on the 24 grid (1.5 is the set's own): the tubes are this much thicker or thinner. */
  stroke: number
  look: Look
}

const SIDES = 14
const RINGS = 10
const SHADOW_SIZE = 256
/** Half the width of the floor, which is also the extent of the shadow picture. */
const EXTENT = 2.4
const FLOOR = -1.3
/** Half the width of the stroke on the 24 grid (0.75) in world units (12 per half grid), a little fuller for a solid tube. */
const RADIUS = 0.072
const LIGHT: readonly [number, number, number] = normalise([-0.45, 0.8, 0.55])
const DISTANCE = 5.4
const TILT = 0.17
const FOV = (28 * Math.PI) / 180

function normalise(v: readonly [number, number, number]): [number, number, number] {
  const length = Math.hypot(v[0], v[1], v[2])
  return [v[0] / length, v[1] / length, v[2] / length]
}

const VERTEX_COMMON = `
uniform float uT, uRadius, uFloor, uExt;
uniform mat3 uRot;
uniform mat4 uVP;
uniform vec3 uLight;
out vec3 vN;
out vec3 vP;
void emit(vec3 local, vec3 n) {
  vec3 p = uRot * local;
  vN = uRot * n;
  vP = p;
#ifdef SHADOW
  vec3 q = p - uLight * ((p.y - uFloor) / uLight.y);
  gl_Position = vec4(q.x / uExt, q.z / uExt, 0.0, 1.0);
#else
  gl_Position = uVP * vec4(p, 1.0);
#endif
}`

const CYLINDER_BODY = `
in vec2 aBase;
in vec3 iA0, iB0, iA1, iB1;
in vec2 iR;
void main() {
  vec3 a = mix(iA0, iA1, uT);
  vec3 b = mix(iB0, iB1, uT);
  float r = uRadius * mix(iR.x, iR.y, uT);
  vec3 axis = b - a;
  float len = length(axis);
  vec3 d = len > 1e-5 ? axis / len : vec3(0.0, 1.0, 0.0);
  vec3 helper = abs(d.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 u = normalize(cross(d, helper));
  vec3 v = cross(d, u);
  vec3 n = cos(aBase.x) * u + sin(aBase.x) * v;
  emit(mix(a, b, aBase.y) + n * r, n);
}`

const SPHERE_BODY = `
in vec3 aN;
in vec3 iP0, iP1;
in vec2 iR;
void main() {
  vec3 p = mix(iP0, iP1, uT);
  float r = uRadius * mix(iR.x, iR.y, uT);
  emit(p + aN * r, aN);
}`

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 uColor, uLight, uCam;
uniform float uMetal;
in vec3 vN;
in vec3 vP;
out vec4 o;
vec3 env(vec3 r) {
  vec3 sky = mix(vec3(0.09, 0.08, 0.08), vec3(0.62, 0.72, 0.92), smoothstep(-0.25, 0.9, r.y));
  float horizon = exp(-pow((r.y - 0.02) * 6.0, 2.0));
  sky += vec3(0.5, 0.45, 0.4) * horizon * 0.55;
  float box = smoothstep(0.84, 0.95, dot(r, uLight));
  float fill = smoothstep(0.86, 0.96, dot(r, normalize(vec3(0.75, 0.25, 0.45)))) * 0.5;
  return sky + vec3(1.0, 0.97, 0.92) * box * 2.2 + vec3(0.8, 0.9, 1.0) * fill;
}
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(uCam - vP);
  float nv = max(dot(n, v), 0.0);
  float diff = max(dot(n, uLight), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  vec3 h = normalize(uLight + v);
  vec3 f0 = mix(vec3(0.04), uColor, uMetal);
  vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - nv, 5.0);
  vec3 diffuse = uColor * (1.0 - uMetal) * (0.16 + 0.24 * hemi + 0.85 * diff);
  vec3 shape = uColor * uMetal * 0.1 * (hemi + diff);
  vec3 reflection = fresnel * env(reflect(-v, n)) * mix(0.5, 1.0, uMetal);
  vec3 glint = vec3(pow(max(dot(n, h), 0.0), 140.0)) * diff * 0.9;
  vec3 c = diffuse + shape + reflection + glint;
  c = c / (1.0 + c * 0.3);
  o = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`

const SHADOW_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vP;
out vec4 o;
void main() { o = vec4(1.0); }`

const FLOOR_VERTEX = `#version 300 es
precision highp float;
in vec2 aPos;
uniform mat4 uVP;
uniform float uFloor, uExt;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = uVP * vec4(aPos.x * uExt, uFloor, aPos.y * uExt, 1.0);
}`

const FLOOR_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uShadow;
in vec2 vUv;
out vec4 o;
void main() {
  // a golden-angle spiral of taps: even, with no visible pattern
  float s = 0.0;
  for (int i = 0; i < 32; i++) {
    float k = float(i) + 0.5;
    float a = k * 2.399963;
    s += texture(uShadow, vUv + vec2(cos(a), sin(a)) * sqrt(k / 32.0) * 0.034).r;
  }
  s = s / 32.0;
  float edge = 1.0 - smoothstep(0.55, 1.0, length(vUv * 2.0 - 1.0));
  o = vec4(0.0, 0.0, 0.0, s * 0.5 * edge);
}`

function must<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`WebGL: could not make ${what}`)
  return value
}

interface Program {
  program: WebGLProgram
  attribute: (name: string) => number
  uniform: (name: string) => WebGLUniformLocation | null
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = must(gl.createShader(type), 'a shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`WebGL shader: ${gl.getShaderInfoLog(shader)}`)
  return shader
}

function link(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program {
  const program = must(gl.createProgram(), 'a program')
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`WebGL program: ${gl.getProgramInfoLog(program)}`)
  const uniforms = new Map<string, WebGLUniformLocation | null>()
  return {
    program,
    attribute: (name) => gl.getAttribLocation(program, name),
    uniform: (name) => {
      if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name))
      return uniforms.get(name) ?? null
    },
  }
}

const vertexSource = (body: string, shadow: boolean) =>
  `#version 300 es\nprecision highp float;\n${shadow ? '#define SHADOW\n' : ''}${VERTEX_COMMON}${body}`

type Mat3 = readonly number[]

/** Column-major 3x3 product `a * b`. */
function mul3(a: Mat3, b: Mat3): number[] {
  const out: number[] = []
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      let sum = 0
      for (let k = 0; k < 3; k++) sum += (a[k * 3 + row] ?? 0) * (b[col * 3 + k] ?? 0)
      out.push(sum)
    }
  }
  return out
}

/** Turn about the vertical axis by `yaw`, then tilt about the horizontal one by `pitch`. */
function rotation(yaw: number, pitch: number): Float32Array {
  const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)]
  const ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy]
  const rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp]
  return new Float32Array(mul3(rx, ry))
}

/** Perspective times a camera that sits above the object and looks at it. */
function viewProjection(aspect: number): { vp: Float32Array; camera: [number, number, number] } {
  const f = 1 / Math.tan(FOV / 2)
  const near = 0.5
  const far = 20
  const proj = [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]
  const [c, s] = [Math.cos(TILT), Math.sin(TILT)]
  // view = translate(0, 0, -distance) * rotateX(tilt), column-major
  const view = [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, -DISTANCE, 1]
  const vp: number[] = []
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += (proj[k * 4 + row] ?? 0) * (view[col * 4 + k] ?? 0)
      vp.push(sum)
    }
  }
  return { vp: new Float32Array(vp), camera: [0, DISTANCE * Math.sin(TILT), DISTANCE * Math.cos(TILT)] }
}

function buffer(gl: WebGL2RenderingContext, target: number, data: ArrayBufferView): WebGLBuffer {
  const b = must(gl.createBuffer(), 'a buffer')
  gl.bindBuffer(target, b)
  gl.bufferData(target, data, gl.STATIC_DRAW)
  return b
}

/** One instanced shape: its vertex array, its index count and how many copies to draw. */
interface Batch {
  vao: WebGLVertexArrayObject
  indices: number
  count: number
}

export class TubeGL {
  readonly #gl: WebGL2RenderingContext
  readonly #canvas: HTMLCanvasElement
  readonly #cylinder: Program
  readonly #sphere: Program
  readonly #cylinderShadow: Program
  readonly #sphereShadow: Program
  readonly #floor: Program
  readonly #cylinderBase: { vertices: WebGLBuffer; indices: WebGLBuffer; count: number }
  readonly #sphereBase: { vertices: WebGLBuffer; indices: WebGLBuffer; count: number }
  readonly #floorVao: WebGLVertexArrayObject
  readonly #shadowTexture: WebGLTexture
  readonly #shadowBuffer: WebGLFramebuffer
  #cylinders: { main: Batch; shadow: Batch } | undefined
  #spheres: { main: Batch; shadow: Batch } | undefined
  #instances: WebGLBuffer[] = []

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.#canvas = canvas
    this.#gl = gl
    this.#cylinder = link(gl, vertexSource(CYLINDER_BODY, false), FRAGMENT)
    this.#sphere = link(gl, vertexSource(SPHERE_BODY, false), FRAGMENT)
    this.#cylinderShadow = link(gl, vertexSource(CYLINDER_BODY, true), SHADOW_FRAGMENT)
    this.#sphereShadow = link(gl, vertexSource(SPHERE_BODY, true), SHADOW_FRAGMENT)
    this.#floor = link(gl, FLOOR_VERTEX, FLOOR_FRAGMENT)

    // the cylinder: a ring of SIDES at each end, as (angle, end)
    const ring: number[] = []
    const ringIndices: number[] = []
    for (let i = 0; i < SIDES; i++) {
      const angle = (i / SIDES) * Math.PI * 2
      ring.push(angle, 0, angle, 1)
      const [a, b, c, d] = [2 * i, 2 * i + 1, 2 * ((i + 1) % SIDES), 2 * ((i + 1) % SIDES) + 1]
      ringIndices.push(a, b, c, b, d, c)
    }
    this.#cylinderBase = {
      vertices: buffer(gl, gl.ARRAY_BUFFER, new Float32Array(ring)),
      indices: buffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ringIndices)),
      count: ringIndices.length,
    }

    // the sphere: a unit sphere in latitude rings
    const ball: number[] = []
    const ballIndices: number[] = []
    for (let i = 0; i <= RINGS; i++) {
      const lat = (i / RINGS) * Math.PI
      for (let j = 0; j < SIDES; j++) {
        const lon = (j / SIDES) * Math.PI * 2
        ball.push(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon))
      }
    }
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SIDES; j++) {
        const [a, b] = [i * SIDES + j, i * SIDES + ((j + 1) % SIDES)]
        const [c, d] = [a + SIDES, b + SIDES]
        ballIndices.push(a, c, b, b, c, d)
      }
    }
    this.#sphereBase = {
      vertices: buffer(gl, gl.ARRAY_BUFFER, new Float32Array(ball)),
      indices: buffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ballIndices)),
      count: ballIndices.length,
    }

    // the floor: one square
    this.#floorVao = must(gl.createVertexArray(), 'a vertex array')
    gl.bindVertexArray(this.#floorVao)
    buffer(gl, gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]))
    const aPos = this.#floor.attribute('aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    // the shadow, drawn from above into a small texture
    this.#shadowTexture = must(gl.createTexture(), 'a texture')
    gl.bindTexture(gl.TEXTURE_2D, this.#shadowTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SHADOW_SIZE, SHADOW_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.#shadowBuffer = must(gl.createFramebuffer(), 'a framebuffer')
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#shadowBuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#shadowTexture, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  /** A renderer for `canvas`, or nothing when the browser has no WebGL2. */
  static create(canvas: HTMLCanvasElement): TubeGL | undefined {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true })
    return gl ? new TubeGL(canvas, gl) : undefined
  }

  /** One batch of instances: the shared shape plus the per-instance numbers, with the attributes of `program` bound. */
  #batch(
    program: Program,
    base: { vertices: WebGLBuffer; indices: WebGLBuffer; count: number },
    baseAttribute: { name: string; size: number },
    instances: WebGLBuffer,
    layout: readonly { name: string; size: number; offset: number }[],
    stride: number,
    count: number,
  ): Batch {
    const gl = this.#gl
    const vao = must(gl.createVertexArray(), 'a vertex array')
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, base.vertices)
    const at = program.attribute(baseAttribute.name)
    if (at >= 0) {
      gl.enableVertexAttribArray(at)
      gl.vertexAttribPointer(at, baseAttribute.size, gl.FLOAT, false, 0, 0)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instances)
    for (const { name, size, offset } of layout) {
      const location = program.attribute(name)
      if (location < 0) continue
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride * 4, offset * 4)
      gl.vertexAttribDivisor(location, 1)
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, base.indices)
    gl.bindVertexArray(null)
    return { vao, indices: base.count, count }
  }

  /** Replace the geometry (for a new vector, a new pair of vectors, or a pose that moves every frame). */
  setTubes(data: TubeData): void {
    const gl = this.#gl
    const [cylinderStore, sphereStore] = this.#instances
    if (this.#cylinders && this.#spheres && cylinderStore && sphereStore) {
      // the same buffers and vertex arrays, refilled: cheap enough to do every frame
      gl.bindBuffer(gl.ARRAY_BUFFER, cylinderStore)
      gl.bufferData(gl.ARRAY_BUFFER, data.cylinders, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereStore)
      gl.bufferData(gl.ARRAY_BUFFER, data.spheres, gl.DYNAMIC_DRAW)
      this.#cylinders.main.count = this.#cylinders.shadow.count = data.cylinders.length / CYLINDER_FLOATS
      this.#spheres.main.count = this.#spheres.shadow.count = data.spheres.length / SPHERE_FLOATS
      return
    }
    for (const old of this.#instances) gl.deleteBuffer(old)
    this.#instances = []
    const cylinderBuffer = buffer(gl, gl.ARRAY_BUFFER, data.cylinders)
    const sphereBuffer = buffer(gl, gl.ARRAY_BUFFER, data.spheres)
    this.#instances.push(cylinderBuffer, sphereBuffer)
    const cylinderLayout = [
      { name: 'iA0', size: 3, offset: 0 },
      { name: 'iB0', size: 3, offset: 3 },
      { name: 'iA1', size: 3, offset: 6 },
      { name: 'iB1', size: 3, offset: 9 },
      { name: 'iR', size: 2, offset: 12 },
    ]
    const sphereLayout = [
      { name: 'iP0', size: 3, offset: 0 },
      { name: 'iP1', size: 3, offset: 3 },
      { name: 'iR', size: 2, offset: 6 },
    ]
    const cylinderCount = data.cylinders.length / CYLINDER_FLOATS
    const sphereCount = data.spheres.length / SPHERE_FLOATS
    const base = { name: 'aBase', size: 2 }
    const ball = { name: 'aN', size: 3 }
    this.#cylinders = {
      main: this.#batch(
        this.#cylinder,
        this.#cylinderBase,
        base,
        cylinderBuffer,
        cylinderLayout,
        CYLINDER_FLOATS,
        cylinderCount,
      ),
      shadow: this.#batch(
        this.#cylinderShadow,
        this.#cylinderBase,
        base,
        cylinderBuffer,
        cylinderLayout,
        CYLINDER_FLOATS,
        cylinderCount,
      ),
    }
    this.#spheres = {
      main: this.#batch(this.#sphere, this.#sphereBase, ball, sphereBuffer, sphereLayout, SPHERE_FLOATS, sphereCount),
      shadow: this.#batch(
        this.#sphereShadow,
        this.#sphereBase,
        ball,
        sphereBuffer,
        sphereLayout,
        SPHERE_FLOATS,
        sphereCount,
      ),
    }
  }

  /** Match the canvas to its size on screen (at most 2x), returning false when there is nothing to draw into. */
  resize(): boolean {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.round(this.#canvas.clientWidth * ratio)
    const height = Math.round(this.#canvas.clientHeight * ratio)
    if (width === 0 || height === 0) return false
    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width
      this.#canvas.height = height
    }
    return true
  }

  #setShared(program: Program, frame: Frame, vp: Float32Array): void {
    const gl = this.#gl
    gl.useProgram(program.program)
    gl.uniform1f(program.uniform('uT'), frame.t)
    gl.uniform1f(program.uniform('uRadius'), (RADIUS * frame.stroke) / 1.5)
    gl.uniform1f(program.uniform('uFloor'), FLOOR)
    gl.uniform1f(program.uniform('uExt'), EXTENT)
    gl.uniformMatrix3fv(program.uniform('uRot'), false, rotation(frame.yaw, frame.pitch))
    gl.uniformMatrix4fv(program.uniform('uVP'), false, vp)
    gl.uniform3f(program.uniform('uLight'), ...LIGHT)
  }

  #drawBatch(batch: Batch): void {
    const gl = this.#gl
    if (batch.count === 0) return
    gl.bindVertexArray(batch.vao)
    gl.drawElementsInstanced(gl.TRIANGLES, batch.indices, gl.UNSIGNED_SHORT, 0, batch.count)
  }

  draw(frame: Frame): void {
    const cylinders = this.#cylinders
    const spheres = this.#spheres
    if (cylinders && spheres && this.resize()) this.#render(frame, cylinders, spheres)
  }

  #render(frame: Frame, cylinders: { main: Batch; shadow: Batch }, spheres: { main: Batch; shadow: Batch }): void {
    const gl = this.#gl
    const { vp, camera } = viewProjection(this.#canvas.width / this.#canvas.height)

    // 1. the shadow: the shape squashed onto the floor along the light, seen from above
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#shadowBuffer)
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
    gl.disable(gl.CULL_FACE)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.#setShared(this.#cylinderShadow, frame, vp)
    this.#drawBatch(cylinders.shadow)
    this.#setShared(this.#sphereShadow, frame, vp)
    this.#drawBatch(spheres.shadow)

    // 2. the picture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.#canvas.width, this.#canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    gl.useProgram(this.#floor.program)
    gl.uniformMatrix4fv(this.#floor.uniform('uVP'), false, vp)
    gl.uniform1f(this.#floor.uniform('uFloor'), FLOOR)
    gl.uniform1f(this.#floor.uniform('uExt'), EXTENT)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.#shadowTexture)
    gl.uniform1i(this.#floor.uniform('uShadow'), 0)
    gl.depthMask(false)
    gl.bindVertexArray(this.#floorVao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.depthMask(true)
    gl.disable(gl.BLEND)

    for (const [program, batch] of [
      [this.#cylinder, cylinders.main],
      [this.#sphere, spheres.main],
    ] as const) {
      this.#setShared(program, frame, vp)
      gl.uniform3f(program.uniform('uColor'), ...frame.look.color)
      gl.uniform1f(program.uniform('uMetal'), frame.look.metal)
      gl.uniform3f(program.uniform('uCam'), ...camera)
      this.#drawBatch(batch)
    }
    gl.bindVertexArray(null)
  }

  /** Free the buffers. The context itself is left alone: a canvas whose context was lost cannot be given a new one. */
  dispose(): void {
    for (const old of this.#instances) this.#gl.deleteBuffer(old)
    this.#instances = []
    this.#cylinders = undefined
    this.#spheres = undefined
  }
}

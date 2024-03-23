import {
  Scene,
  PerspectiveCamera,
  AxesHelper,
  WebGLRenderer,
  BufferGeometry,
  Vector3,
  ShaderMaterial,
  Color,
  Points,
  BufferAttribute,
  CanvasTexture,
  PointsMaterial,
  Vector4,
  LineBasicMaterial,
  Line,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
const arrowVector = new Vector3(5, 5, 0);

let renderer, scene, camera, controls;
let width = window.innerWidth;
let height = window.innerHeight;
let aspect = width / height;
let lookAtTarget = cp();

function init() {
  width = window.innerWidth;
  height = window.innerHeight;
  const container = document.getElementById('app');
  scene = new Scene();
  window.Vector3 = Vector3;
  window.Vector4 = Vector4;
  window.camera = camera = new PerspectiveCamera(45, aspect, 1, 10000);
  camera.position.set(0, 0, 30);
  camera.lookAt(scene.position);
  const points = createPoint();

  const line = createLine();

  const helper = new AxesHelper(5);
  scene.add(helper, points, line, lookAtTarget);
  renderer = new WebGLRenderer();
  renderer.setSize(width, height);
  controls = new OrbitControls(camera, container);
  container.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);

  bindTransformControls(lookAtTarget);
}
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
function onWindowResize() {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
init();
animate();
function cp() {
  const sourceVector = new Vector3(0, 0, 0);

  const geometry = new BufferGeometry().setFromPoints([new Vector3()]);
  const material = new PointsMaterial({
    size: 0.5,
    color: 0xff0000,
  });

  const p = new Points(geometry, material);
  p.position.copy(sourceVector);
  return p;
}
function createPoint() {
  const sourceVector = lookAtTarget.position.clone();

  const geometry = new BufferGeometry().setFromPoints([arrowVector]);
  geometry.setAttribute(
    'a_direction',
    new BufferAttribute(new Float32Array(sourceVector.toArray()), 3)
  );
  const material = new createMaterial();
  const points = new Points(geometry, material);

  points.onBeforeRender = () => {
    material.uniforms.u_aspect.value = aspect;

    if (!sourceVector.equals(lookAtTarget.position)) {
      sourceVector.copy(lookAtTarget.position);
      const direction = geometry.getAttribute('a_direction');

      direction.setXYZ(0, ...sourceVector.toArray());
      direction.needsUpdate = true;
    }
  };
  return points;
}
function createMaterial(size = 24) {
  const vertexShader = `
    attribute vec3 a_direction;
    uniform float u_size;
    uniform float u_aspect;
    varying float v_rotation;
    varying float v_distance;

    void main(){
      gl_PointSize = u_size;

      vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      vec4 targetPos = projectionMatrix * modelViewMatrix * vec4(a_direction, 1.0);

      vec2 dir = targetPos.xy/targetPos.w -mvPosition.xy/mvPosition.w;
      // dir.y = dir.y / u_aspect;
      float theta = atan(dir.y / u_aspect, dir.x);

      v_rotation =  theta; //  mod( theta + PI, 2.0 * PI );
      v_distance = length(dir);
      gl_Position = mvPosition;
    }
  `;
  const fragmentShader = `
    uniform vec3 u_color;
    uniform float u_opacity;
    uniform sampler2D u_map;
    varying float v_rotation;
    varying float v_distance;

    void main(){

      vec2 uv = gl_PointCoord - vec2(0.5);

      float xn = uv.x * cos(v_rotation) - uv.y * sin(v_rotation);
      float yn = uv.x * sin(v_rotation) + uv.y * cos(v_rotation);

      vec2 new_uv = vec2(xn +0.5, yn+0.5);

      if(new_uv.x < 0.0 || new_uv.x > 1.0 || new_uv.y < 0.0 || new_uv.y > 1.0){
        discard;
      }

      float mapColor = texture2D(u_map, new_uv).r;

      gl_FragColor = vec4(u_color, u_opacity * mapColor);
    }
  `;
  const texture = createCanvasTexture();
  const usize = size * window.devicePixelRatio;
  const material = new ShaderMaterial({
    uniforms: {
      u_size: { value: usize },
      u_color: { value: new Color(0xff0000) },
      u_opacity: { value: 1 },
      u_map: { value: texture },
      u_aspect: { value: aspect },
    },
    defines: {
      PI: Math.PI,
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });
  return material;
}
function createCanvasSpirit() {
  const size = 64;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = '#f00';
  ctx.beginPath();
  ctx.moveTo(0.1 * size, 0.3 * size);
  ctx.lineTo(0.6 * size, 0.3 * size);
  ctx.lineTo(0.6 * size, 0.1 * size);
  ctx.lineTo(1 * size, 0.5 * size);
  ctx.lineTo(0.6 * size, 0.9 * size);
  ctx.lineTo(0.6 * size, 0.7 * size);
  ctx.lineTo(0.1 * size, 0.7 * size);
  ctx.closePath();
  ctx.fill();
  return canvas;
}
function createCanvasTexture() {
  const canvas = createCanvasSpirit();
  const texture = new CanvasTexture(canvas);
  return texture;
}

function bindTransformControls(target) {
  const container = document.getElementById('app');

  const transformControls = new TransformControls(camera, container);

  scene.add(transformControls);

  transformControls.attach(target);

  transformControls.addEventListener('mouseDown', () => {
    controls.enabled = false;
  });

  transformControls.addEventListener('mouseUp', () => {
    controls.enabled = true;
  });
}

function createLine() {
  const sourceVector = lookAtTarget.position.clone();
  const geometry = new BufferGeometry().setFromPoints([
    sourceVector,
    arrowVector,
  ]);

  const line = new Line(geometry, new LineBasicMaterial({ color: 0xff0000 }));

  line.onAfterRender = () => {
    if (!sourceVector.equals(lookAtTarget.position)) {
      sourceVector.copy(lookAtTarget.position);

      const position = geometry.getAttribute('position');
      position.setXYZ(0, ...sourceVector.toArray());
      position.needsUpdate = true;

      geometry.boundingSphere = null;
      geometry.boundingBox = null;
    }
  };

  return line;
}

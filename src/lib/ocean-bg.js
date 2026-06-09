/**
 * Ocean background adapted from earendil.com (earendil-works/website, Apache-2.0)
 * Original ocean shader by afl_ext (MIT). Film grain post-process by martins upitis.
 */
import { getNightPreference } from './theme.js';
import {
  getOceanQualitySettings,
  LOW_DPI_NOISE_SCALE,
  LOW_DPI_THRESHOLD,
  OCEAN_QUALITY,
} from './ocean/quality.js';
import { createProgram, createShader } from './ocean/webgl.js';
import { createRippleStore, screenToWaterHit } from './ocean/ripples.js';
import {
  vertexShaderSource,
  ditherVertexShaderSource,
  ditherFragmentShaderSource,
  lightDecayFragmentShaderSource,
  buildFragmentShader,
} from './ocean/shaders.js';

export function initOceanBackground(canvas) {
  if (!canvas || canvas.dataset.oceanInit) return null;

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) {
    console.warn('Ocean background: WebGL unavailable');
    return null;
  }

  canvas.dataset.oceanInit = '1';

  let nightBlend = getNightPreference() ? 1.0 : 0.0;
  let nightFadeStart = null;
  let nightFadeFrom = nightBlend;
  let nightFadeTo = nightBlend;
  const THEME_FADE_DURATION = 900;

  let cameraYOffset = 0;
  let cameraZOffset = 0;
  let cameraTiltOffset = 0;

  function easeInOut(t) {
    return t * t * (3.0 - 2.0 * t);
  }

  function updateNightBlend(time) {
    const desired = getNightPreference() ? 1.0 : 0.0;
    if (desired !== nightFadeTo) {
      nightFadeFrom = nightBlend;
      nightFadeTo = desired;
      nightFadeStart = time;
    }

    if (nightFadeStart !== null) {
      const progress = Math.min((time - nightFadeStart) / THEME_FADE_DURATION, 1);
      const eased = easeInOut(progress);
      nightBlend = nightFadeFrom + (nightFadeTo - nightFadeFrom) * eased;
      if (progress >= 1) {
        nightFadeStart = null;
        nightBlend = nightFadeTo;
      }
    } else {
      nightBlend = nightFadeTo;
    }

    return nightBlend;
  }

  const LIGHT_INTENSITY = 1.0;
  const LOGO_FADE_DELAY = 150;
  const LOGO_FADE_DURATION = 900;
  const LOGO_FADE_TARGET = 0.85;

  const fragmentShaderSource = buildFragmentShader(OCEAN_QUALITY);

// Ocean wave program
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const oceanFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, oceanFragmentShader);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1
]), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'position');
const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
const timeLocation = gl.getUniformLocation(program, 'iTime');
const lightTextureLocation = gl.getUniformLocation(program, 'u_light');
const logoTextureLocation = gl.getUniformLocation(program, 'u_logo');
const logoCenterLocation = gl.getUniformLocation(program, 'u_logoCenter');
const logoSizeLocation = gl.getUniformLocation(program, 'u_logoSize');
const logoFadeLocation = gl.getUniformLocation(program, 'u_logoFade');
const ripplesLocation = gl.getUniformLocation(program, 'u_ripples');
const rippleCountLocation = gl.getUniformLocation(program, 'u_rippleCount');
const nightLocation = gl.getUniformLocation(program, 'u_night');
const ambientLocation = gl.getUniformLocation(program, 'u_ambientIntensity');
const cameraYOffsetLocation = gl.getUniformLocation(program, 'u_cameraYOffset');
const cameraZOffsetLocation = gl.getUniformLocation(program, 'u_cameraZOffset');
const cameraTiltOffsetLocation = gl.getUniformLocation(program, 'u_cameraTiltOffset');

// Dither post-process program
const ditherVertexShader = createShader(gl, gl.VERTEX_SHADER, ditherVertexShaderSource);
const ditherFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, ditherFragmentShaderSource);
const ditherProgram = createProgram(gl, ditherVertexShader, ditherFragmentShader);

const lightDecayFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, lightDecayFragmentShaderSource);
const lightDecayProgram = createProgram(gl, ditherVertexShader, lightDecayFragmentShader);

const ditherPositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, ditherPositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
const ditherPositionLocation = gl.getAttribLocation(ditherProgram, 'a_position');
const lightDecayPositionLocation = gl.getAttribLocation(lightDecayProgram, 'a_position');

const ditherTexCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, ditherTexCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);
const ditherTexCoordLocation = gl.getAttribLocation(ditherProgram, 'a_texCoord');
const lightDecayTexCoordLocation = gl.getAttribLocation(lightDecayProgram, 'a_texCoord');

const ditherResolutionLocation = gl.getUniformLocation(ditherProgram, 'u_resolution');
const ditherImageLocation = gl.getUniformLocation(ditherProgram, 'u_image');
const ditherTimeLocation = gl.getUniformLocation(ditherProgram, 'u_time');
const ditherNightLocation = gl.getUniformLocation(ditherProgram, 'u_night');
const ditherNoiseScaleLocation = gl.getUniformLocation(ditherProgram, 'u_noiseScale');

const lightDecayImageLocation = gl.getUniformLocation(lightDecayProgram, 'u_light');
const lightDecayFactorLocation = gl.getUniformLocation(lightDecayProgram, 'u_decay');
const lightDecayCutoffLocation = gl.getUniformLocation(lightDecayProgram, 'u_cutoff');

// Framebuffer for render-to-texture
let framebuffer = null;
let renderTexture = null;
let fbWidth = 0;
let fbHeight = 0;

let lightFramebuffers = [null, null];
let lightTextures = [null, null];
let lightWriteIndex = 0;
let lastLightTime = 0;

const logoCenter = [0.53, 0.72];
const logoSize = [0.18, 0.18 / 1.32];
let logoFadeStart = null;
const logoTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, logoTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

function setupFramebuffer(width, height) {
  if (framebuffer && fbWidth === width && fbHeight === height) return;
  
  if (framebuffer) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(renderTexture);
  }

  fbWidth = width;
  fbHeight = height;

  renderTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function createLightTexture(width, height) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function setupLightFramebuffers(width, height) {
  for (let i = 0; i < 2; i++) {
    if (lightFramebuffers[i]) {
      gl.deleteFramebuffer(lightFramebuffers[i]);
      gl.deleteTexture(lightTextures[i]);
    }
    lightTextures[i] = createLightTexture(width, height);
    lightFramebuffers[i] = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, lightFramebuffers[i]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lightTextures[i], 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  lightWriteIndex = 0;
}

function resize() {
  // Use the canvas's CSS layout size (set by 100vw × 100dvh in CSS)
  // This is immune to pinch/browser zoom unlike visualViewport dimensions
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const { renderScale } = getOceanQualitySettings();
  const scale = renderScale;
  canvas.width = Math.round(width * window.devicePixelRatio * scale);
  canvas.height = Math.round(height * window.devicePixelRatio * scale);
  setupFramebuffer(canvas.width, canvas.height);
  setupLightFramebuffers(canvas.width, canvas.height);
  updateLogoPlacement();
}

window.addEventListener('resize', resize);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resize);
}

const resizeObserver = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver(() => resize())
  : null;
resizeObserver?.observe(canvas);

resize();
if (!canvas.width || !canvas.height) {
  requestAnimationFrame(() => resize());
}

const ripples = createRippleStore();

function updateLogoPlacement() {
  logoCenter[0] = 0.53;
  logoCenter[1] = 0.72;
}

// Ripple on click
canvas.addEventListener('click', (e) => {
  const time = performance.now() * 0.001;
  const hit = screenToWaterHit(canvas, e.clientX, e.clientY, time, {
    cameraYOffset,
    cameraZOffset,
    cameraTiltOffset,
  });
  if (hit) {
    ripples.add(hit.x, hit.z, time, 0.18);
  }
});

function updateLightTexture(time) {
  if (!lastLightTime) {
    lastLightTime = time;
  }
  const delta = Math.max(0, (time - lastLightTime) * 0.001);
  lastLightTime = time;
  const fadeDuration = 240;
  const targetIntensity = LIGHT_INTENSITY;
  const decayCutoff = 1 / 255;
  const decayFloor = (1 / 255) / targetIntensity;
  const decay = Math.pow(decayFloor, delta / fadeDuration);
  const readIndex = lightWriteIndex;
  const writeIndex = 1 - lightWriteIndex;

  gl.bindFramebuffer(gl.FRAMEBUFFER, lightFramebuffers[writeIndex]);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(lightDecayProgram);

  gl.enableVertexAttribArray(lightDecayPositionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, ditherPositionBuffer);
  gl.vertexAttribPointer(lightDecayPositionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lightDecayTexCoordLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, ditherTexCoordBuffer);
  gl.vertexAttribPointer(lightDecayTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, lightTextures[readIndex]);
  gl.uniform1i(lightDecayImageLocation, 0);
  gl.uniform1f(lightDecayFactorLocation, decay);
  gl.uniform1f(lightDecayCutoffLocation, decayCutoff);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  lightWriteIndex = writeIndex;
}

// Mark shader as ready after first successful frame
let shaderReady = false;
function markShaderReady() {
  if (!shaderReady && program) {
    shaderReady = true;
    canvas.classList.add('shader-ready');
  }
}

function render(time) {
  if (!program || !framebuffer) {
    requestAnimationFrame(render);
    return;
  }
  try {
  updateLightTexture(time);

  if (logoFadeStart === null) {
    logoFadeStart = time + LOGO_FADE_DELAY;
  }
  const logoProgress = Math.min(Math.max((time - logoFadeStart) / LOGO_FADE_DURATION, 0), 1);
  const logoFade = logoProgress * LOGO_FADE_TARGET;
  const nightValue = updateNightBlend(time);
  const ambientIntensity = 1.0 + (0.30 - 1.0) * nightValue;
  // Pass 1: Render ocean waves to framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  gl.uniform1f(timeLocation, time * 0.001);
  gl.uniform2f(logoCenterLocation, logoCenter[0], logoCenter[1]);
  gl.uniform2f(logoSizeLocation, logoSize[0], logoSize[1]);
  gl.uniform1f(logoFadeLocation, logoFade);
  gl.uniform1f(nightLocation, nightValue);
  gl.uniform1f(ambientLocation, ambientIntensity);
  gl.uniform1f(cameraYOffsetLocation, cameraYOffset);
  gl.uniform1f(cameraZOffsetLocation, cameraZOffset);
  gl.uniform1f(cameraTiltOffsetLocation, cameraTiltOffset);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, lightTextures[lightWriteIndex]);
  gl.uniform1i(lightTextureLocation, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, logoTexture);
  gl.uniform1i(logoTextureLocation, 2);
  
  // Pass ripple uniforms
  gl.uniform4fv(ripplesLocation, ripples.uniforms());
  gl.uniform1i(rippleCountLocation, ripples.count);
  
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Pass 2: Apply dither post-processing to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(ditherProgram);

  gl.enableVertexAttribArray(ditherPositionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, ditherPositionBuffer);
  gl.vertexAttribPointer(ditherPositionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(ditherTexCoordLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, ditherTexCoordBuffer);
  gl.vertexAttribPointer(ditherTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderTexture);
  gl.uniform1i(ditherImageLocation, 0);
  gl.uniform2f(ditherResolutionLocation, canvas.width, canvas.height);
  gl.uniform1f(ditherTimeLocation, time * 0.001);
  gl.uniform1f(ditherNightLocation, nightValue);
  // Finer noise on low DPI screens
  const noiseScale = window.devicePixelRatio < LOW_DPI_THRESHOLD ? LOW_DPI_NOISE_SCALE : 1.0;
  gl.uniform1f(ditherNoiseScaleLocation, noiseScale);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  markShaderReady();
  } catch (err) {
    console.error('Ocean background render error:', err);
  }
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

  return { canvas };
}

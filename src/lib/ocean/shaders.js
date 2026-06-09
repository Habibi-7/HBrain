/**
 * WebGL shader sources for the ocean background.
 */
import { QUALITY_SETTINGS } from './quality.js';

export const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export const ditherVertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const ditherFragmentShaderSource = `
  precision highp float;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_night;
  uniform float u_noiseScale;
  varying vec2 v_texCoord;

  #define INTENSITY_DAY 0.4
  #define INTENSITY_NIGHT 0.072
  #define SPEED 1.5
  #define MEAN 0.0
  #define VARIANCE_DAY 0.75
  #define VARIANCE_NIGHT 0.6

  float gaussian(float z, float u, float o) {
    return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Convert to grayscale
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Film grain noise (scaled for finer grain on low DPI)
    float t = u_time * SPEED;
    vec2 uv = gl_FragCoord.xy * u_noiseScale / u_resolution;
    float seed = dot(uv, vec2(12.9898, 78.233));
    float noise = fract(sin(seed) * 43758.5453 + t);
    float variance = mix(VARIANCE_DAY, VARIANCE_NIGHT, u_night);
    noise = gaussian(noise, MEAN, variance * variance);
    
    // Apply grain (addition blend mode)
    vec3 grain = vec3(noise) * (1.0 - vec3(gray));
    float grainIntensity = mix(INTENSITY_DAY, INTENSITY_NIGHT, u_night);
    gray = gray + grain.r * grainIntensity;
    gray = clamp(gray, 0.0, 1.0);
    
    // Map to color palette
    vec3 dark = mix(vec3(0.16, 0.34, 0.55), vec3(0.006, 0.010, 0.020), u_night);
    vec3 light = mix(vec3(0.62, 0.76, 1.0), vec3(0.68, 0.76, 0.88), u_night);
    gl_FragColor = vec4(mix(dark, light, gray), 1.0);
  }
`;

export const lightDecayFragmentShaderSource = `
  precision highp float;
  uniform sampler2D u_light;
  uniform float u_decay;
  uniform float u_cutoff;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_light, v_texCoord);
    float intensity = color.r * u_decay - 0.004; // linear term breaks 8-bit quantization
    intensity = max(0.0, intensity);
    intensity *= step(u_cutoff, intensity);
    gl_FragColor = vec4(vec3(intensity), intensity);
  }
`;

// based on afl_ext's ocean weaves shader (MIT licensed)
export function buildFragmentShader(quality) {
  const settings = QUALITY_SETTINGS[quality];
  return `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform sampler2D u_light;
  uniform sampler2D u_logo;
  uniform vec2 u_logoCenter;
  uniform vec2 u_logoSize;
  uniform float u_logoFade;
  uniform vec4 u_ripples[10]; // (worldX, worldZ, birthTime, amplitude)
  uniform int u_rippleCount;
  uniform float u_night;
  uniform float u_ambientIntensity;
  uniform float u_cameraYOffset;
  uniform float u_cameraZOffset;
  uniform float u_cameraTiltOffset;

  // afl_ext 2017-2024
  // MIT License
  #define PI 3.14159265359

  #define DRAG_MULT 0.38
  #define WATER_DEPTH 1.0
  #define CAMERA_HEIGHT 1.5
  #define ITERATIONS_RAYMARCH ${settings.waveIterRaymarch}
  #define ITERATIONS_NORMAL ${settings.waveIterNormal}
  #define RAYMARCH_STEPS ${settings.raymarchSteps}
  #define FBM_OCTAVES ${settings.fbmOctaves}
  #define LOGO_INTENSITY 3.5
  #define NIGHT_EPS 0.001

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise21(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < FBM_OCTAVES; i++) {
      value += amplitude * noise21(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  mat3 createRotationMatrixAxisAngle(vec3 axis, float angle);

  vec2 dirToScreenUV(vec3 dir) {
    vec3 unrotated = createRotationMatrixAxisAngle(vec3(1.0, 0.0, 0.0), -(0.14 + u_cameraTiltOffset)) * dir;
    if (unrotated.z <= 0.0) return vec2(-1.0);
    vec2 uv = (unrotated.xy / unrotated.z) * 1.5;
    vec2 ndc = uv / vec2(iResolution.x / iResolution.y, 1.0);
    return ndc * 0.5 + 0.5;
  }

  float star(vec2 screenUv, vec2 cellId, vec2 grid) {
    float rnd = hash21(cellId);
    if (rnd > 0.8) return 0.0;
    vec2 starPos = vec2(hash21(cellId + 0.1), hash21(cellId + 0.2));
    vec2 starUv = (cellId + starPos) / grid;
    vec2 deltaPx = (screenUv - starUv) * iResolution.xy;
    float sizePx = 0.25 + hash21(cellId + 0.3) * 0.45;
    float d = length(deltaPx);
    float core = smoothstep(sizePx, sizePx * 0.2, d);
    float flickerPhase = hash21(cellId + 0.4) * 6.28318;
    float flickerSpeed = 0.2 + hash21(cellId + 0.5) * 0.3;
    float flickerAmount = mix(0.1, 0.35, hash21(cellId + 0.7));
    float flicker = mix(1.0 - flickerAmount, 1.0 + flickerAmount, 0.5 + 0.5 * sin(iTime * flickerSpeed + flickerPhase));
    float lumens = mix(1.0, 12.0, hash21(cellId + 0.6));
    float brightness = mix(0.6, 1.4, lumens / 12.0);
    return core * flicker * brightness;
  }

  vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
    float x = dot(direction, position) * frequency + timeshift;
    float wave = exp(sin(x) - 1.0);
    float dx = wave * cos(x);
    return vec2(wave, -dx);
  }

  float getripples(vec2 position) {
    float rippleSum = 0.0;
    for (int i = 0; i < 10; i++) {
      if (i >= u_rippleCount) break;
      vec4 ripple = u_ripples[i];
      vec2 ripplePos = ripple.xy;
      float birthTime = ripple.z;
      float amplitude = ripple.w;
      
      float age = iTime - birthTime;
      if (age < 0.0 || age > 12.0) continue;
      
      float dist = length(position - ripplePos);
      float frequency = 4.0;
      float speed = 3.2;
      float decay = 0.45;
      float spatialDecay = 0.16;
      
      // Circular wave propagating outward with decay
      float phase = dist * frequency - age * speed;
      float envelope = exp(-decay * age) * exp(-dist * spatialDecay);
      // Smooth start to avoid pop-in
      float fadeIn = smoothstep(0.0, 0.3, age);
      rippleSum += amplitude * envelope * fadeIn * sin(phase);
    }
    return rippleSum;
  }

  // Base wave calculation without ripples (used for raymarching)
  float getwaves_base(vec2 position, int iterations) {
    float wavePhaseShift = length(position) * 0.1;
    vec2 swellDir = normalize(vec2(-0.25, 1.0));
    float swellBias = 0.35;
    float iter = 0.0;
    float frequency = 1.0;
    float timeMultiplier = 2.0;
    float weight = 1.0;
    float sumOfValues = 0.0;
    float sumOfWeights = 0.0;
    for(int i=0; i < 16; i++) {
      if(i >= iterations) break;
      vec2 p = normalize(mix(vec2(sin(iter), cos(iter)), swellDir, swellBias));
      vec2 res = wavedx(position, p, frequency, iTime * timeMultiplier + wavePhaseShift);
      position += p * res.y * weight * DRAG_MULT;
      sumOfValues += res.x * weight;
      sumOfWeights += weight;
      weight = mix(weight, 0.0, 0.2);
      frequency *= 1.18;
      timeMultiplier *= 1.07;
      iter += 1232.399963;
    }
    float baseWaves = sumOfValues / sumOfWeights;

    float swellPhase = dot(position, swellDir) * 0.18 - iTime * 0.08;
    // Center swell around 0 so it adds and subtracts from the surface.
    float swell = sin(swellPhase);
    vec2 cameraPos = vec2(iTime * 0.2, 1.0);
    float swellFade = smoothstep(28.0, 4.0, length(position - cameraPos));

    return baseWaves + swell * swellFade * 0.35;
  }

  // Full wave calculation with ripples (used for normal calculation)
  float getwaves(vec2 position, int iterations) {
    return getwaves_base(position, iterations) + getripples(position);
  }

  float raymarchwater(vec3 camera, vec3 start, vec3 end, float depth) {
    vec3 pos = start;
    vec3 dir = normalize(end - start);
    for(int i=0; i < RAYMARCH_STEPS; i++) {
      float height = getwaves(pos.xz, ITERATIONS_RAYMARCH) * depth - depth;
      if(height + 0.01 > pos.y) {
        return distance(pos, camera);
      }
      pos += dir * (pos.y - height);
    }
    return distance(start, camera);
  }

  vec3 normal(vec2 pos, float e, float depth) {
    vec2 ex = vec2(e, 0);
    float H = getwaves(pos.xy, ITERATIONS_NORMAL) * depth;
    vec3 a = vec3(pos.x, H, pos.y);
    return normalize(
      cross(
        a - vec3(pos.x - e, getwaves(pos.xy - ex.xy, ITERATIONS_NORMAL) * depth, pos.y), 
        a - vec3(pos.x, getwaves(pos.xy + ex.yx, ITERATIONS_NORMAL) * depth, pos.y + e)
      )
    );
  }

  mat3 createRotationMatrixAxisAngle(vec3 axis, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 
      oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 
      oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
    );
  }

  vec3 getRay(vec2 fragCoord) {
    vec2 uv = ((fragCoord.xy / iResolution.xy) * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    vec3 proj = normalize(vec3(uv.x, uv.y, 1.5));
    // Fixed camera angle (no mouse movement) - tilted up to show more sky
    // u_cameraTiltOffset adds additional tilt (negative = look down more)
    return createRotationMatrixAxisAngle(vec3(0.0, -1.0, 0.0), 0.0)
      * createRotationMatrixAxisAngle(vec3(1.0, 0.0, 0.0), 0.14 + u_cameraTiltOffset)
      * proj;
  }

  float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normal) { 
    return clamp(dot(point - origin, normal) / dot(direction, normal), -1.0, 9991999.0); 
  }

  vec3 extra_cheap_atmosphere(vec3 raydir, vec3 sundir) {
    float special_trick = 1.0 / (raydir.y * 1.0 + 0.1);
    float special_trick2 = 1.0 / (sundir.y * 11.0 + 1.0);
    float raysundt = pow(abs(dot(sundir, raydir)), 2.0);
    float sundt = pow(max(0.0, dot(sundir, raydir)), 8.0);
    float mymie = sundt * special_trick * 0.2;
    vec3 suncolor = mix(vec3(1.0), max(vec3(0.0), vec3(1.0) - vec3(5.5, 13.0, 22.4) / 22.4), special_trick2);
    vec3 bluesky= vec3(6.0, 12.0, 20.0) / 22.4 * suncolor;
    vec3 bluesky2 = max(vec3(0.0), bluesky - vec3(12.0, 12.0, 13.0) * 0.002 * (special_trick + -6.0 * sundir.y * sundir.y));
    bluesky2 *= special_trick * (0.24 + raysundt * 0.24);
    return bluesky2 * (1.0 + 1.0 * pow(1.0 - raydir.y, 3.0));
  } 

  vec3 getSunDirection() {
    // Static sun position (no movement)
    return normalize(vec3(-0.0773502691896258, 0.6, 0.5773502691896258));
  }

  vec3 getAtmosphere(vec3 dir) {
     return extra_cheap_atmosphere(dir, getSunDirection()) * 0.65;
  }

  float getSun(vec3 dir) { 
    // No visible sun disc
    return 0.0;
  }

  vec2 skyUV(vec3 dir) {
    float u = atan(dir.z, dir.x) / (2.0 * PI) + 0.5;
    float v = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    return vec2(u, v);
  }

  vec3 getDaySky(vec3 dir, float skyLight) {
    vec2 uv = skyUV(dir);
    vec3 horizonColor = vec3(0.50, 0.68, 1.0);
    vec3 midColor = vec3(0.24, 0.48, 0.98);
    vec3 zenithColor = vec3(0.10, 0.32, 0.92);
    float t = pow(clamp(uv.y, 0.0, 1.0), 0.5);
    vec3 sky = mix(horizonColor, mix(midColor, zenithColor, smoothstep(0.2, 1.0, uv.y)), t);
    vec3 atmo = getAtmosphere(dir) * 0.35;
    return sky + atmo + vec3(0.62, 0.78, 1.0) * skyLight * 3.0 * u_ambientIntensity;
  }

  vec3 getNightSky(vec3 dir, float skyLight) {
    vec2 uv = skyUV(dir);
    vec3 topColor = vec3(0.004, 0.008, 0.018);
    vec3 bottomColor = vec3(0.010, 0.016, 0.030);
    vec3 color = mix(bottomColor, topColor, uv.y);

    vec2 screenUv = dirToScreenUV(dir);
    if (screenUv.x >= 0.0 && screenUv.x <= 1.0 && screenUv.y >= 0.0 && screenUv.y <= 1.0) {
      if (screenUv.y > 0.35) {
        float gridX = 40.0;
        float gridY = 30.0;
        vec2 grid = vec2(gridX, gridY);
        vec2 baseCell = floor(vec2(screenUv.x * gridX, screenUv.y * gridY));
        float s = 0.0;
        for (int yi = -1; yi <= 1; yi++) {
          for (int xi = -1; xi <= 1; xi++) {
            vec2 cell = baseCell + vec2(float(xi), float(yi));
            if (cell.y < 0.0 || cell.y >= gridY) continue;
            cell.x = mod(cell.x + gridX, gridX);
            s += star(screenUv, cell, grid);
          }
        }
        float horizonFade = smoothstep(0.35, 0.55, screenUv.y);
        vec3 starColor = vec3(0.88, 0.92, 1.0);
        color += starColor * s * horizonFade;
      }

    }

    color += vec3(1.0) * skyLight * 1.4 * u_ambientIntensity;
    return color;
  }

  float sampleLogo(vec2 uv) {
    vec2 local = (uv - u_logoCenter) / u_logoSize + 0.5;
    float inside = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
    float alpha = texture2D(u_logo, local).a * inside;
    return alpha * u_logoFade;
  }

  vec3 aces_tonemap(vec3 color) {  
    mat3 m1 = mat3(
      0.59719, 0.07600, 0.02840,
      0.35458, 0.90834, 0.13383,
      0.04823, 0.01566, 0.83777
    );
    mat3 m2 = mat3(
      1.60475, -0.10208, -0.00327,
      -0.53108,  1.10813, -0.07276,
      -0.07367, -0.00605,  1.07602
    );
    vec3 v = m1 * color;  
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));  
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 ray = getRay(fragCoord);
    if(ray.y >= 0.0) {
      float skyLight = texture2D(u_light, skyUV(ray)).r;
      vec3 C;
      float horizonFactor = smoothstep(0.02, 0.25, ray.y);
      float nightBlend = pow(u_night, mix(0.35, 1.0, horizonFactor));
      if (u_night <= NIGHT_EPS) {
        C = getDaySky(ray, skyLight);
      } else if (u_night >= 1.0 - NIGHT_EPS) {
        C = getNightSky(ray, skyLight);
      } else {
        vec3 daySky = getDaySky(ray, skyLight);
        vec3 nightSky = getNightSky(ray, skyLight);
        C = mix(daySky, nightSky, nightBlend);
      }
      fragColor = vec4(aces_tonemap(C * 2.0), 1.0);   
      return;
    }

    vec3 waterPlaneHigh = vec3(0.0, 0.0, 0.0);
    vec3 waterPlaneLow = vec3(0.0, -WATER_DEPTH, 0.0);
    vec3 origin = vec3(iTime * 0.2, CAMERA_HEIGHT + u_cameraYOffset, 1.0 + u_cameraZOffset);

    float highPlaneHit = intersectPlane(origin, ray, waterPlaneHigh, vec3(0.0, 1.0, 0.0));
    float lowPlaneHit = intersectPlane(origin, ray, waterPlaneLow, vec3(0.0, 1.0, 0.0));
    vec3 highHitPos = origin + ray * highPlaneHit;
    vec3 lowHitPos = origin + ray * lowPlaneHit;

    float dist = raymarchwater(origin, highHitPos, lowHitPos, WATER_DEPTH);
    vec3 waterHitPos = origin + ray * dist;

    float eps = max(0.01, dist * 0.004);
    vec3 N = normal(waterHitPos.xz, eps, WATER_DEPTH);
    N = mix(N, vec3(0.0, 1.0, 0.0), 0.8 * min(1.0, sqrt(dist*0.01) * 1.1));

    float fresnelSharp = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(-N, ray)), 5.0);
    // At distance, converge Fresnel to the smooth flat-normal value to kill speckle
    float fresnelFlat = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(vec3(0.0, 1.0, 0.0), -ray)), 5.0);
    float fresnelBlend = min(1.0, sqrt(dist * 0.01) * 1.1);
    float fresnel = mix(fresnelSharp, fresnelFlat, fresnelBlend);

    vec3 R = normalize(reflect(ray, N));
    R.y = abs(R.y);
    
    float reflectedLight = texture2D(u_light, skyUV(R)).r;
    float reflectedLogo = sampleLogo(skyUV(R));
    vec3 reflection;
    float reflectionHorizon = smoothstep(0.02, 0.25, R.y);
    float nightReflectionBlend = pow(u_night, mix(0.35, 1.0, reflectionHorizon));
    if (u_night <= NIGHT_EPS) {
      reflection = getDaySky(R, reflectedLight);
    } else if (u_night >= 1.0 - NIGHT_EPS) {
      reflection = getNightSky(R, reflectedLight);
    } else {
      vec3 dayReflection = getDaySky(R, reflectedLight);
      vec3 nightReflection = getNightSky(R, reflectedLight);
      reflection = mix(dayReflection, nightReflection, nightReflectionBlend);
    }
    reflection += vec3(1.0) * (reflectedLogo * LOGO_INTENSITY);
    vec3 scatteringBase = mix(vec3(0.08, 0.22, 0.54), vec3(0.012, 0.018, 0.034), u_night);
    vec3 scattering = scatteringBase * (0.2 + (waterHitPos.y + WATER_DEPTH) / WATER_DEPTH);

    vec3 C = fresnel * reflection + scattering;
    
    // Add distance fog
    vec3 fogColor = mix(vec3(0.30, 0.54, 0.98), vec3(0.008, 0.014, 0.026), u_night);
    float fogAmount = 1.0 - exp(-dist * 0.02);
    C = mix(C, fogColor, fogAmount);
    
    // Darken waves in light mode
    float waveBrightness = mix(1.4, 2.05, u_night);
    fragColor = vec4(aces_tonemap(C * waveBrightness), 1.0);
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
`;
}

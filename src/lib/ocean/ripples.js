const MAX_RIPPLES = 10;

export function createRippleStore() {
  const ripples = [];

  return {
    get count() {
      return ripples.length;
    },

    add(worldX, worldZ, time, amplitude = 0.22) {
      ripples.push({ x: worldX, z: worldZ, time, amplitude });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    },

    uniforms() {
      const data = new Float32Array(MAX_RIPPLES * 4);
      for (let i = 0; i < ripples.length; i += 1) {
        const ripple = ripples[i];
        data[i * 4 + 0] = ripple.x;
        data[i * 4 + 1] = ripple.z;
        data[i * 4 + 2] = ripple.time;
        data[i * 4 + 3] = ripple.amplitude;
      }
      return data;
    },
  };
}

export function screenToWaterHit(canvas, clientX, clientY, time, {
  cameraYOffset = 0,
  cameraZOffset = 0,
  cameraTiltOffset = 0,
} = {}) {
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

  const aspect = canvas.width / canvas.height;
  let rayX = ndcX * aspect;
  let rayY = ndcY;
  let rayZ = 1.5;
  const len = Math.hypot(rayX, rayY, rayZ);
  rayX /= len;
  rayY /= len;
  rayZ /= len;

  const tiltAngle = 0.14 + cameraTiltOffset;
  const cosTilt = Math.cos(tiltAngle);
  const sinTilt = Math.sin(tiltAngle);
  const newY = rayY * cosTilt + rayZ * sinTilt;
  const newZ = -rayY * sinTilt + rayZ * cosTilt;
  rayY = newY;
  rayZ = newZ;

  const camX = time * 0.2;
  const camY = 1.5 + cameraYOffset;
  const camZ = 1.0 + cameraZOffset;

  if (rayY >= 0) return null;

  const t = -camY / rayY;
  return { x: camX + rayX * t, z: camZ + rayZ * t };
}

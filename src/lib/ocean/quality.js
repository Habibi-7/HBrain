export const OCEAN_QUALITY = 'high';

export const QUALITY_SETTINGS = {
  low: {
    scale: 0.25,
    lowDpiScale: 0.425,
    raymarchSteps: 20,
    waveIterRaymarch: 4,
    waveIterNormal: 16,
    fbmOctaves: 2,
  },
  medium: {
    scale: 0.35,
    lowDpiScale: 0.595,
    raymarchSteps: 24,
    waveIterRaymarch: 6,
    waveIterNormal: 16,
    fbmOctaves: 3,
  },
  high: {
    scale: 0.4,
    lowDpiScale: 0.68,
    raymarchSteps: 32,
    waveIterRaymarch: 8,
    waveIterNormal: 16,
    fbmOctaves: 4,
  },
};

export const LOW_DPI_THRESHOLD = 1.5;
export const LOW_DPI_NOISE_SCALE = 1.7;

export function getOceanQualitySettings(devicePixelRatio = window.devicePixelRatio) {
  const settings = QUALITY_SETTINGS[OCEAN_QUALITY];
  return {
    ...settings,
    renderScale: devicePixelRatio < LOW_DPI_THRESHOLD ? settings.lowDpiScale : settings.scale,
  };
}

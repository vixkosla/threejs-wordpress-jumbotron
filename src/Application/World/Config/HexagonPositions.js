/**
 * Конфигурация позиций шестиугольников
 *
 * Настройки экспортированы из GUI 2026-02-21T19:46:47.595Z
 * Применены как дефолтные значения
 */

// Позиции по умолчанию (используются при инициализации)
// Будут перезаписаны из HEXAGON_SETTINGS если есть сохранение
export const HEXAGON_1_POSITION = {
  x: -4,
  y: -1.5,
  z: 4,
};

export const HEXAGON_2_POSITION = {
  x: 8,
  y: -3,
  z: 8,
};

export const HEXAGON_3_POSITION = {
  x: -8,
  y: -3,
  z: 8,
};

// Названия для GUI панелей
export const HEXAGON_1_LABEL = "(Front)";
export const HEXAGON_2_LABEL = "(Left)";
export const HEXAGON_3_LABEL = "(Right)";

// === НАСТРОЙКИ ПО УМОЛЧАНИЮ (из сохранений hexagon-settings (10).js от 2026-02-23T01:14:53.655Z) ===
export const DEFAULT_LIGHT_SETTINGS = {
  // Настройки камеры по умолчанию
  camera: {
    position: { x: 6.320308439648348, y: 5.362628357729717, z: -6.5044872946773875 },
    target: { x: 0, y: 0, z: 0 },
  },
  hexagon1: {
    radius: 2,
    azimuth: 97.5,
    elevation: -14.851062468857862,
    lightIntensity: 0.5,
    backLightIntensity: 28,
  },
  hexagon2: {
    radius: 3.5,
    azimuth: 140,
    elevation: -14.851062468857862,
    lightIntensity: 30,
    backLightIntensity: 6,
  },
  hexagon3: {
    radius: 2,
    azimuth: 180,
    elevation: -12.5,
    lightIntensity: 0,
    backLightIntensity: 6,
  },
};

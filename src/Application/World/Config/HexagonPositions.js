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

// === НАСТРОЙКИ ПО УМОЛЧАНИЮ (из сохранений) ===
export const DEFAULT_LIGHT_SETTINGS = {
  hexagon1: {
    radius: 1,
    azimuth: -34,
    elevation: -14.851062468857862,
    lightIntensity: 1,
    backLightIntensity: 36,
  },
  hexagon2: {
    radius: 1,
    azimuth: 180,
    elevation: -14.851062468857862,
    lightIntensity: 1,
    backLightIntensity: 50,
  },
  hexagon3: {
    radius: 1,
    azimuth: -180,
    elevation: -14.851062468857862,
    lightIntensity: 0,
    backLightIntensity: 50,
  },
};

/**
 * Конфигурация позиций шестиугольников
 * 
 * Hexagon 1 (Front):
 * - Ближний шестиугольник, основной свет
 * 
 * Hexagon 2 (Left):
 * - Дальний шестиугольник, в соседней декарте
 * - Меняй эти координаты для перемещения по сцене
 * 
 * Hexagon 3 (Right):
 * - Третий шестиугольник справа
 */

// Позиция первого шестиугольника (ближний к камере)
export const HEXAGON_1_POSITION = {
  x: -4,
  y: -1.5,
  z: 4,
};

// Позиция второго шестиугольника (дальний, в соседней декарте)
// МЕНЯЙ ЭТИ КООРДИНАТЫ для перемещения второго шестиугольника
export const HEXAGON_2_POSITION = {
  x: 8,
  y: -3,
  z: 8,
};

// Позиция третьего шестиугольника (справа)
export const HEXAGON_3_POSITION = {
  x: -8,
  y: -3,
  z: 8,
};

// Названия для GUI панелей
export const HEXAGON_1_LABEL = "(Front)";
export const HEXAGON_2_LABEL = "(Left)";
export const HEXAGON_3_LABEL = "(Right)";

// Настройки света по умолчанию
export const DEFAULT_LIGHT_SETTINGS = {
  hexagon1: {
    radius: 4,
    azimuth: 0,
    elevation: 0,
    lightIntensity: 7.5,
    backLightIntensity: 15,
  },
  hexagon2: {
    radius: 12,
    azimuth: 0,
    elevation: 0,
    lightIntensity: 7.5,
    backLightIntensity: 15,
  },
  hexagon3: {
    radius: 12,
    azimuth: 0,
    elevation: 0,
    lightIntensity: 7.5,
    backLightIntensity: 15,
  },
};

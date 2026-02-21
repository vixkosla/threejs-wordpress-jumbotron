/**
 * Менеджер сохранений настроек GUI
 * Сохраняет в localStorage и экспортирует в JS файл
 */
export class SettingsManager {
  constructor() {
    this.storageKey = 'hexagons-settings';
  }

  /**
   * Сохранить текущие настройки
   */
  save(settings) {
    const json = JSON.stringify(settings, null, 2);
    localStorage.setItem(this.storageKey, json);
    console.log('✅ Настройки сохранены:', settings);
    return json;
  }

  /**
   * Загрузить сохранённые настройки
   */
  load() {
    const json = localStorage.getItem(this.storageKey);
    if (json) {
      console.log('✅ Настройки загружены');
      return JSON.parse(json);
    }
    return null;
  }

  /**
   * Экспорт настроек в JS файл (для вставки в код)
   */
  exportToJS(settings) {
    return `/**
 * Настройки шестиугольников (экспортировано из GUI)
 * Дата: ${new Date().toISOString()}
 */

export const HEXAGON_SETTINGS = ${JSON.stringify(settings, null, 2)};
`;
  }

  /**
   * Очистить сохранения
   */
  clear() {
    localStorage.removeItem(this.storageKey);
    console.log('🗑️ Настройки очищены');
  }
}

export default SettingsManager;

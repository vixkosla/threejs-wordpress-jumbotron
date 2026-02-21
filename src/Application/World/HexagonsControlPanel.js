import * as THREE from "three";
import GUI from "lil-gui";
import SettingsManager from "./SettingsManager.js";
import { DEFAULT_LIGHT_SETTINGS } from "./Config/HexagonPositions.js";

/**
 * Единая панель управления тремя шестиугольниками
 * Группировка: Орбиты | Свет | Сохранение
 */
export default class HexagonsControlPanel {
  constructor(hexagon1, hexagon2, hexagon3, position1, position2, position3) {
    this.hexagon1 = hexagon1;
    this.hexagon2 = hexagon2;
    this.hexagon3 = hexagon3;
    this.gui = null;
    this.settingsManager = new SettingsManager();

    // Загружаем дефолтные настройки из конфига
    const defaults = DEFAULT_LIGHT_SETTINGS;

    // Параметры для каждого шестиугольника
    this.params1 = { ...defaults.hexagon1 };
    this.params2 = { ...defaults.hexagon2 };
    this.params3 = { ...defaults.hexagon3 };

    // Вычисляем начальные углы из позиций (если радиус не задан)
    if (!defaults.hexagon1.radius) this.updateParamsFromPosition(this.params1, position1);
    if (!defaults.hexagon2.radius) this.updateParamsFromPosition(this.params2, position2);
    if (!defaults.hexagon3.radius) this.updateParamsFromPosition(this.params3, position3);

    this.setupGUI();
    
    // Загружаем настройки (localStorage или дефолтные)
    this.loadSettings();
  }

  /**
   * Вычислить параметры из позиции
   */
  updateParamsFromPosition(params, position) {
    params.radius = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
    params.azimuth = Math.atan2(position.z, position.x) * (180 / Math.PI);
    const horizontalDist = Math.sqrt(position.x ** 2 + position.z ** 2);
    params.elevation = Math.atan2(position.y, horizontalDist) * (180 / Math.PI);
  }

  /**
   * Обновить позиции всех шестиугольников
   */
  updatePositions() {
    this.updatePosition(this.hexagon1, this.params1);
    this.updatePosition(this.hexagon2, this.params2);
    this.updatePosition(this.hexagon3, this.params3);
  }

  /**
   * Обновить позицию из сферических координат
   */
  updatePosition(hexagon, params) {
    const azimuthRad = params.azimuth * (Math.PI / 180);
    const elevationRad = params.elevation * (Math.PI / 180);

    const x = params.radius * Math.cos(elevationRad) * Math.cos(azimuthRad);
    const y = params.radius * Math.sin(elevationRad);
    const z = params.radius * Math.cos(elevationRad) * Math.sin(azimuthRad);

    hexagon.position.set(x, y, z);
    hexagon.group.position.set(x, y, z);
    hexagon.group.lookAt(0, 0, 0);
    hexagon.updateMarkerPosition(hexagon.position);
  }

  /**
   * Обновить интенсивность света
   */
  updateLight() {
    this.hexagon1.params.intensity = this.params1.lightIntensity * 2;
    this.hexagon1.params.addLightIntensity = this.params1.backLightIntensity;
    this.hexagon1.updateFromParams();

    this.hexagon2.params.intensity = this.params2.lightIntensity * 2;
    this.hexagon2.params.addLightIntensity = this.params2.backLightIntensity;
    this.hexagon2.updateFromParams();

    this.hexagon3.params.intensity = this.params3.lightIntensity * 2;
    this.hexagon3.params.addLightIntensity = this.params3.backLightIntensity;
    this.hexagon3.updateFromParams();
  }

  /**
   * Получить все текущие настройки
   */
  getSettings() {
    return {
      hexagon1: { ...this.params1 },
      hexagon2: { ...this.params2 },
      hexagon3: { ...this.params3 },
    };
  }

  /**
   * Применить настройки
   */
  applySettings(settings) {
    if (settings.hexagon1) {
      Object.assign(this.params1, settings.hexagon1);
    }
    if (settings.hexagon2) {
      Object.assign(this.params2, settings.hexagon2);
    }
    if (settings.hexagon3) {
      Object.assign(this.params3, settings.hexagon3);
    }
    this.updatePositions();
    this.updateLight();
    this.updateGUI();
  }

  /**
   * Сохранить настройки и экспортировать
   */
  saveAndExport() {
    const settings = this.getSettings();
    const json = this.settingsManager.save(settings);
    const jsExport = this.settingsManager.exportToJS(settings);
    
    // Создаём blob для скачивания
    const blob = new Blob([jsExport], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hexagon-settings.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📦 Настройки экспортированы в hexagon-settings.js');
  }

  /**
   * Загрузить настройки
   */
  loadSettings() {
    // Сначала пробуем из localStorage
    const settings = this.settingsManager.load();
    if (settings) {
      this.applySettings(settings);
      console.log('✅ Настройки загружены из localStorage');
    } else {
      // Если нет сохранения, используем дефолтные из конфига
      this.applySettings(DEFAULT_LIGHT_SETTINGS);
      console.log('✅ Применены настройки по умолчанию из конфига');
    }
  }

  setupGUI() {
    this.gui = new GUI({ 
      title: "🔷 Hexagons Control",
      width: 320,
      container: document.querySelector('body')
    });
    
    // Перемещаем GUI в левый верхний угол
    if (this.gui.domElement) {
      this.gui.domElement.style.position = 'fixed';
      this.gui.domElement.style.top = '0';
      this.gui.domElement.style.left = '0';
      this.gui.domElement.style.right = 'auto';
    }

    // === ПАПКА 1: ОРБИТЫ (все три) ===
    const folderOrbits = this.gui.addFolder("🌍 Орбиты (3 шестиугольника)");

    const folder1 = folderOrbits.addFolder("1. Front (ближний)");
    folder1.add(this.params1, "radius", 1, 15, 0.5).name("Радиус").onChange(() => this.updatePosition(this.hexagon1, this.params1));
    folder1.add(this.params1, "azimuth", -180, 180, 0.5).name("Azimuth °").onChange(() => this.updatePosition(this.hexagon1, this.params1));
    folder1.add(this.params1, "elevation", -90, 90, 0.5).name("Elevation °").onChange(() => this.updatePosition(this.hexagon1, this.params1));

    const folder2 = folderOrbits.addFolder("2. Left (дальний)");
    folder2.add(this.params2, "radius", 1, 30, 0.5).name("Радиус").onChange(() => this.updatePosition(this.hexagon2, this.params2));
    folder2.add(this.params2, "azimuth", -180, 180, 0.5).name("Azimuth °").onChange(() => this.updatePosition(this.hexagon2, this.params2));
    folder2.add(this.params2, "elevation", -90, 90, 0.5).name("Elevation °").onChange(() => this.updatePosition(this.hexagon2, this.params2));

    const folder3 = folderOrbits.addFolder("3. Right (справа)");
    folder3.add(this.params3, "radius", 1, 30, 0.5).name("Радиус").onChange(() => this.updatePosition(this.hexagon3, this.params3));
    folder3.add(this.params3, "azimuth", -180, 180, 0.5).name("Azimuth °").onChange(() => this.updatePosition(this.hexagon3, this.params3));
    folder3.add(this.params3, "elevation", -90, 90, 0.5).name("Elevation °").onChange(() => this.updatePosition(this.hexagon3, this.params3));

    // === ПАПКА 2: ИНТЕНСИВНОСТЬ СВЕТА ===
    const folderLight = this.gui.addFolder("💡 Интенсивность света");

    const folderLight1 = folderLight.addFolder("1. Front");
    folderLight1.add(this.params1, "lightIntensity", 0, 30, 0.5).name("RectArea").onChange(() => this.updateLight());
    folderLight1.add(this.params1, "backLightIntensity", 0, 50, 1).name("Back Light").onChange(() => this.updateLight());

    const folderLight2 = folderLight.addFolder("2. Left");
    folderLight2.add(this.params2, "lightIntensity", 0, 30, 0.5).name("RectArea").onChange(() => this.updateLight());
    folderLight2.add(this.params2, "backLightIntensity", 0, 50, 1).name("Back Light").onChange(() => this.updateLight());

    const folderLight3 = folderLight.addFolder("3. Right");
    folderLight3.add(this.params3, "lightIntensity", 0, 30, 0.5).name("RectArea").onChange(() => this.updateLight());
    folderLight3.add(this.params3, "backLightIntensity", 0, 50, 1).name("Back Light").onChange(() => this.updateLight());

    // === ПАПКА 3: СОХРАНЕНИЕ ===
    const folderSave = this.gui.addFolder("💾 Сохранение настроек");
    
    folderSave.add({ save: () => this.saveAndExport() }, "save").name("💾 Сохранить и экспортировать");
    folderSave.add({ load: () => this.loadSettings() }, "load").name("📂 Загрузить сохранение");
    
    folderSave.add({
      resetAll: () => {
        this.settingsManager.clear();
        location.reload();
      }
    }, "resetAll").name("🔄 Сбросить всё (reload)");

    // === КНОПКИ СБРОСА ПОЗИЦИЙ ===
    const folderReset = this.gui.addFolder("⚙️ Сброс позиций");
    
    folderReset.add({
      reset1: () => {
        Object.assign(this.params1, DEFAULT_LIGHT_SETTINGS.hexagon1);
        this.updatePosition(this.hexagon1, this.params1);
        this.updateLight();
        this.updateGUI();
      }
    }, "reset1").name("↻ Front");

    folderReset.add({
      reset2: () => {
        Object.assign(this.params2, DEFAULT_LIGHT_SETTINGS.hexagon2);
        this.updatePosition(this.hexagon2, this.params2);
        this.updateLight();
        this.updateGUI();
      }
    }, "reset2").name("↻ Left");

    folderReset.add({
      reset3: () => {
        Object.assign(this.params3, DEFAULT_LIGHT_SETTINGS.hexagon3);
        this.updatePosition(this.hexagon3, this.params3);
        this.updateLight();
        this.updateGUI();
      }
    }, "reset3").name("↻ Right");
  }

  updateGUI() {
    if (!this.gui) return;

    for (const folder of Object.values(this.gui.folders)) {
      for (const controller of folder.controllers) {
        controller.updateDisplay();
      }
      for (const subFolder of Object.values(folder.folders)) {
        for (const controller of subFolder.controllers) {
          controller.updateDisplay();
        }
      }
    }
  }

  dispose() {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }
}

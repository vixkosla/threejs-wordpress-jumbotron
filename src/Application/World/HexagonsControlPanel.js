import * as THREE from "three";
import GUI from "lil-gui";
import SettingsManager from "./SettingsManager.js";
import { DEFAULT_LIGHT_SETTINGS } from "./Config/HexagonPositions.js";

/**
 * Единая панель управления тремя шестиугольниками
 * Группировка: Орбиты | Свет | Сохранение
 */
export default class HexagonsControlPanel {
  constructor(hexagon1, hexagon2, hexagon3, position1, position2, position3, boundingBox) {
    this.hexagon1 = hexagon1;
    this.hexagon2 = hexagon2;
    this.hexagon3 = hexagon3;
    this.gui = null;
    this.settingsManager = new SettingsManager();

    // Флаг видимости маркеров (чёрные шарики) - по умолчанию ВЫКЛ
    this.showMarkers = false;
    
    // Флаг видимости хелперов (источники света) - по умолчанию ВЫКЛ
    this.showHelpers = false;

    // Вычисляем центр bounding box композиции
    this.rotationCenter = new THREE.Vector3();
    if (boundingBox) {
      boundingBox.getCenter(this.rotationCenter);
    } else {
      this.rotationCenter.set(0, 0, 0);
    }
    console.log('🎯 Центр вращения:', this.rotationCenter);

    // Загружаем дефолтные настройки из конфига
    const defaults = DEFAULT_LIGHT_SETTINGS;

    // Параметры для каждого шестиугольника (сферические координаты)
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
   * Вычислить параметры из позиции (сферические координаты)
   */
  updateParamsFromPosition(params, position) {
    const dx = position.x - this.rotationCenter.x;
    const dy = position.y - this.rotationCenter.y;
    const dz = position.z - this.rotationCenter.z;
    
    params.radius = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
    params.azimuth = Math.atan2(dz, dx) * (180 / Math.PI);
    const horizontalDist = Math.sqrt(dx ** 2 + dz ** 2);
    params.elevation = Math.atan2(dy, horizontalDist) * (180 / Math.PI);
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
   * Обновить позицию из сферических координат (вращение вокруг rotationCenter)
   */
  updatePosition(hexagon, params) {
    const azimuthRad = params.azimuth * (Math.PI / 180);
    const elevationRad = params.elevation * (Math.PI / 180);

    const x = this.rotationCenter.x + params.radius * Math.cos(elevationRad) * Math.cos(azimuthRad);
    const y = this.rotationCenter.y + params.radius * Math.sin(elevationRad);
    const z = this.rotationCenter.z + params.radius * Math.cos(elevationRad) * Math.sin(azimuthRad);

    hexagon.position.set(x, y, z);
    hexagon.group.position.set(x, y, z);
    hexagon.group.lookAt(this.rotationCenter);  // Смотрит в центр вращения!
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
   * Получить все текущие настройки (включая камеру)
   */
  getSettings() {
    // Получаем позицию камеры
    const cameraSettings = this.getCameraSettings();
    
    return {
      camera: cameraSettings,
      hexagon1: {
        radius: this.params1.radius,
        azimuth: this.params1.azimuth,
        elevation: this.params1.elevation,
        lightIntensity: this.params1.lightIntensity,
        backLightIntensity: this.params1.backLightIntensity,
        showMarker: this.params1.showMarker,
        showHelpers: this.params1.showHelpers,
      },
      hexagon2: {
        radius: this.params2.radius,
        azimuth: this.params2.azimuth,
        elevation: this.params2.elevation,
        lightIntensity: this.params2.lightIntensity,
        backLightIntensity: this.params2.backLightIntensity,
        showMarker: this.params2.showMarker,
        showHelpers: this.params2.showHelpers,
      },
      hexagon3: {
        radius: this.params3.radius,
        azimuth: this.params3.azimuth,
        elevation: this.params3.elevation,
        lightIntensity: this.params3.lightIntensity,
        backLightIntensity: this.params3.backLightIntensity,
        showMarker: this.params3.showMarker,
        showHelpers: this.params3.showHelpers,
      },
    };
  }

  /**
   * Получить текущие настройки камеры
   */
  getCameraSettings() {
    if (!window.APP_CAMERA || !window.APP_CONTROLS) {
      return {
        position: { x: 8, y: 3, z: -8 },
        target: { x: 0, y: 0, z: 0 },
      };
    }
    
    const camera = window.APP_CAMERA;
    const controls = window.APP_CONTROLS;
    
    return {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      target: {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z,
      },
    };
  }

  /**
   * Применить настройки (включая камеру)
   */
  applySettings(settings) {
    // Применяем настройки камеры
    if (settings.camera) {
      this.applyCameraSettings(settings.camera);
    }
    
    // Применяем настройки света
    if (settings.hexagon1) {
      this.params1.radius = settings.hexagon1.radius || this.params1.radius;
      this.params1.azimuth = settings.hexagon1.azimuth || this.params1.azimuth;
      this.params1.elevation = settings.hexagon1.elevation || this.params1.elevation;
      this.params1.lightIntensity = settings.hexagon1.lightIntensity || this.params1.lightIntensity;
      this.params1.backLightIntensity = settings.hexagon1.backLightIntensity || this.params1.backLightIntensity;
      this.params1.showMarker = settings.hexagon1.showMarker || false;
      this.params1.showHelpers = settings.hexagon1.showHelpers || false;
    }
    if (settings.hexagon2) {
      this.params2.radius = settings.hexagon2.radius || this.params2.radius;
      this.params2.azimuth = settings.hexagon2.azimuth || this.params2.azimuth;
      this.params2.elevation = settings.hexagon2.elevation || this.params2.elevation;
      this.params2.lightIntensity = settings.hexagon2.lightIntensity || this.params2.lightIntensity;
      this.params2.backLightIntensity = settings.hexagon2.backLightIntensity || this.params2.backLightIntensity;
      this.params2.showMarker = settings.hexagon2.showMarker || false;
      this.params2.showHelpers = settings.hexagon2.showHelpers || false;
    }
    if (settings.hexagon3) {
      this.params3.radius = settings.hexagon3.radius || this.params3.radius;
      this.params3.azimuth = settings.hexagon3.azimuth || this.params3.azimuth;
      this.params3.elevation = settings.hexagon3.elevation || this.params3.elevation;
      this.params3.lightIntensity = settings.hexagon3.lightIntensity || this.params3.lightIntensity;
      this.params3.backLightIntensity = settings.hexagon3.backLightIntensity || this.params3.backLightIntensity;
      this.params3.showMarker = settings.hexagon3.showMarker || false;
      this.params3.showHelpers = settings.hexagon3.showHelpers || false;
    }
    this.updatePositions();
    this.updateLight();
    this.updateGUI();
  }

  /**
   * Применить настройки камеры
   */
  applyCameraSettings(cameraSettings) {
    if (!window.APP_CAMERA || !window.APP_CONTROLS) {
      console.warn('⚠️ Камера или контролы не доступны');
      return;
    }
    
    const camera = window.APP_CAMERA;
    const controls = window.APP_CONTROLS;
    
    // Устанавливаем позицию камеры
    if (cameraSettings.position) {
      camera.position.set(
        cameraSettings.position.x,
        cameraSettings.position.y,
        cameraSettings.position.z
      );
      camera.updateProjectionMatrix();
    }
    
    // Устанавливаем target контролов
    if (cameraSettings.target) {
      controls.target.set(
        cameraSettings.target.x,
        cameraSettings.target.y,
        cameraSettings.target.z
      );
      controls.update();
    }
    
    console.log('📷 Камера установлена:', cameraSettings);
  }

  /**
   * Включить/выключить маркеры позиций (чёрные шарики)
   */
  toggleMarkers(visible) {
    if (this.hexagon1) {
      this.hexagon1.setMarkerVisible(visible);
    }
    if (this.hexagon2) {
      this.hexagon2.setMarkerVisible(visible);
    }
    if (this.hexagon3) {
      this.hexagon3.setMarkerVisible(visible);
    }
  }

  /**
   * Включить/выключить хелперы источников света
   */
  toggleHelpers(visible) {
    if (this.hexagon1) {
      this.hexagon1.setHelpersVisible(visible);
    }
    if (this.hexagon2) {
      this.hexagon2.setHelpersVisible(visible);
    }
    if (this.hexagon3) {
      this.hexagon3.setHelpersVisible(visible);
    }
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
      // Сбрасываем showMarker и showHelpers в false (скрыты по умолчанию)
      if (settings.hexagon1) {
        settings.hexagon1.showMarker = false;
        settings.hexagon1.showHelpers = false;
      }
      if (settings.hexagon2) {
        settings.hexagon2.showMarker = false;
        settings.hexagon2.showHelpers = false;
      }
      if (settings.hexagon3) {
        settings.hexagon3.showMarker = false;
        settings.hexagon3.showHelpers = false;
      }
      
      this.applySettings(settings);
      console.log('✅ Настройки загружены из localStorage');
    } else {
      // Если нет сохранения, используем дефолтные из конфига
      this.applySettings(DEFAULT_LIGHT_SETTINGS);
      console.log('✅ Применены настройки по умолчанию из конфига');
    }
  }

  setupGUI() {
    // Отключаем GUI на мобильных устройствах
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return;
    }

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
    
    // Кнопка для установки текущей позиции камеры как дефолтной
    folderSave.add({
      saveCamera: () => {
        const settings = this.getCameraSettings();
        console.log('📷 Текущая позиция камеры:', settings);
        console.log('💡 Скопируй эти значения в DEFAULT_LIGHT_SETTINGS.camera');
        alert(
          'Позиция камеры сохранена в консоль!\n\n' +
          'Скопируй эти значения в:\n' +
          'src/Application/World/Config/HexagonPositions.js\n' +
          'DEFAULT_LIGHT_SETTINGS.camera\n\n' +
          JSON.stringify(settings, null, 2)
        );
      }
    }, "saveCamera").name("📷 Сохранить камеру");

    // === ПЕРЕКЛЮЧАТЕЛЬ МАРКЕРОВ ===
    const folderOptions = this.gui.addFolder("⚙️ Опции");
    
    folderOptions.add(this, 'showMarkers')
      .name('🔴 Маркеры (шарики)')
      .onChange((value) => this.toggleMarkers(value));
    
    folderOptions.add(this, 'showHelpers')
      .name('🔷 Хелперы (свет)')
      .onChange((value) => this.toggleHelpers(value));

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

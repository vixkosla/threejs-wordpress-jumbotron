import * as THREE from "three";
import GUI from "lil-gui";

/**
 * GUI для управления орбитальным положением шестиугольника
 * Вращение по сфере с радиусом R
 */
export default class OrbitalHexagonGUI {
  constructor(hexagon, initialPosition) {
    this.hexagon = hexagon;
    this.gui = null;

    // Сферические координаты
    this.params = {
      radius: 12,                    // радиус орбиты
      azimuth: 0,                    // угол в XZ плоскости (0-360°)
      elevation: 0,                  // угол возвышения (-90° до 90°)
      lightIntensity: 15,            // сила света (синхронизировано с hexagon.params.intensity)
      backLightIntensity: 30,        // задний свет (синхронизировано с hexagon.params.addLightIntensity)
    };

    // Сохраняем начальную позицию
    this.initialPosition = initialPosition.clone();

    // Вычисляем начальные углы из позиции
    this.updateParamsFromPosition();

    // Синхронизируем интенсивность света
    this.params.lightIntensity = this.hexagon.params.intensity;
    this.params.backLightIntensity = this.hexagon.params.addLightIntensity;

    this.setupGUI();
    this.updatePosition();
  }

  /**
   * Вычислить параметры из текущей позиции
   */
  updateParamsFromPosition() {
    const pos = this.initialPosition;
    
    // Радиус
    this.params.radius = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    
    // Azimuth (угол в XZ плоскости)
    this.params.azimuth = Math.atan2(pos.z, pos.x) * (180 / Math.PI);
    
    // Elevation (угол возвышения от XZ плоскости)
    const horizontalDist = Math.sqrt(pos.x ** 2 + pos.z ** 2);
    this.params.elevation = Math.atan2(pos.y, horizontalDist) * (180 / Math.PI);
  }

  /**
   * Обновить позицию из сферических координат
   */
  updatePosition() {
    const azimuthRad = this.params.azimuth * (Math.PI / 180);
    const elevationRad = this.params.elevation * (Math.PI / 180);

    // Сферические → Декартовы
    const x = this.params.radius * Math.cos(elevationRad) * Math.cos(azimuthRad);
    const y = this.params.radius * Math.sin(elevationRad);
    const z = this.params.radius * Math.cos(elevationRad) * Math.sin(azimuthRad);

    // Обновляем позицию шестиугольника
    this.hexagon.position.set(x, y, z);
    this.hexagon.group.position.set(x, y, z);
    this.hexagon.group.lookAt(0, 0, 0);
  }

  /**
   * Обновить интенсивность света
   */
  updateLight() {
    this.hexagon.params.intensity = this.params.lightIntensity;
    this.hexagon.params.addLightIntensity = this.params.backLightIntensity;
    this.hexagon.updateFromParams();
  }

  /**
   * Быстрая установка позиции по углу (4 декарты)
   */
  setQuickPosition(decart) {
    switch (decart) {
      case 1: // Перед-справа
        this.params.azimuth = 45;
        break;
      case 2: // Перед-слева
        this.params.azimuth = 135;
        break;
      case 3: // Зад-слева
        this.params.azimuth = -135;
        break;
      case 4: // Зад-справа
        this.params.azimuth = -45;
        break;
    }
    this.updatePosition();
    this.updateGUI();
  }

  setupGUI() {
    this.gui = new GUI({ title: "Hexagon Orbit (Left)" });

    const folderOrbit = this.gui.addFolder("Орбита");
    
    folderOrbit.add(this.params, "radius", 5, 30, 0.5)
      .name("Радиус (R)")
      .onChange(() => this.updatePosition());

    folderOrbit.add(this.params, "azimuth", -180, 180, 0.5)
      .name("Azimuth (°)")
      .onChange(() => this.updatePosition());

    folderOrbit.add(this.params, "elevation", -90, 90, 0.5)
      .name("Elevation (°)")
      .onChange(() => this.updatePosition());

    // Интенсивность света
    const folderLight = this.gui.addFolder("Свет шестиугольника");
    
    folderLight.add(this.params, "lightIntensity", 0, 30, 0.5)
      .name("RectArea Intensity")
      .onChange(() => this.updateLight());
    
    folderLight.add(this.params, "backLightIntensity", 0, 50, 1)
      .name("Back Light Intensity")
      .onChange(() => this.updateLight());

    // Кнопки быстрых позиций (4 декарты)
    const folderQuick = this.gui.addFolder("Быстро (4 декарты)");
    
    const quickPositions = {
      "Перед-Справа (45°)": () => this.setQuickPosition(1),
      "Перед-Слева (135°)": () => this.setQuickPosition(2),
      "Зад-Слева (-135°)": () => this.setQuickPosition(3),
      "Зад-Справа (-45°)": () => this.setQuickPosition(4),
      "Слева (90°)": () => {
        this.params.azimuth = 90;
        this.updatePosition();
        this.updateGUI();
      },
      "Справа (-90°)": () => {
        this.params.azimuth = -90;
        this.updatePosition();
        this.updateGUI();
      },
      "Сзади (180°)": () => {
        this.params.azimuth = 180;
        this.updatePosition();
        this.updateGUI();
      },
      "Спереди (0°)": () => {
        this.params.azimuth = 0;
        this.updatePosition();
        this.updateGUI();
      },
    };

    for (const [name, fn] of Object.entries(quickPositions)) {
      folderQuick.add({ [name]: fn }, name).name(name);
    }

    // Кнопка сброса
    this.gui.add({ 
      reset: () => {
        this.updateParamsFromPosition();
        this.params.lightIntensity = this.hexagon.params.intensity;
        this.params.backLightIntensity = this.hexagon.params.addLightIntensity;
        this.updatePosition();
        this.updateGUI();
      }
    }, "reset").name("↻ Сбросить");
  }

  updateGUI() {
    if (!this.gui) return;

    for (const controller of this.gui.controllers) {
      controller.updateDisplay();
    }
    for (const folder of Object.values(this.gui.folders)) {
      for (const controller of folder.controllers) {
        controller.updateDisplay();
      }
    }
  }

  /**
   * Получить текущие координаты (для экспорта в конфиг)
   */
  getPosition() {
    return {
      x: this.hexagon.position.x,
      y: this.hexagon.position.y,
      z: this.hexagon.position.z,
    };
  }

  /**
   * Получить текущие параметры света (для сохранения в конфиг)
   */
  getLightParams() {
    return {
      intensity: this.params.lightIntensity,
      backLightIntensity: this.params.backLightIntensity,
    };
  }

  dispose() {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }
}

import * as THREE from "three";
import GUI from "lil-gui";

/**
 * Единая панель управления обоими шестиугольниками
 * Группировка: Орбиты | Свет | Быстрые позиции
 */
export default class HexagonsControlPanel {
  constructor(hexagonFront, hexagonLeft, positionFront, positionLeft) {
    this.hexagonFront = hexagonFront;
    this.hexagonLeft = hexagonLeft;
    this.gui = null;

    // Параметры для Front шестиугольника
    this.frontParams = {
      radius: 4,
      azimuth: 0,
      elevation: 0,
      lightIntensity: 7.5,
      backLightIntensity: 15,
    };

    // Параметры для Left шестиугольника
    this.leftParams = {
      radius: 12,
      azimuth: 0,
      elevation: 0,
      lightIntensity: 7.5,
      backLightIntensity: 15,
    };

    // Вычисляем начальные углы из позиций
    this.updateParamsFromPosition(this.frontParams, positionFront);
    this.updateParamsFromPosition(this.leftParams, positionLeft);

    // Синхронизируем интенсивность
    this.frontParams.lightIntensity = this.hexagonFront.params.intensity / 2;
    this.frontParams.backLightIntensity = this.hexagonFront.params.addLightIntensity;
    this.leftParams.lightIntensity = this.hexagonLeft.params.intensity / 2;
    this.leftParams.backLightIntensity = this.hexagonLeft.params.addLightIntensity;

    this.setupGUI();
    this.updatePositions();
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
   * Обновить позиции обоих шестиугольников
   */
  updatePositions() {
    this.updatePosition(this.hexagonFront, this.frontParams);
    this.updatePosition(this.hexagonLeft, this.leftParams);
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
  }

  /**
   * Обновить интенсивность света
   */
  updateLight() {
    this.hexagonFront.params.intensity = this.frontParams.lightIntensity * 2;
    this.hexagonFront.params.addLightIntensity = this.frontParams.backLightIntensity;
    this.hexagonFront.updateFromParams();

    this.hexagonLeft.params.intensity = this.leftParams.lightIntensity * 2;
    this.hexagonLeft.params.addLightIntensity = this.leftParams.backLightIntensity;
    this.hexagonLeft.updateFromParams();
  }

  setupGUI() {
    this.gui = new GUI({ title: "🔷 Hexagons Control", width: 320 });

    // === ПАПКА 1: ОРБИТЫ (одновременно оба) ===
    const folderOrbits = this.gui.addFolder("🌍 Орбиты (оба шестиугольника)");

    // Front шестиугольник
    const folderFrontOrbit = folderOrbits.addFolder("Front (ближний)");
    folderFrontOrbit.add(this.frontParams, "radius", 1, 15, 0.5)
      .name("Радиус")
      .onChange(() => this.updatePosition(this.hexagonFront, this.frontParams));
    folderFrontOrbit.add(this.frontParams, "azimuth", -180, 180, 0.5)
      .name("Azimuth °")
      .onChange(() => this.updatePosition(this.hexagonFront, this.frontParams));
    folderFrontOrbit.add(this.frontParams, "elevation", -90, 90, 0.5)
      .name("Elevation °")
      .onChange(() => this.updatePosition(this.hexagonFront, this.frontParams));

    // Left шестиугольник
    const folderLeftOrbit = folderOrbits.addFolder("Left (дальний)");
    folderLeftOrbit.add(this.leftParams, "radius", 1, 30, 0.5)
      .name("Радиус")
      .onChange(() => this.updatePosition(this.hexagonLeft, this.leftParams));
    folderLeftOrbit.add(this.leftParams, "azimuth", -180, 180, 0.5)
      .name("Azimuth °")
      .onChange(() => this.updatePosition(this.hexagonLeft, this.leftParams));
    folderLeftOrbit.add(this.leftParams, "elevation", -90, 90, 0.5)
      .name("Elevation °")
      .onChange(() => this.updatePosition(this.hexagonLeft, this.leftParams));

    // === ПАПКА 2: ИНТЕНСИВНОСТЬ СВЕТА ===
    const folderLight = this.gui.addFolder("💡 Интенсивность света");

    const folderFrontLight = folderLight.addFolder("Front (ближний)");
    folderFrontLight.add(this.frontParams, "lightIntensity", 0, 30, 0.5)
      .name("RectArea")
      .onChange(() => this.updateLight());
    folderFrontLight.add(this.frontParams, "backLightIntensity", 0, 50, 1)
      .name("Back Light")
      .onChange(() => this.updateLight());

    const folderLeftLight = folderLight.addFolder("Left (дальний)");
    folderLeftLight.add(this.leftParams, "lightIntensity", 0, 30, 0.5)
      .name("RectArea")
      .onChange(() => this.updateLight());
    folderLeftLight.add(this.leftParams, "backLightIntensity", 0, 50, 1)
      .name("Back Light")
      .onChange(() => this.updateLight());

    // === КНОПКИ СБРОСА ===
    const folderReset = this.gui.addFolder("⚙️ Сброс");
    folderReset.add({
      "Сбросить Front": () => {
        this.updateParamsFromPosition(this.frontParams, new THREE.Vector3(-4, -1.5, 4));
        this.frontParams.lightIntensity = 7.5;
        this.frontParams.backLightIntensity = 15;
        this.updatePosition(this.hexagonFront, this.frontParams);
        this.updateLight();
        this.updateGUI();
      }
    }, "Сбросить Front").name("↻ Front");

    folderReset.add({
      "Сбросить Left": () => {
        this.updateParamsFromPosition(this.leftParams, new THREE.Vector3(8, -3, 8));
        this.leftParams.lightIntensity = 7.5;
        this.leftParams.backLightIntensity = 15;
        this.updatePosition(this.hexagonLeft, this.leftParams);
        this.updateLight();
        this.updateGUI();
      }
    }, "Сбросить Left").name("↻ Left");
  }

  updateGUI() {
    if (!this.gui) return;

    for (const folder of Object.values(this.gui.folders)) {
      for (const controller of folder.controllers) {
        controller.updateDisplay();
      }
      // Вложенные папки
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

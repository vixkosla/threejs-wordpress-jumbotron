import * as THREE from "three";
import GUI from "lil-gui";

/**
 * Шестиугольник-подсветка сзади сцены
 * Работает как источник света для transmission-материалов
 * Использует RectAreaLight + MeshBasicMaterial (белый шестиугольник)
 */
export default class BacklightHexagon {
  constructor(scene, debug = true) {
    this.scene = scene;
    this.debug = debug;
    this.gui = null;

    // Параметры света
    this.params = {
      intensity: 15,           // сила света RectAreaLight
      hexagonOpacity: 1.0,     // непрозрачность шестиугольника
      visible: true,           // показывать ли шестиугольник
      lightVisible: true,      // показывать ли helper света
    };

    // Позиция: напротив камеры, за сценой
    // Камера смотрит на (0,0,0), шестиугольник будет с противоположной стороны
    this.position = new THREE.Vector3(-15, 0, 15);
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);

    // Создаём шестиугольник
    this.hexagonMesh = this.createHexagon();
    this.scene.add(this.hexagonMesh);

    // Создаём RectAreaLight (направленный свет)
    this.rectLight = this.createRectAreaLight();
    this.scene.add(this.rectLight);

    // Helper для визуализации света
    this.lightHelper = new THREE.RectAreaLightHelper(this.rectLight);
    this.hexagonMesh.add(this.lightHelper);

    if (this.debug) {
      this.setupGUI();
    }
  }

  createHexagon() {
    // Шестиугольник через RingGeometry или CylinderGeometry
    const radius = 8;
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 6);
    
    // Поворачиваем чтобы стоял на углу (вершиной вверх)
    geometry.rotateZ(Math.PI / 6); // 30 градусов - поворот на вершину
    geometry.rotateY(Math.PI / 4); // поворот к камере

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.params.hexagonOpacity,
      side: THREE.DoubleSide,
    });

    const hexagon = new THREE.Mesh(geometry, material);
    hexagon.position.copy(this.position);
    hexagon.lookAt(this.lookAtTarget);

    return hexagon;
  }

  createRectAreaLight() {
    const width = 12;
    const height = 12;
    const intensity = this.params.intensity;

    const light = new THREE.RectAreaLight(0xffffff, intensity, width, height);
    light.position.copy(this.position);
    light.lookAt(this.lookAtTarget);

    return light;
  }

  /**
   * Обновить настройки света
   */
  updateFromParams() {
    this.rectLight.intensity = this.params.intensity;
    this.hexagonMesh.material.opacity = this.params.hexagonOpacity;
    this.hexagonMesh.visible = this.params.visible;
    this.lightHelper.visible = this.params.lightVisible;
  }

  /**
   * Настроить GUI
   */
  setupGUI() {
    this.gui = new GUI({ title: "Backlight Hexagon" });

    const folderLight = this.gui.addFolder("Свет");
    folderLight.add(this.params, "intensity", 0, 50, 0.5)
      .name("Intensity")
      .onChange(() => this.updateFromParams());
    folderLight.add(this.params, "lightVisible")
      .name("Показать Helper")
      .onChange(() => this.updateFromParams());

    const folderHex = this.gui.addFolder("Шестиугольник");
    folderHex.add(this.params, "hexagonOpacity", 0, 1, 0.05)
      .name("Opacity")
      .onChange(() => this.updateFromParams());
    folderHex.add(this.params, "visible")
      .name("Видимый")
      .onChange(() => this.updateFromParams());

    // Кнопка сброса
    this.gui.add({ reset: () => this.resetParams() }, "reset")
      .name("↻ Сбросить");
  }

  resetParams() {
    this.params = {
      intensity: 15,
      hexagonOpacity: 1.0,
      visible: true,
      lightVisible: true,
    };
    this.updateFromParams();
    if (this.gui) {
      // Обновить значения в GUI
      for (const controller of this.gui.controllers) {
        controller.updateDisplay();
      }
      for (const folder of Object.values(this.gui.folders)) {
        for (const controller of folder.controllers) {
          controller.updateDisplay();
        }
      }
    }
  }

  /**
   * Очистка ресурсов
   */
  dispose() {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }

    if (this.hexagonMesh) {
      this.hexagonMesh.geometry.dispose();
      this.hexagonMesh.material.dispose();
      this.scene.remove(this.hexagonMesh);
    }

    if (this.rectLight) {
      this.scene.remove(this.rectLight);
    }

    if (this.lightHelper) {
      this.hexagonMesh.remove(this.lightHelper);
    }
  }
}

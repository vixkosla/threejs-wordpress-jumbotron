import * as THREE from "three";
import GUI from "lil-gui";

/**
 * Шестиугольник-подсветка сзади сцены
 * Работает как источник света для transmission-материалов
 * Использует RectAreaLight + белый MeshBasicMaterial (визуальный шестиугольник)
 */
export default class BacklightHexagon {
  constructor(scene) {
    this.scene = scene;
    this.gui = null;

    // Параметры света
    this.params = {
      intensity: 15,           // сила света RectAreaLight
      hexagonOpacity: 1.0,     // непрозрачность шестиугольника
      hexagonVisible: true,    // показывать ли шестиугольник
    };

    // Позиция: напротив камеры, за сценой
    // Камера на (0, 0, 25) смотрит на (0,0,0)
    // Шестиугольник ставим сзади на (0, 0, -20)
    this.position = new THREE.Vector3(0, 0, -20);
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);

    // Группа для шестиугольника и света
    this.group = new THREE.Group();

    // Создаём шестиугольник (визуальная часть)
    this.hexagonMesh = this.createHexagon();
    this.group.add(this.hexagonMesh);

    // Создаём RectAreaLight (источник света)
    this.rectLight = this.createRectAreaLight();
    this.group.add(this.rectLight);

    // Helper для визуализации RectAreaLight (отладка)
    // Создаётся через addRectAreaLightHelper из examples
    this.lightHelper = null;

    this.group.position.copy(this.position);
    this.group.lookAt(this.lookAtTarget);

    this.scene.add(this.group);
    this.setupGUI();
  }

  createHexagon() {
    // Шестиугольник через CylinderGeometry с 6 сегментами
    const radius = 8;
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 6);
    
    // Поворачиваем чтобы стоял на углу (вершиной вверх)
    // CylinderGeometry по умолчанию лежит на боку, нужно повернуть
    geometry.rotateX(Math.PI / 2); // кладём на XY плоскость
    geometry.rotateZ(Math.PI / 6); // 30 градусов - поворот на вершину

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.params.hexagonOpacity,
      side: THREE.DoubleSide,
    });

    const hexagon = new THREE.Mesh(geometry, material);
    return hexagon;
  }

  createRectAreaLight() {
    const width = 14;
    const height = 14;
    const intensity = this.params.intensity;

    const light = new THREE.RectAreaLight(0xffffff, intensity, width, height);
    // Свет уже внутри группы, которая смотрит на (0,0,0)
    // Просто ставим его чуть впереди шестиугольника (в сторону сцены)
    light.position.set(0, 0, 0.5);
    light.lookAt(0, 0, -1); // Светит в сторону камеры/сцены

    return light;
  }

  /**
   * Обновить настройки света
   */
  updateFromParams() {
    this.rectLight.intensity = this.params.intensity;
    this.hexagonMesh.material.opacity = this.params.hexagonOpacity;
    this.hexagonMesh.visible = this.params.hexagonVisible;
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

    const folderHex = this.gui.addFolder("Шестиугольник");
    folderHex.add(this.params, "hexagonOpacity", 0, 1, 0.05)
      .name("Opacity")
      .onChange(() => this.updateFromParams());
    folderHex.add(this.params, "hexagonVisible")
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
      hexagonVisible: true,
    };
    this.updateFromParams();
    if (this.gui) {
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
    }

    if (this.group) {
      this.scene.remove(this.group);
    }
  }
}

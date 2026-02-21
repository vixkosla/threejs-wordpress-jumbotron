import * as THREE from "three";
import GUI from "lil-gui";

/**
 * Шестиугольник-подсветка сзади сцены
 * Работает как источник света для transmission-материалов
 * Использует RectAreaLight + белый MeshBasicMaterial (визуальный шестиугольник)
 *
 * Позиция: зеркально камере относительно (0,0,0)
 * Размер: рассчитывается от bounding box композиции
 */
export default class BacklightHexagon {
  constructor(scene, boundingBox) {
    this.scene = scene;
    this.gui = null;

    // Параметры света
    this.params = {
      intensity: 0.5,          // сила света RectAreaLight (очень мягкий свет)
      hexagonOpacity: 1.0,     // непрозрачность шестиугольника
      hexagonVisible: true,    // показывать ли шестиугольник
    };

    // Позиция: зеркально камере (камера на (0, 0, 25) → шестиугольник на (0, 0, -25))
    this.position = new THREE.Vector3(0, 0, -25);
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);

    // Рассчитываем размер шестиугольника от bounding box
    this.hexagonSize = this.calculateHexagonSize(boundingBox);

    // Группа для шестиугольника и света
    this.group = new THREE.Group();

    // Создаём шестиугольник (визуальная часть)
    this.hexagonMesh = this.createHexagon();
    this.group.add(this.hexagonMesh);

    // Создаём RectAreaLight (источник света)
    this.rectLight = this.createRectAreaLight();
    this.group.add(this.rectLight);

    this.group.position.copy(this.position);
    this.group.lookAt(this.lookAtTarget);

    this.scene.add(this.group);
    this.setupGUI();
  }

  /**
   * Рассчитать размер шестиугольника от bounding box композиции
   * Размер = половина bounding box + запас на перспективу
   */
  calculateHexagonSize(boundingBox) {
    if (!boundingBox) {
      return { width: 4, height: 4, radius: 2 }; // дефолтный размер
    }

    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // Берём максимальный размер по X и Y
    const maxSize = Math.max(size.x, size.y);

    // Шестиугольник в 2 раза меньше bounding box
    const hexRadius = (maxSize / 2) * 0.5;

    return {
      width: hexRadius * 2,
      height: hexRadius * 2,
      radius: hexRadius
    };
  }

  createHexagon() {
    // Шестиугольник через CylinderGeometry с 6 сегментами
    const geometry = new THREE.CylinderGeometry(
      this.hexagonSize.radius,
      this.hexagonSize.radius,
      0.1,
      6
    );

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
    const intensity = this.params.intensity;

    const light = new THREE.RectAreaLight(
      0xffffff,
      intensity,
      this.hexagonSize.width,
      this.hexagonSize.height
    );
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

    const folderLight = this.gui.addFolder("Backlight");
    folderLight.add(this.params, "intensity", 0, 2, 0.05)
      .name("Intensity")
      .onChange(() => this.updateFromParams());

    const folderHex = this.gui.addFolder("Hexagon");
    folderHex.add(this.params, "hexagonOpacity", 0, 1, 0.05)
      .name("Opacity")
      .onChange(() => this.updateFromParams());
    folderHex.add(this.params, "hexagonVisible")
      .name("Visible")
      .onChange(() => this.updateFromParams());

    // Кнопка сброса
    this.gui.add({ reset: () => this.resetParams() }, "reset")
      .name("↻ Reset");
  }

  resetParams() {
    this.params = {
      intensity: 0.5,
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

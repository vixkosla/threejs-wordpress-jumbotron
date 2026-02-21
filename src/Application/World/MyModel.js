import * as THREE from "three";
import GMaterial, { G_COLORS } from "./Materials/GMaterial.js";
import TMaterial from "./Materials/TMaterial.js";

const ginformation = [
  {
    position: [-2.0, 1, 0.5],
    rotation: [0, Math.PI, 0],
  },
  {
    position: [-0.5, 2, 2],
    rotation: [-Math.PI / 2, Math.PI / 2, 0],
  },
  {
    position: [0, 0.5, 2],
    rotation: [-Math.PI / 2, Math.PI, 0],
  },
  {
    position: [-2, 2.5, 1],
    rotation: [-Math.PI / 2, 2 * Math.PI, -Math.PI / 2],
  },
  {
    position: [-2, 2.5, 2.5],
    rotation: [Math.PI / 2, 0, Math.PI],
  },
  {
    position: [-3, 1, 1],
    rotation: [-Math.PI / 2, Math.PI / 2, -2 * Math.PI],
  },
];

const tinformation = [
  {
    position: [-0.5, 1.5, 1.0],
    rotation: [0, -Math.PI / 2, Math.PI / 2],
  },
];

export default class MyModel {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false; // Флаг для анимации

    this.meshes = [];
    this.group = new THREE.Object3D();
    // Передаём scene для работы GUI
    this.gMaterial = new GMaterial(scene, true);
    this.tMaterial = new TMaterial();

    this.composeCube();
    this.translateBlocks();
  }

  composeCube() {
    ginformation.forEach((info, index) => {
      const g = this.initGMesh();
      g.position.set(...info.position);
      g.rotation.set(...info.rotation);
      g.scale.set(0.8, 0.8, 0.8);
      this.meshes.push(g);
      this.group.add(g);
      this.scene.add(g);
    });

    tinformation.forEach((info) => {
      const t = this.initTMesh();
      t.position.set(...info.position);
      t.rotation.set(...info.rotation);
      t.scale.set(0.85, 0.85, 0.85);
      this.scene.add(t);
    });
  }

  translateBlocks() {
    this.scene.traverse((child) => {
      if (child.isMesh) {
        const y = child.position.y;

        const delta = -1.75;

        child.position.setY(y + delta);
      }
    });
  }

  initGMesh() {
    const shape = new THREE.Shape();

    // Параметры
    const width = 2; // Общая ширина
    const height = 2; // Общая высота
    const thickness = 1; // Толщина линий

    // Рисуем контур буквы Г
    shape.moveTo(-width / 2, 0); // Начало (низ слева)
    shape.lineTo(-width / 2, height); // Вверх
    shape.lineTo(-width / 2 + thickness, height); // Вправо (верхняя грань)
    shape.lineTo(-width / 2 + thickness, thickness); // Вниз (внутренний угол)
    shape.lineTo(width / 2, thickness); // Вправо (низ перекладины)
    shape.lineTo(width / 2, 0); // Вниз
    shape.lineTo(-width / 2, 0); // Замыкаем

    const extrudeSettings = {
      depth: 1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 3,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    // Клонируем материал и задаём случайный цвет из палитры
    const baseMaterial = this.gMaterial.get();
    const material = baseMaterial.clone();
    material.color.set(this.gMaterial.getRandomColor());

    const letterG = new THREE.Mesh(geometry, material);
    letterG.scale.set(1.0, 1.0, 1.0);

    return letterG;
  }

  initTMesh() {
    // 1. Создаём 2D-форму буквы Т
    const shape = new THREE.Shape();

    // Параметры
    const width = 3; // Ширина перекладины
    const height = 2; // Общая высота
    const thickness = 1; // Толщина линий

    // Рисуем ТОЛЬКО внешний контур (против часовой стрелки)
    // Правильный контур буквы Т (против часовой стрелки)
    shape.moveTo(-width / 2, height - thickness); // 1. Левый нижний угол перекладины
    shape.lineTo(-width / 2, height); // 2. Левый верх
    shape.lineTo(width / 2, height); // 3. Правый верх
    shape.lineTo(width / 2, height - thickness); // 4. Правый низ перекладины
    shape.lineTo(thickness / 2, height - thickness); // 5. Влево к правой стороне ножки
    shape.lineTo(thickness / 2, 0); // 6. Вниз по правой стороне ножки
    shape.lineTo(-thickness / 2, 0); // 7. Низ ножки (влево)
    shape.lineTo(-thickness / 2, height - thickness); // 8. Вверх по левой стороне ножки
    shape.lineTo(-width / 2, height - thickness); // 9. Влево к началу (замыкаем)

    // 2. Настройки выдавливания
    const extrudeSettings = {
      depth: 1, // Глубина (толщина по Z)
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 3,
    };

    // 3. Создаём геометрию
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 4. Центрируем геометрию (опционально)
    geometry.center();

    // 5. Создаём меш
    const material = this.tMaterial.get();
    const letterT = new THREE.Mesh(geometry, material);

    letterT.castShadow = true;

    return letterT;
  }

  // Событие: Анимация прыжка/действия
  triggerAction() {
    this.isActive = true;
    // Пример простой анимации (или запуска AnimationMixer для модели)
    // Сбросим через время
    setTimeout(() => {
      this.isActive = false;
      // this.mesh.scale.set(1, 1, 1)
    }, 500);
  }

  // Вызывается каждый кадр
  update(time) {
    // Базовая idle анимация
    // this.mesh.rotation.y = time * 0.5;
    // this.mesh.rotation.x = time * 0.2;

    // Логика "событийной" анимации
    if (this.isActive) {
      // this.mesh.scale.set(1.5, 1.5, 1.5); // Пример реакции
    }
  }

  /**
   * Получить bounding box всей композиции
   * @returns {THREE.Box3|null}
   */
  getBoundingBox() {
    const box = new THREE.Box3();
    let hasObjects = false;

    // Собираем bounding box со всех мешей
    for (const mesh of this.meshes) {
      if (mesh.geometry) {
        const meshBox = new THREE.Box3().setFromObject(mesh);
        box.union(meshBox);
        hasObjects = true;
      }
    }

    // Добавляем T-меш из сцены
    this.scene.traverse((child) => {
      if (child.isMesh && child.geometry && child.material.color?.equals(new THREE.Color(0x00ff00))) {
        const meshBox = new THREE.Box3().setFromObject(child);
        box.union(meshBox);
        hasObjects = true;
      }
    });

    return hasObjects ? box : null;
  }
}

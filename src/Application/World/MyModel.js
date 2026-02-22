import * as THREE from "three";
import GMaterial from "./Materials/GMaterial.js";

// Цвета для блоков (мягкие, полупрозрачные оттенки)
const COLOR_PURPLE = 0xb8b8ff; // лёгкий фиолетово-синий
const COLOR_LIME = 0xa3e635;    // мягкий салатовый
const COLOR_GLASS = 0xf8f9fa;   // стеклянный белый

// Нумерация блоков (вид сверху, слева направо):
// Верхний слой (y=2.5):
//   1. [-2, 2.5, 1] - самый верхний слева - СИНЕ-ФИОЛЕТОВЫЙ
//   2. [-2, 2.5, 2.5] - следующий верхний - САЛАТОВЫЙ
// Средний/нижний слой:
//   3. [-2.0, 1, 0.5] - левый нижний - СИНЕ-ФИОЛЕТОВЫЙ
//   4. [-0.5, 2, 2] - центральный верхний - белый
//   5. [0, 0.5, 2] - центральный нижний - белый
//   6. [-3, 1, 1] - левый дальний - белый
// T-блок: [-0.5, 1.5, 1.0] - центральный (основной) - белый
//
// Векторы отталкивания (2D проекция, вид с камеры):
// Все 6 блоков участвуют в гидравлической волне:
//   0. [-2.0, 1, 0.5] - влево-вверх (-1, 0.3)
//   1. [-0.5, 2, 2] - вверх-вправо (0.5, 1)
//   2. [0, 0.5, 2] - влево-вниз (-0.5, -0.5)
//   3. [-2, 2.5, 1] - вверх (0, 1)
//   4. [-2, 2.5, 2.5] - вправо-вверх (0.5, 0.5)
//   5. [-3, 1, 1] - влево (-1, 0)

const ginformation = [
  {
    position: [-2.0, 1, 0.5],
    rotation: [0, Math.PI, 0],
    color: COLOR_PURPLE,  // левый нижний - сине-фиолетовый
  },
  {
    position: [-0.5, 2, 2],
    rotation: [-Math.PI / 2, Math.PI / 2, 0],
    color: COLOR_GLASS,  // центральный верхний - белый
  },
  {
    position: [0, 0.5, 2],
    rotation: [-Math.PI / 2, Math.PI, 0],
    color: COLOR_GLASS,  // центральный нижний - белый
  },
  {
    position: [-2, 2.5, 1],
    rotation: [-Math.PI / 2, 2 * Math.PI, -Math.PI / 2],
    color: COLOR_PURPLE,  // самый верхний слева - сине-фиолетовый
  },
  {
    position: [-2, 2.5, 2.5],
    rotation: [Math.PI / 2, 0, Math.PI],
    color: COLOR_LIME,  // следующий верхний - салатовый
  },
  {
    position: [-3, 1, 1],
    rotation: [-Math.PI / 2, Math.PI / 2, -2 * Math.PI],
    color: COLOR_GLASS,  // левый дальний - белый
  },
];

const tinformation = [
  {
    position: [-0.5, 1.5, 1.0],
    rotation: [0, -Math.PI / 2, Math.PI / 2],
    color: COLOR_GLASS,  // T-блок - стеклянный белый (центральный)
  },
];

export default class MyModel {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false; // Флаг для анимации

    this.meshes = [];
    this.group = new THREE.Object3D();
    this.gMaterial = new GMaterial(scene);

    // Позиция мыши (нормализованная от -1 до 1)
    this.mouse = new THREE.Vector2(0, 0);
    this.prevMouse = new THREE.Vector2(0, 0);
    
    // Дельта движения мыши
    this.mouseDelta = new THREE.Vector2(0, 0);
    
    // Векторы направления для каждого блока
    this.pushVectors = [
      new THREE.Vector3(-1, 0.3, 0),   // 0: левый нижний - влево-вверх
      new THREE.Vector3(0.5, 1, 0),    // 1: центральный верхний - вверх-вправо
      new THREE.Vector3(-0.5, -0.5, 0),// 2: центральный нижний - влево-вниз
      new THREE.Vector3(0, 1, 0),      // 3: самый верхний слева - вверх
      new THREE.Vector3(0.5, 0.5, 0),  // 4: следующий верхний - вправо-вверх
      new THREE.Vector3(-1, 0, 0),     // 5: левый дальний - влево
    ];
    
    // Параметры анимации (как в r3f-rapier-ball-of-glass)
    this.ease = 0.08;        // Скорость интерполяции (плавно)
    this.friction = 0.03;    // Затухание (инерция, плавно)

    // Множитель амплитуды (4x для плавности)
    this.amplitudeMultiplier = 4;
    
    // Мёртвая зона мыши (чувствительно)
    this.deadZone = 0.05;
    
    // Stagger задержка для каждого блока (плавная, небольшая)
    this.staggerDelays = [0, 0.05, 0.1, 0.15, 0.2, 0.25];

    // Для каждого блока: target (накапливает) и current (текущее)
    this.blockTargets = [];
    this.blockCurrents = [];

    // Инициализация
    for (let i = 0; i < 6; i++) {
      this.blockTargets.push(new THREE.Vector3(0, 0, 0));
      this.blockCurrents.push(new THREE.Vector3(0, 0, 0));
    }
    
    // Для stagger анимации
    this.staggerCurrents = [0, 0, 0, 0, 0, 0]; // Текущая задержка для каждого блока

    // Ограничения амплитуды (чтобы блоки не проходили сквозь друг друга)
    this.minOffset = -1.0;  // Минимальное смещение
    this.maxOffset = 1.5;   // Максимальное смещение
    
    // Смещение в покое (опускаем все блоки)
    this.restOffset = new THREE.Vector3(0, -2, 0);

    this.composeCube();
    
    // Сохраняем оригинальные позиции ДО translateBlocks
    this.originalPositions = this.meshes.map(mesh => mesh.position.clone());
    
    this.translateBlocks();
  }

  /**
   * Обновить позицию мыши и вычислить дельту
   */
  updateMousePosition(mouse) {
    // Сохраняем предыдущую
    this.prevMouse.copy(this.mouse);
    
    // Обновляем текущую
    this.mouse.copy(mouse);
    
    // Вычисляем дельту (как useMouseMoveDelta)
    this.mouseDelta.x = this.mouse.x - this.prevMouse.x;
    this.mouseDelta.y = this.mouse.y - this.prevMouse.y;
    
    // Применяем мёртвую зону (5% от центра для чувствительности)
    if (Math.abs(this.mouseDelta.x) < this.deadZone) this.mouseDelta.x = 0;
    if (Math.abs(this.mouseDelta.y) < this.deadZone) this.mouseDelta.y = 0;
    
    // Если есть движение — сбрасываем stagger
    if (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0) {
      this.staggerCurrents = [0, 0, 0, 0, 0, 0];
    }
    
    // Накпливаем target для каждого блока
    for (let i = 0; i < 6; i++) {
      const pushVector = this.pushVectors[i];
      if (pushVector && pushVector.length() > 0) {
        // Скалярное произведение дельты на вектор направления
        const deltaDotVector = 
          this.mouseDelta.x * pushVector.x + 
          this.mouseDelta.y * pushVector.y;
        
        // Накпливаем target
        this.blockTargets[i].x += pushVector.x * deltaDotVector;
        this.blockTargets[i].y += pushVector.y * deltaDotVector;
        this.blockTargets[i].z += pushVector.z * deltaDotVector;
      }
    }
  }

  composeCube() {
    ginformation.forEach((info, index) => {
      const g = this.initGMesh(info.color);
      g.position.set(...info.position);
      g.rotation.set(...info.rotation);
      g.scale.set(0.8, 0.8, 0.8);
      
      this.meshes.push(g);
      this.group.add(g);
      this.scene.add(g);
    });

    tinformation.forEach((info) => {
      const t = this.initTMesh(info.color);
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

  initGMesh(color = COLOR_GLASS) {
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

    // Клонируем материал и задаём цвет (через cloneWithColor для обновления)
    const material = this.gMaterial.cloneWithColor(color);

    const letterG = new THREE.Mesh(geometry, material);
    letterG.scale.set(1.0, 1.0, 1.0);

    return letterG;
  }

  initTMesh(color = COLOR_GLASS) {
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

    // 5. Создаём меш с transmission материалом (через cloneWithColor для обновления)
    const material = this.gMaterial.cloneWithColor(color);
    
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
    // Плавная интерполяция как в useAnimatableVec3 со stagger эффектом
    for (let i = 0; i < 6; i++) {
      const target = this.blockTargets[i];
      const current = this.blockCurrents[i];
      
      // Stagger: обновляем задержку
      const staggerDelay = this.staggerDelays[i];
      this.staggerCurrents[i] += 0.016; // ~60 FPS
      
      // Применяем затухание только если stagger активирован
      const staggerActive = this.staggerCurrents[i] >= staggerDelay;
      
      if (staggerActive) {
        // Затухание target к нулю (инерция)
        target.x = this.lerp(target.x, 0, this.friction);
        target.y = this.lerp(target.y, 0, this.friction);
        target.z = this.lerp(target.z, 0, this.friction);
        
        // Плавная интерполяция current к target
        current.x = this.lerp(current.x, target.x, this.ease);
        current.y = this.lerp(current.y, target.y, this.ease);
        current.z = this.lerp(current.z, target.z, this.ease);
      }
      
      // Ограничиваем current чтобы блоки не проходили сквозь друг друга
      current.x = Math.max(this.minOffset, Math.min(current.x, this.maxOffset));
      current.y = Math.max(this.minOffset, Math.min(current.y, this.maxOffset));
      current.z = Math.max(this.minOffset, Math.min(current.z, this.maxOffset));
      
      // Применяем смещение к мешу + смещение в покое
      const mesh = this.meshes[i];
      if (mesh && this.originalPositions[i]) {
        mesh.position.x = this.originalPositions[i].x + current.x * this.amplitudeMultiplier;
        mesh.position.y = this.originalPositions[i].y + this.restOffset.y + current.y * this.amplitudeMultiplier;
        mesh.position.z = this.originalPositions[i].z + current.z * this.amplitudeMultiplier;
      }
    }

    // Логика "событийной" анимации
    if (this.isActive) {
      // this.mesh.scale.set(1.5, 1.5, 1.5); // Пример реакции
    }
  }
  
  /**
   * Линейная интерполяция
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
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

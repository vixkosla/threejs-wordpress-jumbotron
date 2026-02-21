import * as THREE from "three";
import GMaterial from "./Materials/GMaterial.js";
import { gsap } from "gsap";

// Цвета для блоков (мягкие, полупрозрачные оттенки)
// Фиолетовый - лёгкий пастельный с синим оттенком
const COLOR_PURPLE = 0xb8b8ff; // лёгкий фиолетово-синий (пастельный)
const COLOR_LIME = 0xa3e635; // мягкий салатовый (свежее яблоко)
const COLOR_GLASS = 0xf8f9fa; // стеклянный белый (полупрозрачный пластик)

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
//
// Гидравлический эффект:
// - Подъём: 1.2s (медленно, плавно)
// - Возврат: 4.0s (очень медленно, синусоида)
// - Волновая задержка: 0.15s между блоками
// - Пауза перед возвратом: 0.8s

const ginformation = [
  {
    position: [-2.0, 1, 0.5],
    rotation: [0, Math.PI, 0],
    color: COLOR_PURPLE, // левый нижний - сине-фиолетовый
  },
  {
    position: [-0.5, 2, 2.25],
    rotation: [-Math.PI / 2, Math.PI / 2, 0],
    color: COLOR_PURPLE, // центральный верхний - белый
  },
  {
    position: [0, 0.5, 2],
    rotation: [-Math.PI / 2, Math.PI, 0],
    color: COLOR_GLASS, // центральный нижний - белый
  },
  {
    position: [-2, 2.5, 1],
    rotation: [-Math.PI / 2, 2 * Math.PI, -Math.PI / 2],
    color: COLOR_LIME, // самый верхний слева - сине-фиолетовый (первый)
  },
  {
    position: [-2, 2.5, 2.5],
    rotation: [Math.PI / 2, 0, Math.PI],
    color: COLOR_GLASS, // следующий верхний - салатовый (смежный с первым)
  },
  {
    position: [-3, 1, 1],
    rotation: [-Math.PI / 2, Math.PI / 2, -2 * Math.PI],
    color: COLOR_GLASS, // левый дальний - белый
  },
];

const tinformation = [
  {
    position: [-0.5, 1.5, 1.0],
    rotation: [0, -Math.PI / 2, Math.PI / 2],
    color: COLOR_GLASS, // T-блок - стеклянный белый (центральный)
  },
];

export default class MyModel {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false; // Флаг для анимации

    this.meshes = [];
    this.group = new THREE.Object3D();
    // Передаём scene для работы GUI
    this.gMaterial = new GMaterial(scene);

    // Позиция мыши (нормализованная от -1 до 1)
    this.mouse = new THREE.Vector2(0, 0);
    this.prevMouse = new THREE.Vector2(0, 0);
    
    // Скорость мыши (абсолютная величина ускорения)
    this.mouseVelocity = new THREE.Vector2(0, 0);
    this.mouseAcceleration = 0; // Скалярная величина ускорения
    
    // Векторы смещения для каждого блока (направление "отталкивания")
    // Порядок соответствует ginformation массиву
    // Все 6 блоков участвуют в анимации
    this.pushVectors = [
      new THREE.Vector3(-1, 0.3, 0),   // 0: левый нижний - влево-вверх
      new THREE.Vector3(0.5, 1, 0),    // 1: центральный верхний - вверх-вправо
      new THREE.Vector3(-0.5, -0.5, 0),// 2: центральный нижний - влево-вниз
      new THREE.Vector3(0, 1, 0),      // 3: самый верхний слева - вверх
      new THREE.Vector3(0.5, 0.5, 0),  // 4: следующий верхний - вправо-вверх
      new THREE.Vector3(-1, 0, 0),     // 5: левый дальний - влево
    ];
    
    // Чувствительность к ускорению мыши (гидравлика - меньше)
    this.sensitivity = 0.4;
    
    // Максимальная амплитуда "взмаха" (гидравлика - больше для плавности)
    this.maxAmplitude = 2.0;
    
    // Длительность возврата (секунды) - "гидравлика" (медленно)
    this.returnDuration = 4.0;
    
    // Задержка перед возвратом (гидравлическая пауза)
    this.returnDelay = 0.8;
    
    // Волновая задержка между блоками (секунды)
    this.waveDelay = 0.15;
    
    // Храним GSAP твины для каждого блока
    this.blockTweens = [];

    this.composeCube();
    this.translateBlocks();
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

  initGMesh(color = COLOR_WHITE) {
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

  /**
   * Обновить позицию мыши
   */
  updateMousePosition(mouse) {
    // Сохраняем предыдущую позицию
    this.prevMouse.copy(this.mouse);
    
    // Обновляем текущую
    this.mouse.copy(mouse);
    
    // Вычисляем скорость (вектор)
    this.mouseVelocity.x = this.mouse.x - this.prevMouse.x;
    this.mouseVelocity.y = this.mouse.y - this.prevMouse.y;
    
    // Вычисляем абсолютную величину ускорения (скаляр)
    this.mouseAcceleration = Math.sqrt(
      this.mouseVelocity.x ** 2 + this.mouseVelocity.y ** 2
    );
  }

  // Вызывается каждый кадр
  update(time) {
    // Базовая idle анимация
    // this.mesh.rotation.y = time * 0.5;
    // this.mesh.rotation.x = time * 0.2;

    // Анимация "перышко на ветру" с использованием GSAP
    this.meshes.forEach((mesh, index) => {
      const pushVector = this.pushVectors[index];
      if (pushVector && pushVector.length() > 0) {
        // Сохраняем оригинальную позицию
        if (!mesh.userData.initialPosition) {
          mesh.userData.initialPosition = mesh.position.clone();
          mesh.userData.currentAmplitude = 0;
        }
        
        // 2D скалярное произведение скорости на вектор направления
        // Проверяем движение в направлении вектора
        const velocityDotVector = 
          this.mouseVelocity.x * pushVector.x + 
          this.mouseVelocity.y * pushVector.y;
        
        // Если есть ускорение в направлении вектора — запускаем "гидравлический взмах"
        if (velocityDotVector > 0.001) {
          // Вычисляем амплитуду на основе ускорения
          const amplitude = Math.min(
            velocityDotVector * this.sensitivity,
            this.maxAmplitude
          );
          
          // Гидравлический подъём (очень плавно, медленно)
          gsap.to(mesh.userData, {
            currentAmplitude: amplitude,
            duration: 1.2,
            ease: "power1.inOut"
          });
          
          // Гидравлический возврат с волновой задержкой
          // Каждый блок движется с небольшой задержкой относительно предыдущего
          gsap.to(mesh.userData, {
            currentAmplitude: 0,
            duration: this.returnDuration,
            delay: this.returnDelay + (index * this.waveDelay),
            ease: "sine.inOut" // Синусоидальный плавный возврат
          });
        }
        
        // Применяем текущее смещение по вектору
        const offset = pushVector.clone().multiplyScalar(mesh.userData.currentAmplitude);
        mesh.position.addVectors(mesh.userData.initialPosition, offset);
      }
    });

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
      if (
        child.isMesh &&
        child.geometry &&
        child.material.color?.equals(new THREE.Color(0x00ff00))
      ) {
        const meshBox = new THREE.Box3().setFromObject(child);
        box.union(meshBox);
        hasObjects = true;
      }
    });

    return hasObjects ? box : null;
  }
}

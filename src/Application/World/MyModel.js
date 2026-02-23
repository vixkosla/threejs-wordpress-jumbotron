import * as THREE from "three";
import GMaterial from "./Materials/GMaterial.js";
import LogoNormalMap from "./Utils/LogoNormalMap.js";
import SimpleDisplacementMap from "./Utils/SimpleDisplacementMap.js";
import SVGLogoProcessor from "./Utils/SVGLogoProcessor.js";
import LOGO_CONFIG from "./Config/LogoConfig.js";

// Цвета для блоков (мягкие, полупрозрачные оттенки)
const COLOR_PURPLE = 0xb8b8ff; // лёгкий фиолетово-синий
const COLOR_LIME = 0xa3e635; // мягкий салатовый
const COLOR_GLASS = 0xf8f9fa; // стеклянный белый

// Нумерация блоков (индексы в массиве ginformation):
//   0. [-2.0, 1, 0.5] - левый нижний
//   1. [-0.5, 2, 2] - центральный верхний
//   2. [0, 0.5, 2] - центральный нижний
//   3. [-2, 2.5, 1] - самый верхний слева
//   4. [-2, 2.5, 2.5] - следующий верхний
//   5. [-3, 1, 1] - левый дальний
// T-блок: [-0.5, 1.5, 1.0] - центральный (основной)
//
// Векторы отталкивания (2D проекция, вид с камеры):
// Мышь двигается по X/Y, каждый блок реагирует в своём направлении:
//   0. [-2.0, 1, 0.5] 🟣 - движение мыши вниз = блок к зрителю (-Z) + немного вниз по Y
//      На блоке 0: логотип (нормаль-мапа для рельефа, масштаб 1/3 высоты)
//   1. [-0.5, 2, 2] - движение мыши вверх-вправо
//   2. [0, 0.5, 2] - движение мыши вправо = блок вправо (+X)
//   3. [-2, 2.5, 1] 🟣 - движение мыши вверх
//   4. [-2, 2.5, 2.5] 🟢 - движение мыши вверх-влево (-X, +Y)
//   5. [-3, 1, 1] - движение мыши влево (-X)
//   T-блок: левитация + общее движение (уменьшенная сила)
//
// Физика: ускорение → скорость → трение → возврат к позиции покоя
// Cooldown: защита от дерганий (мин. 80мс между срабатываниями)
// "Живая" анимация: случайные импульсы на основе золотого сечения (φ = 1.618)
//   Частота: 1618мс / 2618мс (кратные φ)
//   Персональный cooldown для каждого блока (защита от частых повторений)
//   Блок 0: 1618мс, Блок 1: 2100мс, Блок 2: 2590мс... (каждый следующий +30%)
// Stagger: задержки 0-550мс для эффекта "лесенки"
// Группа: общее движение композиции (ограничено 1.0)
// Блоки: индивидуальные движения (ограничено 0.5) + общее движение группы
// T-блок: левитация (синус, амплитуда 0.05) + 30% от общего смещения группы
// Ограничения: блоки двигаются только ВДОЛЬ своего вектора (не обратно)
// Логотип на блоке 0: ВЫДАВЛИВАНИЕ через displacementMap (сила 0.8) + normalMap

const ginformation = [
  {
    position: [-2.0, 1, 0.5],
    rotation: [0, Math.PI, 0],
    color: COLOR_PURPLE, // левый нижний - сине-фиолетовый
  },
  {
    position: [-0.5, 2, 2],
    rotation: [-Math.PI / 2, Math.PI / 2, 0],
    color: COLOR_PURPLE, // центральный верхний - сине-фиолетовый
  },
  {
    position: [-1.0, 0.5, 2.5],
    rotation: [-Math.PI / 2, Math.PI, 0],
    color: COLOR_GLASS, // центральный нижний - белый
  },
  {
    position: [-2, 2.5, 1],
    rotation: [-Math.PI / 2, 2 * Math.PI, -Math.PI / 2],
    color: COLOR_LIME, // самый верхний слева - салатовый
  },
  {
    position: [-2, 2.5, 2.5],
    rotation: [Math.PI / 2, 0, Math.PI],
    color: COLOR_GLASS, // следующий верхний - белый
  },
  {
    position: [-3, 1, 1],
    rotation: [-Math.PI / 2, Math.PI / 2, -2 * Math.PI],
    color: COLOR_GLASS, // левый дальний - белый
  },
];

const tinformation = [
  {
    position: [-0.5, 1.25, 1.0],
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
    this.gMaterial = new GMaterial(scene);

    // Логотип для блока 0 (нормаль-мапа для рельефа)
    this.logoNormalMap = new LogoNormalMap();
    this.logoLoaded = false;
    this.logoScale = 0.33; // Масштаб логотипа (1/3 высоты блока)
    this.logoNormalScale = 1.5; // Сила рельефа нормалей

    // Простой квадрат для теста выдавливания (блок 0)
    this.squareDisplacement = new SimpleDisplacementMap();
    this.squareLoaded = false;

    // Позиция мыши (нормализованная от -1 до 1)
    this.mouse = new THREE.Vector2(0, 0);
    this.prevMouse = new THREE.Vector2(0, 0);

    // Дельта движения мыши
    this.mouseDelta = new THREE.Vector2(0, 0);

    // Векторы направления для каждого блока (2D проекция от движения мыши)
    // Мышь двигается по X/Y, блоки реагируют в своих направлениях
    this.pushVectors = [
      new THREE.Vector3(0, -0.7, -1),  // 0: левый нижний (фиолетовый) - движение мыши вниз = блок к зрителю (-Z)
      new THREE.Vector3(0.5, 1, 0),    // 1: центральный верхний - вверх-вправо
      new THREE.Vector3(1, 0, 0),      // 2: центральный нижний (белый) - движение мыши вправо = блок вправо (+X)
      new THREE.Vector3(-0.7, 0.5, 0.5), // 3: салатовый (самый верхний слева) - вверх-влево-вглубь (-X, +Y, +Z)
      new THREE.Vector3(0.5, 0.5, 0),  // 4: следующий верхний (белый) - вправо-вверх
      new THREE.Vector3(-1, 0, 0),     // 5: левый дальний - движение мыши влево
    ];

    // Параметры анимации (физика с ускорением и трением)
    this.acceleration = 0.25; // Ускорение от движения мыши (увеличено)
    this.friction = 0.92; // Трение (замедление, 0.90-0.96 для плавности)
    this.returnSpeed = 0.08; // Скорость возврата к позиции покоя

    // Cooldown для защиты от дерганий (мин. время между срабатываниями)
    this.cooldownTime = 80; // мс между срабатываниями
    this.lastTriggerTime = 0; // время последнего срабатывания

    // "Живая" анимация - случайные импульсы для эффекта дыхания
    // Частота на основе золотого сечения (φ = 1.618...)
    this.phi = 1.618033988749895; // Золотое сечение
    this.baseImpulseTime = 1000; // Базовое время (мс)
    this.randomImpulseChance = 0.08; // Шанс импульса каждый кадр
    this.randomImpulseMinTime = this.baseImpulseTime * this.phi; // ~1618мс
    this.randomImpulseMaxTime = this.baseImpulseTime * this.phi * this.phi; // ~2618мс
    this.randomImpulseForce = 0.015; // Сила импульса (очень маленькая амплитуда)
    this.lastRandomImpulseTime = 0; // Время последнего импульса
    this.randomImpulseBlock = -1; // Какой блок сейчас получает импульс

    // Персональный cooldown для каждого блока (защита от частых повторений)
    this.blockLastImpulseTime = []; // Время последнего импульса для каждого блока
    this.blockImpulseCooldown = []; // Мин. время до следующего импульса для блока
    for (let i = 0; i < 6; i++) {
      this.blockLastImpulseTime.push(0);
      // Cooldown на основе золотого сечения + случайность
      this.blockImpulseCooldown.push(
        this.randomImpulseMinTime * (1 + i * 0.3) // Каждый следующий блок медленнее на 30%
      );
    }

    // Левитация T-блока (плавающее движение как Float из drei)
    this.tBlockFloatSpeed = 1.5; // Скорость левитации (рад/сек)
    this.tBlockFloatAmplitude = 0.05; // Амплитуда левитации (уменьшено)
    this.tBlockFloatOffset = 0; // Текущее смещение
    this.tMesh = null; // Ссылка на T-меш для анимации
    this.tBlockOriginalPos = new THREE.Vector3(0, 0, 0); // Оригинальная позиция T-блока (после translateBlocks)

    // T-блок получает только часть общего смещения композиции (минимально)
    this.tBlockGroupFactor = 0.1; // Коэффициент от общего смещения группы (10% - уменьшено)

    // Множитель амплитуды (увеличено с 1.5 до 2.5)
    this.amplitudeMultiplier = 2.5;

    // Общее движение группы (смещение всей композиции)
    this.groupVelocity = new THREE.Vector3(0, 0, 0);
    this.groupDisplacement = new THREE.Vector3(0, 0, 0);
    this.groupAcceleration = 0.08; // Ускорение группы
    this.groupFriction = 0.94; // Трение группы
    this.groupReturnSpeed = 0.05; // Возврат группы

    // Мёртвая зона мыши (чувствительно)
    this.deadZone = 0.05;

    // Stagger задержка для каждого блока (эффект "лесенки" - увеличено)
    this.staggerDelays = [0, 0.15, 0.25, 0.35, 0.45, 0.55]; // Задержки между блоками 100-150мс

    // Для каждого блока: velocity (скорость) и displacement (смещение)
    this.blockVelocities = [];
    this.blockDisplacements = [];

    // Инициализация
    for (let i = 0; i < 6; i++) {
      this.blockVelocities.push(new THREE.Vector3(0, 0, 0));
      this.blockDisplacements.push(new THREE.Vector3(0, 0, 0));
    }

    // Для stagger анимации
    this.staggerCurrents = [0, 0, 0, 0, 0, 0]; // Текущая задержка для каждого блока

    // Ограничения смещения (чтобы блоки не проходили сквозь друг друга)
    this.minOffset = -1.5; // Минимальное смещение (отрицательное для блоков с -X/-Y/-Z векторами)
    this.maxOffset = 1.5; // Максимальное смещение

    // Смещение в покое (опускаем все блоки)
    this.restOffset = new THREE.Vector3(0, -2, 0);

    this.composeCube();

    // Сохраняем оригинальные позиции ДО translateBlocks
    this.originalPositions = this.meshes.map((mesh) => mesh.position.clone());

    this.translateBlocks();

    // Сохраняем позицию T-блока ПОСЛЕ translateBlocks для левитации
    if (this.tMesh) {
      this.tBlockOriginalPos.copy(this.tMesh.position);
    }

    // Загружаем логотип и применяем к блоку 0
    this.loadLogoOnBlock0();

    // Создаём и применяем квадрат для выдавливания на блоке 0
    // this.applySquareDisplacementToBlock0(); // ЗАКОММЕНТИРОВАНО - используем логотип
  }

  /**
   * Загрузить логотипы и создать плоскости-вывески
   * Параметры берутся из LOGO_CONFIG (два логотипа)
   * Логотип 2 прикреплён к T-блоку (двигается вместе с ним)
   * ИСПОЛЬЗУЕМ SVG НАПРЯМУЮ (векторное качество)
   */
  loadLogoOnBlock0() {
    console.log('=== ЗАГРУЗКА ЛОГОТИПОВ (SVG ВЕКТОР) ===');
    console.log('  - Конфиг logo1:', LOGO_CONFIG.logo1);
    console.log('  - Конфиг logo2:', LOGO_CONFIG.logo2);
    
    // Загружаем SVG напрямую как текстуру (векторное качество!)
    const loader = new THREE.TextureLoader();
    loader.load('/logo-text-only.svg', (texture) => {
      console.log('  - SVG загружен (вектор, только текст)');

      // Настраиваем текстуру
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;

      // === ЛОГОТИП 1 (основной) ===
      const logo1Geometry = new THREE.PlaneGeometry(
        LOGO_CONFIG.logo1.size.width,
        LOGO_CONFIG.logo1.size.height
      );
      
      this.logoMaterial1 = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: LOGO_CONFIG.logo1.material.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        color: LOGO_CONFIG.logo1.material.color,
      });

      const logoMesh1 = new THREE.Mesh(logo1Geometry, this.logoMaterial1);
      this.logoMaterial1.mesh = logoMesh1;

      logoMesh1.position.set(
        LOGO_CONFIG.logo1.position.x,
        LOGO_CONFIG.logo1.position.y,
        LOGO_CONFIG.logo1.position.z
      );
      logoMesh1.rotation.set(
        LOGO_CONFIG.logo1.rotation.x,
        LOGO_CONFIG.logo1.rotation.y,
        LOGO_CONFIG.logo1.rotation.z
      );

      this.scene.add(logoMesh1);
      
      console.log('✓ Логотип 1 добавлен');

      // === ЛОГОТИП 2 (дубликат, прикреплён к T-блоку) ===
      const logo2Geometry = new THREE.PlaneGeometry(
        LOGO_CONFIG.logo2.size.width,
        LOGO_CONFIG.logo2.size.height
      );
      
      this.logoMaterial2 = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: LOGO_CONFIG.logo2.material.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        color: LOGO_CONFIG.logo2.material.color,
      });

      const logoMesh2 = new THREE.Mesh(logo2Geometry, this.logoMaterial2);
      this.logoMaterial2.mesh = logoMesh2;

      // Используем позицию из конфига logo2
      logoMesh2.position.set(
        LOGO_CONFIG.logo2.position.x,
        LOGO_CONFIG.logo2.position.y,
        LOGO_CONFIG.logo2.position.z
      );
      logoMesh2.rotation.set(
        LOGO_CONFIG.logo2.rotation.x,
        LOGO_CONFIG.logo2.rotation.y,
        LOGO_CONFIG.logo2.rotation.z
      );
      
      // Сохраняем смещение относительно T-блока для обновления в update()
      // T-блок: position [-0.5, 1.5, 1.0]
      const tBlockBasePosition = new THREE.Vector3(-0.5, 1.5, 1.0);
      const tBlockOffset = new THREE.Vector3().subVectors(logoMesh2.position, tBlockBasePosition);
      
      // Сохраняем для обновления позиции в update()
      this.scene.add(logoMesh2);
      this.tLogoMesh = logoMesh2;
      this.tLogoOffset = tBlockOffset;
      this.tLogoBaseRotation = logoMesh2.rotation.clone();
      
      console.log('✓ Логотип 2 добавлен (прикреплён к T-блоку)');
      console.log('  - Логотип 1:', LOGO_CONFIG.logo1);
      console.log('  - Логотип 2:', LOGO_CONFIG.logo2);
      console.log('  - T-блок offset:', this.tLogoOffset);
      this.logoLoaded = true;

    }, undefined, (err) => {
      console.error('Ошибка загрузки логотипа:', err);
    });
  }

  /**
   * Создать UV координаты для логотипа ТОЛЬКО на передней грани (Z+)
   * Остальные грани получают UV = 0 (нет текстуры)
   */
  createLogoUVs(geometry) {
    const pos = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    
    // Находим bounding box
    const bbox = new THREE.Box3().setFromBufferAttribute(pos);
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    
    // Создаём НОВЫЙ массив UV
    const uvArray = new Float32Array(pos.count * 2);
    
    // Проходим по всем вершинам
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const nz = normal.getZ(i);
      
      // ТОЛЬКО передняя грань (Z+), nz > 0.9
      if (nz > 0.9) {
        // Нормализуем от 0 до 1 для передней грани
        const u = (x - bbox.min.x) / width;
        const v = (y - bbox.min.y) / height;
        uvArray[i * 2] = u;
        uvArray[i * 2 + 1] = v;
      } else {
        // Остальные грани — UV = 0 (нет текстуры)
        uvArray[i * 2] = 0;
        uvArray[i * 2 + 1] = 0;
      }
    }
    
    // Заменяем старый атрибут UV
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  }

  /**
   * Создать UV координаты для логотипа на передней грани (Z+)
   * НЕ ИСПОЛЬЗУЕТСЯ — ломает геометрию
   */
  createLogoUVs(geometry) {
    // Отключено — использует стандартные UV от ExtrudeGeometry
  }

  /**
   * Применить простой квадрат для выдавливания на блоке 0 (ТЕСТ)
   */
  applySquareDisplacementToBlock0() {
    // Создаём карту высот для квадрата
    this.squareDisplacement.createSquareDisplacement(512, 0.6, 0.15);
    
    // Берём материал ПЕРВОГО блока (индекс 0)
    const mesh = this.meshes[0];
    const material = mesh.material;
    const geometry = mesh.geometry;
    
    console.log('=== ПЕРЕД ПРИМЕНЕНИЕМ ===');
    console.log('  - mesh[0]:', mesh ? 'OK' : 'NULL');
    console.log('  - material:', material ? material.type : 'NULL');
    console.log('  - geometry:', geometry ? 'OK' : 'NULL');
    
    // === ОТКЛЮЧАЕМ displacement для теста ===
    material.displacementMap = null;
    material.displacementScale = 0;
    material.displacementBias = 0;
    
    // Применяем только normalMap (рельеф без смещения вершин)
    material.normalMap = this.squareDisplacement.getNormalMap();
    material.normalScale = new THREE.Vector2(10.0, 10.0); // ОЧЕНЬ СИЛЬНЫЙ рельеф
    
    material.needsUpdate = true;
    
    console.log('=== ПОСЛЕ ПРИМЕНЕНИЯ ===');
    console.log('  - displacementScale:', material.displacementScale);
    console.log('  - normalScale:', material.normalScale);
    console.log('  - displacementMap:', material.displacementMap);
    console.log('  - normalMap:', material.normalMap ? 'OK' : 'NULL');
    
    console.log('✓ Применена normalMap к блоку 0 (без displacement)');
    
    this.squareLoaded = true;
  }

  /**
   * Обновить позицию мыши и применить ускорение к блокам и группе
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

    // Если нет движения — выходим
    if (this.mouseDelta.x === 0 && this.mouseDelta.y === 0) {
      return;
    }

    // Cooldown: проверяем время последнего срабатывания
    const now = Date.now();
    if (now - this.lastTriggerTime < this.cooldownTime) {
      return; // Ещё не время
    }
    this.lastTriggerTime = now;

    // Сбрасываем stagger
    this.staggerCurrents = [0, 0, 0, 0, 0, 0];

    // === ОБЩЕЕ ДВИЖЕНИЕ ГРУППЫ ===
    // Применяем ускорение к группе на основе движения мыши
    this.groupVelocity.x += this.mouseDelta.x * this.groupAcceleration;
    this.groupVelocity.y += this.mouseDelta.y * this.groupAcceleration;

    // === ИНДИВИДУАЛЬНЫЕ ДВИЖЕНИЯ БЛОКОВ ===
    for (let i = 0; i < 6; i++) {
      const pushVector = this.pushVectors[i];
      if (pushVector && pushVector.length() > 0) {
        // Скалярное произведение дельты мыши на вектор направления
        // Для X/Y используем мышь, для Z — тоже мышь но с коэффициентом
        const deltaDotVector =
          this.mouseDelta.x * pushVector.x + 
          this.mouseDelta.y * pushVector.y;

        // Используем абсолютное значение для силы + знак для направления
        const force = Math.abs(deltaDotVector);

        // Применяем ускорение если есть значимое движение
        if (force > 0.01) {
          // Накапливаем скорость в направлении вектора блока
          // sign(deltaDotVector) определяет направление движения мыши
          const direction = deltaDotVector > 0 ? 1 : -1;

          this.blockVelocities[i].x +=
            pushVector.x * force * direction * this.acceleration;
          this.blockVelocities[i].y +=
            pushVector.y * force * direction * this.acceleration;

          // Для Z используем отдельную логику — зависит от движения мыши по Y
          if (pushVector.z !== undefined && pushVector.z !== 0) {
            const zForce = Math.abs(this.mouseDelta.y) * Math.abs(pushVector.z);
            const zDirection = this.mouseDelta.y > 0 ? Math.sign(pushVector.z) : -Math.sign(pushVector.z);
            this.blockVelocities[i].z += zForce * zDirection * this.acceleration;
          }
        }
      }
    }
  }

  composeCube() {
    ginformation.forEach((info, index) => {
      const g = this.initGMesh(info.color);
      g.position.set(...info.position);
      g.rotation.set(...info.rotation);
      g.scale.set(0.8, 0.8, 0.8);
      
      // Включаем тени
      g.castShadow = true;
      g.receiveShadow = true;

      this.meshes.push(g);
      this.group.add(g);
      this.scene.add(g);
    });

    tinformation.forEach((info) => {
      const t = this.initTMesh(info.color);
      t.position.set(...info.position);
      t.rotation.set(...info.rotation);
      t.scale.set(0.85, 0.85, 0.85);
      
      // Включаем тени для T-блока
      t.castShadow = true;
      t.receiveShadow = true;

      this.tMesh = t; // Сохраняем ссылку для анимации

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
      depth: 1,               // Extrude вперёд (стандартно)
      bevelEnabled: true,
      bevelThickness: 0.03,   // Маленький bevel
      bevelSize: 0.03,        // Маленький bevel
      bevelOffset: 0,
      bevelSegments: 2,       // Меньше сегментов
      curveSegments: 12,
      steps: 8,               // МНОГО сегментов для displacement логотипа
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    // НЕ изменяем UV — используем стандартные от ExtrudeGeometry
    // this.createProperUVs(geometry, width, height);

    // Клонируем материал и задаём цвет (через cloneWithColor для обновления)
    const material = this.gMaterial.cloneWithColor(color);

    const letterG = new THREE.Mesh(geometry, material);
    letterG.scale.set(1.0, 1.0, 1.0);

    return letterG;
  }

  /**
   * Создать ПРАВИЛЬНЫЕ UV координаты для displacement
   * Передняя грань (Z+): UV 0-1 для логотипа
   * Остальные грани: UV 0-1 для стандартной текстуры
   */
  createProperUVs(geometry, width, height) {
    const pos = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    
    // Создаём НОВЫЕ UV координаты
    const uv = new Float32Array(pos.count * 2);
    
    // Проходим по всем вершинам
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const nz = normal.getZ(i);
      
      // Передняя грань (смотрит на Z+, nz > 0.9)
      if (nz > 0.9) {
        // Нормализуем от 0 до 1 для всей буквы
        const u = (x / width + 0.5);
        const v = (y / height + 0.5);
        uv[i * 2] = u;
        uv[i * 2 + 1] = v;
      } else {
        // Остальные грани — стандартные UV от ExtrudeGeometry
        // Используем координаты для развёртки
        const u = (x / width + 0.5);
        const v = (z / 1 + 0.5); // Z для боковых граней
        uv[i * 2] = u;
        uv[i * 2 + 1] = v;
      }
    }
    
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }

  /**
   * Добавить UV координаты для логотипа на переднюю грань буквы
   * Логотип ТОЛЬКО на передней грани (Z+), остальные грани — стандартные UV
   */
  addUVForLogo(geometry, width, height) {
    const pos = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    
    // Создаём НОВЫЕ UV координаты
    const uv = new Float32Array(pos.count * 2);
    
    // Параметры логотипа (в пределах 0-1 для текстуры)
    const logoScale = 0.5;           // 50% от поверхности
    const logoOffsetX = -0.15;       // Смещение влево
    const logoOffsetY = 0.0;         // По центру
    
    // Проходим по всем вершинам
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const nz = normal.getZ(i);
      
      // Передняя грань смотрит на Z+ (nz > 0.9)
      if (nz > 0.9) {
        // Нормализуем координаты от 0 до 1
        const u = (x / width + 0.5) * logoScale + (1 - logoScale) / 2 + logoOffsetX;
        const v = (y / height + 0.5) * logoScale + (1 - logoScale) / 2 + logoOffsetY;
        
        // Ограничиваем UV в пределах 0-1
        uv[i * 2] = Math.max(0, Math.min(1, u));
        uv[i * 2 + 1] = Math.max(0, Math.min(1, v));
      } else {
        // Остальные грани — стандартные UV от ExtrudeGeometry (0-1)
        uv[i * 2] = 0.5;
        uv[i * 2 + 1] = 0.5;
      }
    }
    
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
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
   * Применить случайный импульс к блоку для "живой" анимации
   * С учётом персонального cooldown для каждого блока
   */
  applyRandomImpulse() {
    const now = Date.now();
    
    // Проверяем минимальное время между глобальными импульсами
    if (now - this.lastRandomImpulseTime < this.randomImpulseMinTime) {
      return;
    }
    
    // Проверяем максимальное время (форсируем импульс если давно не было)
    const shouldImpulse =
      Math.random() < this.randomImpulseChance ||
      now - this.lastRandomImpulseTime > this.randomImpulseMaxTime;
    
    if (!shouldImpulse) {
      return;
    }
    
    // Выбираем блок, который НЕ на cooldown
    let availableBlocks = [];
    for (let i = 0; i < 6; i++) {
      const timeSinceLastImpulse = now - this.blockLastImpulseTime[i];
      if (timeSinceLastImpulse >= this.blockImpulseCooldown[i]) {
        availableBlocks.push(i);
      }
    }
    
    // Если все блоки на cooldown — пропускаем этот кадр
    if (availableBlocks.length === 0) {
      return;
    }
    
    // Выбираем случайный блок из доступных
    const randomIndex = Math.floor(Math.random() * availableBlocks.length);
    const newBlock = availableBlocks[randomIndex];
    
    this.randomImpulseBlock = newBlock;
    this.lastRandomImpulseTime = now;
    this.blockLastImpulseTime[newBlock] = now;
    
    // Обновляем cooldown для этого блока (случайная вариация ±20%)
    const variance = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
    this.blockImpulseCooldown[newBlock] = 
      this.randomImpulseMinTime * (1 + newBlock * 0.3) * variance;
    
    // Применяем импульс к выбранному блоку
    const pushVector = this.pushVectors[this.randomImpulseBlock];
    if (pushVector && pushVector.length() > 0) {
      // Случайная сила импульса (50-100% от максимальной)
      const force = this.randomImpulseForce * (0.5 + Math.random() * 0.5);
      
      // Применяем в направлении вектора блока
      this.blockVelocities[this.randomImpulseBlock].x += pushVector.x * force;
      this.blockVelocities[this.randomImpulseBlock].y += pushVector.y * force;
      if (pushVector.z !== undefined) {
        this.blockVelocities[this.randomImpulseBlock].z += pushVector.z * force;
      }
    }
  }

  // Вызывается каждый кадр
  update(time) {
    // Применяем случайные импульсы для "живой" анимации
    this.applyRandomImpulse();

    // === ФИЗИКА ГРУППЫ ===
    // Применяем трение к скорости группы
    this.groupVelocity.x *= this.groupFriction;
    this.groupVelocity.y *= this.groupFriction;
    this.groupVelocity.z *= this.groupFriction;

    // Возврат к позиции покоя
    this.groupDisplacement.x += this.groupVelocity.x;
    this.groupDisplacement.y += this.groupVelocity.y;
    this.groupDisplacement.z += this.groupVelocity.z;

    this.groupDisplacement.x = this.lerp(
      this.groupDisplacement.x,
      0,
      this.groupReturnSpeed,
    );
    this.groupDisplacement.y = this.lerp(
      this.groupDisplacement.y,
      0,
      this.groupReturnSpeed,
    );
    this.groupDisplacement.z = this.lerp(
      this.groupDisplacement.z,
      0,
      this.groupReturnSpeed,
    );

    // Ограничиваем смещение группы (очень маленькое)
    const groupMaxOffset = 0.3; // Макс. смещение группы (уменьшено)
    this.groupDisplacement.x = Math.max(
      -groupMaxOffset,
      Math.min(this.groupDisplacement.x, groupMaxOffset),
    );
    this.groupDisplacement.y = Math.max(
      -groupMaxOffset,
      Math.min(this.groupDisplacement.y, groupMaxOffset),
    );
    this.groupDisplacement.z = Math.max(
      -groupMaxOffset,
      Math.min(this.groupDisplacement.z, groupMaxOffset),
    );

    // Ограничиваем смещение блоков (макс. амплитуда от движения мыши)
    const blockMaxOffset = 0.15; // Макс. смещение для индивидуальных движений (сильно уменьшено)

    // Физика с ускорением, трением и возвратом к позиции покоя для каждого блока
    for (let i = 0; i < 6; i++) {
      const velocity = this.blockVelocities[i];
      const displacement = this.blockDisplacements[i];

      // Stagger: обновляем задержку
      const staggerDelay = this.staggerDelays[i];
      this.staggerCurrents[i] += 0.016; // ~60 FPS

      // Применяем физику только если stagger активирован
      const staggerActive = this.staggerCurrents[i] >= staggerDelay;

      if (staggerActive) {
        // Применяем трение к скорости (замедление)
        velocity.x *= this.friction;
        velocity.y *= this.friction;
        velocity.z *= this.friction;

        // Возврат к позиции покоя (пружина к 0)
        displacement.x += velocity.x;
        displacement.y += velocity.y;
        displacement.z += velocity.z;

        // Возвращаем смещение к 0 (позиция покоя)
        displacement.x = this.lerp(displacement.x, 0, this.returnSpeed);
        displacement.y = this.lerp(displacement.y, 0, this.returnSpeed);
        displacement.z = this.lerp(displacement.z, 0, this.returnSpeed);
      }

      // Ограничиваем смещение по каждому блоку индивидуально
      // Блоки двигаются только ВДОЛЬ своего вектора (не обратно)
      const pushVector = this.pushVectors[i];

      // Ограничиваем только те оси, по которым блок двигается
      // Ограничиваем ТОЛЬКО в положительную сторону вдоль вектора
      if (pushVector.x > 0) {
        displacement.x = Math.max(0, Math.min(displacement.x, this.maxOffset));
      } else if (pushVector.x < 0) {
        displacement.x = Math.max(-this.maxOffset, Math.min(displacement.x, 0));
      }

      if (pushVector.y > 0) {
        displacement.y = Math.max(0, Math.min(displacement.y, this.maxOffset));
      } else if (pushVector.y < 0) {
        displacement.y = Math.max(-this.maxOffset, Math.min(displacement.y, 0));
      }

      if (pushVector.z !== undefined && pushVector.z > 0) {
        displacement.z = Math.max(0, Math.min(displacement.z, this.maxOffset));
      } else if (pushVector.z !== undefined && pushVector.z < 0) {
        displacement.z = Math.max(-this.maxOffset, Math.min(displacement.z, 0));
      }

      // Дополнительно ограничиваем общую амплитуду смещения блока
      // (защита от слишком больших отклонений при резком движении мыши)
      const currentOffset = Math.sqrt(
        displacement.x * displacement.x +
        displacement.y * displacement.y +
        displacement.z * displacement.z
      );
      if (currentOffset > blockMaxOffset) {
        const scale = blockMaxOffset / currentOffset;
        displacement.x *= scale;
        displacement.y *= scale;
        displacement.z *= scale;
      }

      // Применяем смещение к мешу + смещение в покое + смещение группы
      const mesh = this.meshes[i];
      if (mesh && this.originalPositions[i]) {
        mesh.position.x =
          this.originalPositions[i].x +
          (displacement.x + this.groupDisplacement.x) *
            this.amplitudeMultiplier;
        mesh.position.y =
          this.originalPositions[i].y +
          this.restOffset.y +
          (displacement.y + this.groupDisplacement.y) *
            this.amplitudeMultiplier;
        mesh.position.z =
          this.originalPositions[i].z +
          (displacement.z + this.groupDisplacement.z) *
            this.amplitudeMultiplier;
      }
    }

    // Левитация T-блока (плавающее движение как Float из drei)
    if (this.tMesh && this.tBlockOriginalPos) {
      // Синусоидальное движение вверх-вниз
      this.tBlockFloatOffset =
        Math.sin(time * this.tBlockFloatSpeed) * this.tBlockFloatAmplitude;

      // T-блок получает только ЧАСТЬ общего смещения композиции (30%)
      // Позиция = оригинал + левитация + смещение группы * коэффициент
      this.tMesh.position.x =
        this.tBlockOriginalPos.x +
        this.groupDisplacement.x *
          this.amplitudeMultiplier *
          this.tBlockGroupFactor;
      this.tMesh.position.y =
        this.tBlockOriginalPos.y +
        this.tBlockFloatOffset +
        this.groupDisplacement.y *
          this.amplitudeMultiplier *
          this.tBlockGroupFactor;
      this.tMesh.position.z =
        this.tBlockOriginalPos.z +
        this.groupDisplacement.z *
          this.amplitudeMultiplier *
          this.tBlockGroupFactor;

      // Логотип 2 прикреплён к T-блоку — обновляем позицию
      if (this.tLogoMesh && this.tLogoOffset) {
        this.tLogoMesh.position.x = this.tMesh.position.x + this.tLogoOffset.x;
        this.tLogoMesh.position.y = this.tMesh.position.y + this.tLogoOffset.y;
        this.tLogoMesh.position.z = this.tMesh.position.z + this.tLogoOffset.z;
        this.tLogoMesh.rotation.copy(this.tLogoBaseRotation);
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

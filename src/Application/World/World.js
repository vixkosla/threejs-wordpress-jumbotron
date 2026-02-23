import * as THREE from "three";
import MyModel from "./MyModel.js";
import BacklightHexagon from "./BacklightHexagon.js";
import GUI from "lil-gui";
import {
  HEXAGON_1_POSITION,
  HEXAGON_2_POSITION,
  HEXAGON_3_POSITION,
  HEXAGON_1_LABEL,
  HEXAGON_2_LABEL,
  HEXAGON_3_LABEL,
} from "./Config/HexagonPositions.js";
import HexagonsControlPanel from "./HexagonsControlPanel.js";

export default class World {
  constructor(scene) {
    this.scene = scene;
    this.items = []; // Храним список наших объектов

    // Helpers visibility (для GUI)
    this.showAxes = true;
    this.showGrid = true;

    // EnvMap (HDRI карта окружения для transmission материалов)
    this.envMap = null;

    this.setupLights();
    this.setupHelpers();
    this.setupObjects();
    this.setupBacklight();
    this.setupLightsGUI();
    this.loadEnvMap(); // Загружаем HDRI карту
  }

  setupLights() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    // Directional light (основной источник света)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 15, 10);
    this.directionalLight.castShadow = true;
    
    // Настройки теней для высокого качества
    this.directionalLight.shadow.mapSize.width = 2048;   // Высокое разрешение карты теней
    this.directionalLight.shadow.mapSize.height = 2048;  // Высокое разрешение карты теней
    this.directionalLight.shadow.camera.near = 0.5;      // Ближняя плоскость
    this.directionalLight.shadow.camera.far = 50;        // Дальняя плоскость
    this.directionalLight.shadow.camera.left = -10;      // Границы камеры теней
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    this.directionalLight.shadow.bias = -0.0001;         // Смещение для устранения артефактов
    this.directionalLight.shadow.normalBias = 0.02;     // Нормальное смещение для quality
    
    this.scene.add(this.directionalLight);

    // Дополнительный заполняющий свет (fill light)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // Параметры для GUI
    this.lightParams = {
      ambientIntensity: 0.3,
      ambientColor: 0xffffff,
      directionalIntensity: 0.8,
      directionalColor: 0xffffff,
      directionalX: 10,
      directionalY: 15,
      directionalZ: 10,
    };
  }

  /**
   * Загрузить HDRI карту окружения для transmission материалов
   */
  loadEnvMap() {
    // Создаём тёмную карту окружения (градиент для отражений)
    // Это нужно для правильного отображения transmission материалов
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Чёрный фон с тёмным градиентом
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#000000');   // Чёрный верх
    gradient.addColorStop(0.5, '#0a0a0a'); // Тёмно-серый средний
    gradient.addColorStop(1, '#000000');   // Чёрный низ
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    
    // Добавляем несколько ярких "звёзд" для ориентиров в отражениях
    ctx.fillStyle = '#333333';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const size = Math.random() * 2;
      ctx.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = texture;
    this.envMap = texture;
    
    console.log('✓ Тёмная карта окружения создана (Canvas)');
    console.log('  - transmission материалы теперь отображают окружение');
    console.log('  - цвет материала (Color GUI) теперь виден');
  }

  setupHelpers() {
    // Вспомогательные объекты для отладки
    // Оси координат
    this.axesHelper = new THREE.AxesHelper(10);
    this.scene.add(this.axesHelper);

    // Сетка на полу
    this.gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(this.gridHelper);
  }

  setupObjects() {
    // Создаем наш объект (модель)
    this.myModel = new MyModel(this.scene);
    this.items.push(this.myModel);
  }

  setupBacklight() {
    // Получаем bounding box композиции для расчёта размера шестиугольника
    const boundingBox = this.myModel.getBoundingBox();

    // Шестиугольник 1: Front (ближний)
    const position1 = new THREE.Vector3(
      HEXAGON_1_POSITION.x,
      HEXAGON_1_POSITION.y,
      HEXAGON_1_POSITION.z
    );
    this.backlightHexagon1 = new BacklightHexagon(
      this.scene,
      boundingBox,
      position1,
      HEXAGON_1_LABEL
    );
    this.items.push(this.backlightHexagon1);

    // Шестиугольник 2: Left (дальний)
    const position2 = new THREE.Vector3(
      HEXAGON_2_POSITION.x,
      HEXAGON_2_POSITION.y,
      HEXAGON_2_POSITION.z
    );
    this.backlightHexagon2 = new BacklightHexagon(
      this.scene,
      boundingBox,
      position2,
      HEXAGON_2_LABEL
    );
    this.items.push(this.backlightHexagon2);

    // Шестиугольник 3: Right (справа)
    const position3 = new THREE.Vector3(
      HEXAGON_3_POSITION.x,
      HEXAGON_3_POSITION.y,
      HEXAGON_3_POSITION.z
    );
    this.backlightHexagon3 = new BacklightHexagon(
      this.scene,
      boundingBox,
      position3,
      HEXAGON_3_LABEL
    );
    this.items.push(this.backlightHexagon3);

    // Единая панель управления для всех трёх шестиугольников
    this.hexagonsPanel = new HexagonsControlPanel(
      this.backlightHexagon1,
      this.backlightHexagon2,
      this.backlightHexagon3,
      position1,
      position2,
      position3,
      boundingBox  // Передаём boundingBox для вычисления центра вращения
    );
  }

  setupLightsGUI() {
    // Отключаем GUI на мобильных устройствах
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return;
    }

    const gui = new GUI({
      title: "Scene Lights",
      container: document.querySelector('body')
    });
    
    // Перемещаем GUI в правый нижний угол
    if (gui.domElement) {
      gui.domElement.style.position = 'fixed';
      gui.domElement.style.top = 'auto';
      gui.domElement.style.bottom = '0';
      gui.domElement.style.right = '0';
      gui.domElement.style.left = 'auto';
    }

    const folderAmbient = gui.addFolder("Ambient Light");
    folderAmbient.addColor(this.lightParams, "ambientColor")
      .name("Color")
      .onChange((value) => {
        this.ambientLight.color.set(value);
      });
    folderAmbient.add(this.lightParams, "ambientIntensity", 0, 2, 0.05)
      .name("Intensity")
      .onChange((value) => {
        this.ambientLight.intensity = value;
      });

    const folderDirectional = gui.addFolder("Directional Light");
    folderDirectional.addColor(this.lightParams, "directionalColor")
      .name("Color")
      .onChange((value) => {
        this.directionalLight.color.set(value);
      });
    folderDirectional.add(this.lightParams, "directionalIntensity", 0, 5, 0.1)
      .name("Intensity")
      .onChange((value) => {
        this.directionalLight.intensity = value;
      });
    folderDirectional.add(this.lightParams, "directionalX", -20, 20, 0.5)
      .name("Position X")
      .onChange((value) => {
        this.directionalLight.position.x = value;
      });
    folderDirectional.add(this.lightParams, "directionalY", -20, 20, 0.5)
      .name("Position Y")
      .onChange((value) => {
        this.directionalLight.position.y = value;
      });
    folderDirectional.add(this.lightParams, "directionalZ", -20, 20, 0.5)
      .name("Position Z")
      .onChange((value) => {
        this.directionalLight.position.z = value;
      });

    // Helpers toggle
    const folderHelpers = gui.addFolder("Helpers (отладка)");
    folderHelpers.add(this, 'showAxes', true)
      .name("Axes Helper")
      .onChange((value) => {
        this.axesHelper.visible = value;
      });
    folderHelpers.add(this, 'showGrid', true)
      .name("Grid Helper")
      .onChange((value) => {
        this.gridHelper.visible = value;
      });
  }

  // Метод для вызова действия у модели извне
  triggerModelAction() {
    if (this.myModel) {
      this.myModel.triggerAction();
    }
  }

  /**
   * Обновить позицию мыши (для анимации)
   */
  updateMousePosition(mouse) {
    if (this.myModel) {
      this.myModel.updateMousePosition(mouse);
    }
  }

  update(time, deltaTime) {
    // Обновляем все объекты в мире
    this.items.forEach((item) => {
      if (item.update) item.update(time, deltaTime);
    });
  }
}

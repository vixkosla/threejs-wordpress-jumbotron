import * as THREE from "three";
import MyModel from "./MyModel.js";
import BacklightHexagon from "./BacklightHexagon.js";
import GUI from "lil-gui";
import {
  HEXAGON_1_POSITION,
  HEXAGON_2_POSITION,
  HEXAGON_2_LABEL,
} from "./Config/HexagonPositions.js";
import HexagonsControlPanel from "./HexagonsControlPanel.js";

export default class World {
  constructor(scene) {
    this.scene = scene;
    this.items = []; // Храним список наших объектов

    // Helpers visibility (для GUI)
    this.showAxes = true;
    this.showGrid = true;

    this.setupLights();
    this.setupHelpers();
    this.setupObjects();
    this.setupBacklight();
    this.setupLightsGUI();
  }

  setupLights() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    // Directional light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.directionalLight.position.set(5, 5, 5);
    this.scene.add(this.directionalLight);

    // Параметры для GUI
    this.lightParams = {
      ambientIntensity: 0.3,
      ambientColor: 0xffffff,
      directionalIntensity: 0.5,
      directionalColor: 0xffffff,
      directionalX: 5,
      directionalY: 5,
      directionalZ: 5,
    };
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

    // Шестиугольник 1: ближе к камере (основной свет)
    const position1 = new THREE.Vector3(
      HEXAGON_1_POSITION.x,
      HEXAGON_1_POSITION.y,
      HEXAGON_1_POSITION.z
    );
    this.backlightHexagon1 = new BacklightHexagon(
      this.scene,
      boundingBox,
      position1,
      "(Front)"
    );
    this.items.push(this.backlightHexagon1);

    // Шестиугольник 2: дальний, в соседней декарте
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

    // Единая панель управления обоими шестиугольниками
    this.hexagonsPanel = new HexagonsControlPanel(
      this.backlightHexagon1,
      this.backlightHexagon2,
      position1,
      position2
    );
  }

  setupLightsGUI() {
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

  update(time) {
    // Обновляем все объекты в мире
    this.items.forEach((item) => {
      if (item.update) item.update(time);
    });
  }
}

import * as THREE from "three";
import MyModel from "./MyModel.js";

export default class World {
  constructor(scene) {
    this.scene = scene;
    this.items = []; // Храним список наших объектов

    this.setupLights();
    this.setupHelpers();
    this.setupObjects();
  }

  setupLights() {
    // Базовый свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.DirectionalLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);
  }

  setupHelpers() {
    // Добавляем вспомогательные объекты (например, оси координат)
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);

    // Добавляем сетку
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
  }

  setupObjects() {
    // Создаем наш объект (модель)
    this.myModel = new MyModel(this.scene);
    this.items.push(this.myModel);
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

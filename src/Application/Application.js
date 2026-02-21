import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import World from "./World/World.js";

export default class Application {
  constructor(canvas) {
    this.canvas = canvas;

    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupWorld();
    this.setupEventListeners();

    // Запуск цикла
    this.clock = new THREE.Clock();
    this.tick();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
  }

  setupCamera() {
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.camera = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      100,
    );
    // Позиция камеры: смотрим на сцену под углом
    this.camera.position.set(0, 0, 25);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Контролы (опционально)
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
  }

  setupWorld() {
    // Создаем мир и передаем ему сцену
    this.world = new World(this.scene);
  }

  setupEventListeners() {
    // Ресайз окна
    window.addEventListener("resize", () => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    // Пример события: Клик вызывает действие
    window.addEventListener("click", () => {
      console.log("Click event! Triggering animation...");
      this.world.triggerModelAction();
    });
  }

  tick() {
    const elapsedTime = this.clock.getElapsedTime();

    // Обновляем мир (анимации объектов)
    this.world.update(elapsedTime);

    // Обновляем контролы
    this.controls.update();

    // Рендер
    this.renderer.render(this.scene, this.camera);

    // Следующий кадр
    window.requestAnimationFrame(() => this.tick());
  }
}

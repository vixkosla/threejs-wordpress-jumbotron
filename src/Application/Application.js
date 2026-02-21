import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import GUI from "lil-gui";
import World from "./World/World.js";

export default class Application {
  constructor(canvas) {
    this.canvas = canvas;

    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupPostProcessing();
    this.setupWorld();
    this.setupEventListeners();
    this.setupBloomGUI();

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
    // Позиция камеры: как при FOV 10-15 (изометрический вид)
    this.camera.position.set(20, 20, 20);
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
    
    // Включаем поддержку RectAreaLight
    this.renderer.useLegacyLights = false;

    // Контролы (опционально)
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
  }

  setupPostProcessing() {
    // EffectComposer для post-processing
    this.composer = new EffectComposer(this.renderer);
    
    // RenderPass - рендерит сцену
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // UnrealBloomPass - bloom эффект
    this.bloomParams = {
      strength: 1.5,
      radius: 0.4,
      threshold: 0.85,
    };
    
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.sizes.width, this.sizes.height),
      this.bloomParams.strength,
      this.bloomParams.radius,
      this.bloomParams.threshold
    );
    this.composer.addPass(this.bloomPass);
  }

  setupBloomGUI() {
    const gui = new GUI({ title: "Bloom" });
    
    gui.add(this.bloomParams, "strength", 0, 3, 0.1)
      .name("Strength")
      .onChange(() => {
        this.bloomPass.strength = this.bloomParams.strength;
      });
    
    gui.add(this.bloomParams, "radius", 0, 1, 0.01)
      .name("Radius")
      .onChange(() => {
        this.bloomPass.radius = this.bloomParams.radius;
      });
    
    gui.add(this.bloomParams, "threshold", 0, 1, 0.01)
      .name("Threshold")
      .onChange(() => {
        this.bloomPass.threshold = this.bloomParams.threshold;
      });
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
      
      // Обновляем composer для нового размера
      this.composer.setSize(this.sizes.width, this.sizes.height);
      this.bloomPass.resolution.set(this.sizes.width, this.sizes.height);
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

    // Рендер через composer (с post-processing)
    this.composer.render();

    // Следующий кадр
    window.requestAnimationFrame(() => this.tick());
  }
}

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
    this.setupMouseTracking();

    // Запуск цикла
    this.clock = new THREE.Clock();
    this.tick();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Чёрный фон
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
    // Позиция камеры из сохранения (hexagon-settings (10).js от 2026-02-23T01:14:53.655Z)
    this.camera.position.set(6.320308439648348, 5.362628357729717, -6.5044872946773875);
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

    // Включаем тени высокого качества
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Мягкие тени

    // Контролы (опционально)
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    
    // Сохраняем ссылку на камеру для доступа извне
    window.APP_CAMERA = this.camera;
    window.APP_CONTROLS = this.controls;
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

  /**
   * Отслеживание позиции мыши и наклона телефона для анимации
   * На мобильных устройствах используется гироскоп (DeviceOrientation)
   * На ПК — мышь
   */
  setupMouseTracking() {
    this.mouse = new THREE.Vector2(0, 0); // Нормализованные координаты (-1 до 1)
    this.prevMouse = new THREE.Vector2(0, 0); // Для вычисления дельты
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Параметры для гироскопа
    this.gyroBeta = 0;  // Наклон вперёд/назад (-90 до 90)
    this.gyroGamma = 0; // Наклон влево/вправо (-90 до 90)
    this.prevGyroBeta = 0;
    this.prevGyroGamma = 0;
    this.gyroSensitivity = 0.0008; // Чувствительность гироскопа (коэффициент для дельты)
    
    // Запрашиваем разрешение на использование гироскопа (iOS 13+)
    this.requestDeviceOrientationPermission();

    if (this.isMobile) {
      // Мобильные: используем гироскоп
      window.addEventListener("deviceorientation", (event) => {
        if (event.beta !== null && event.gamma !== null) {
          this.gyroBeta = event.beta;
          this.gyroGamma = event.gamma;
          
          // Вычисляем дельту наклона (аналогично mouseDelta)
          const deltaBeta = this.gyroBeta - this.prevGyroBeta;
          const deltaGamma = this.gyroGamma - this.prevGyroGamma;
          
          // Преобразуем дельту наклона в нормализованные значения (-1 до 1)
          // Коэффициент чувствительности подобран для соответствия силе импульса от мыши
          this.mouse.x = deltaGamma * this.gyroSensitivity;
          this.mouse.y = deltaBeta * this.gyroSensitivity;
          
          // Ограничиваем диапазон
          this.mouse.x = Math.max(-1, Math.min(1, this.mouse.x));
          this.mouse.y = Math.max(-1, Math.min(1, this.mouse.y));
          
          // Сохраняем предыдущие значения
          this.prevGyroBeta = this.gyroBeta;
          this.prevGyroGamma = this.gyroGamma;
          
          // Передаём в мир
          if (this.world) {
            this.world.updateMousePosition(this.mouse);
          }
        }
      });
    } else {
      // ПК: используем мышь
      window.addEventListener("mousemove", (event) => {
        // Нормализуем координаты мыши от -1 до 1
        const currentMouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const currentMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Вычисляем дельту (как в мобильной версии)
        this.mouse.x = currentMouseX - this.prevMouse.x;
        this.mouse.y = currentMouseY - this.prevMouse.y;
        
        // Сохраняем предыдущую позицию
        this.prevMouse.x = currentMouseX;
        this.prevMouse.y = currentMouseY;
        
        // Передаём позицию мыши в мир
        if (this.world) {
          this.world.updateMousePosition(this.mouse);
        }
      });
    }
  }
  
  /**
   * Запрос разрешения на использование гироскопа (iOS 13+)
   */
  requestDeviceOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ требует запрос разрешения
      // Добавляем кнопку для запроса (появляется только на iOS)
      const button = document.createElement('button');
      button.textContent = 'Разрешить гироскоп';
      button.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        padding: 20px 40px;
        font-size: 18px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      `;
      button.addEventListener('click', async () => {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') {
            console.log('✓ Разрешение гироскопа получено');
          } else {
            console.log('✗ Разрешение гироскопа отклонено');
          }
        } catch (error) {
          console.error('Ошибка запроса гироскопа:', error);
        }
        button.remove();
      });
      document.body.appendChild(button);
      
      // Авто-скрытие кнопки через 5 секунд
      setTimeout(() => button.remove(), 5000);
    }
  }

  tick() {
    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = this.clock.getDelta();

    // Обновляем мир (анимации объектов)
    this.world.update(elapsedTime, deltaTime);

    // Обновляем контролы
    this.controls.update();

    // Рендер
    this.renderer.render(this.scene, this.camera);

    // Следующий кадр
    window.requestAnimationFrame(() => this.tick());
  }
}

import * as THREE from "three";
import GUI from "lil-gui";

// Палитра цветов для G-блоков
// Фиолетовый 40%, белый 35%, салатовый 25%
export const G_COLORS = [
  { hex: 0x9333ea, name: "purple", weight: 0.40 },   // фиолетовый
  { hex: 0xffffff, name: "white", weight: 0.35 },    // белый
  { hex: 0xa3e635, name: "lime", weight: 0.25 },     // салатовый
];

/**
 * Класс для создания матового стекла (frosted glass effect)
 * Использует MeshPhysicalMaterial с transmission
 */
export default class GMaterial {
  constructor(scene) {
    this.scene = scene;
    this.gui = null;

    // Параметры материала (можно подбирать в реальном времени)
    this.params = {
      // Основное
      transmission: 0.92,        // прозрачность с преломлением (0-1)
      thickness: 0.6,            // толщина для преломления
      roughness: 0.35,           // шероховатость (матовость)
      ior: 1.45,                 // индекс преломления

      // Цвет
      color: 0xc084fc,    // базовый цвет (лёгкий фиолетовый)

      // Эффекты
      metalness: 0.0,            // металличность
      reflectivity: 0.5,         // отражающая способность
      clearcoat: 0.0,            // лаковое покрытие
      clearcoatRoughness: 0.0,   // шероховатость покрытия

      // Окружение
      envMapIntensity: 1.0,      // интенсивность карты окружения
      attenuationColor: 0xffffff,// цвет затухания
      attenuationDistance: 0.5,  // расстояние затухания
    };

    this.material = this.createMaterial();
    
    // Храним ссылки на все клонированные материалы для обновления
    this.clonedMaterials = [];
    
    this.setupGUI();
  }

  createMaterial() {
    const material = new THREE.MeshPhysicalMaterial({
      // Transmission (основа эффекта стекла)
      transmission: this.params.transmission,
      thickness: this.params.thickness,
      
      // Поверхность
      roughness: this.params.roughness,
      metalness: this.params.metalness,
      
      // Преломление
      ior: this.params.ior,
      reflectivity: this.params.reflectivity,
      
      // Покрытие
      clearcoat: this.params.clearcoat,
      clearcoatRoughness: this.params.clearcoatRoughness,
      
      // Цвет
      color: this.params.color,
      
      // Двусторонняя отрисовка
      side: THREE.DoubleSide,
      
      // Качество
      depthWrite: true,
      transparent: true,
    });

    return material;
  }

  /**
   * Получить материал для использования в меше
   */
  get() {
    return this.material;
  }

  /**
   * Установить цвет материала
   * @param {number|string|THREE.Color} color 
   */
  setColor(color) {
    this.material.color.set(color);
    this.params.color = this.material.color.getHex();
    if (this.gui) this.updateGUI();
  }

  /**
   * Получить случайный цвет из палитры с учётом весов
   * @returns {number} hex цвет
   */
  getRandomColor() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const color of G_COLORS) {
      cumulative += color.weight;
      if (rand <= cumulative) {
        return color.hex;
      }
    }
    
    return G_COLORS[0].hex;
  }

  /**
   * Создать новый материал с тем же конфигом, но другим цветом
   * @param {number|string|THREE.Color} color
   * @returns {THREE.MeshPhysicalMaterial}
   */
  cloneWithColor(color) {
    const cloned = this.material.clone();
    cloned.color.set(color);
    // Сохраняем оригинальный цвет клона
    cloned.userData.originalColor = color;
    // Регистрируем клон для обновлений
    this.clonedMaterials.push(cloned);
    return cloned;
  }

  /**
   * Обновить материал из текущих параметров
   */
  updateFromParams() {
    // Обновляем базовый материал (с обновлением цвета)
    this.updateMaterial(this.material, true);
    
    // Обновляем все клонированные материалы (без обновления цвета)
    for (const mat of this.clonedMaterials) {
      this.updateMaterial(mat, false);
    }
  }

  /**
   * Обновить конкретный материал
   * @param {THREE.MeshPhysicalMaterial} material 
   * @param {boolean} isBase - базовый это материал или клон
   */
  updateMaterial(material, isBase = false) {
    material.transmission = this.params.transmission;
    material.thickness = this.params.thickness;
    material.roughness = this.params.roughness;
    material.ior = this.params.ior;
    
    // Цвет обновляем только для базового материала
    // Клоны сохраняют свой оригинальный цвет
    if (isBase) {
      material.color.set(this.params.color);
    } else if (material.userData.originalColor !== undefined) {
      // Восстанавливаем оригинальный цвет клона
      material.color.set(material.userData.originalColor);
    }
    
    material.metalness = this.params.metalness;
    material.reflectivity = this.params.reflectivity;
    material.clearcoat = this.params.clearcoat;
    material.clearcoatRoughness = this.params.clearcoatRoughness;
    material.envMapIntensity = this.params.envMapIntensity;
    material.needsUpdate = true;
  }

  /**
   * Настроить GUI для отладки
   */
  setupGUI() {
    this.gui = new GUI({ 
      title: "G Material",
      container: document.querySelector('body')
    });
    
    // Перемещаем GUI в правый верхний угол
    if (this.gui.domElement) {
      this.gui.domElement.style.position = 'fixed';
      this.gui.domElement.style.top = '0';
      this.gui.domElement.style.right = '0';
      this.gui.domElement.style.left = 'auto';
    }
    
    const folderMain = this.gui.addFolder("Основное");
    folderMain.add(this.params, "transmission", 0, 1, 0.01)
      .name("Transmission")
      .onChange(() => this.updateFromParams());
    folderMain.add(this.params, "thickness", 0, 5, 0.01)
      .name("Thickness")
      .onChange(() => this.updateFromParams());
    folderMain.add(this.params, "roughness", 0, 1, 0.01)
      .name("Roughness")
      .onChange(() => this.updateFromParams());
    folderMain.add(this.params, "ior", 1, 3, 0.01)
      .name("IOR")
      .onChange(() => this.updateFromParams());

    const folderColor = this.gui.addFolder("Цвет");
    folderColor.addColor(this.params, "color")
      .name("Color")
      .onChange(() => this.updateFromParams());

    const folderSurface = this.gui.addFolder("Поверхность");
    folderSurface.add(this.params, "metalness", 0, 1, 0.01)
      .name("Metalness")
      .onChange(() => this.updateFromParams());
    folderSurface.add(this.params, "reflectivity", 0, 1, 0.01)
      .name("Reflectivity")
      .onChange(() => this.updateFromParams());
    folderSurface.add(this.params, "clearcoat", 0, 1, 0.01)
      .name("Clearcoat")
      .onChange(() => this.updateFromParams());
    folderSurface.add(this.params, "clearcoatRoughness", 0, 1, 0.01)
      .name("Coat Roughness")
      .onChange(() => this.updateFromParams());

    const folderEnv = this.gui.addFolder("Окружение");
    folderEnv.add(this.params, "envMapIntensity", 0, 3, 0.01)
      .name("Env Intensity")
      .onChange(() => this.updateFromParams());
    folderEnv.addColor(this.params, "attenuationColor")
      .name("Atten. Color")
      .onChange(() => this.updateFromParams());
    folderEnv.add(this.params, "attenuationDistance", 0, 2, 0.01)
      .name("Atten. Distance")
      .onChange(() => this.updateFromParams());

    // Кнопка сброса
    this.gui.add({ reset: () => this.resetParams() }, "reset")
      .name("↻ Сбросить");
  }

  updateGUI() {
    if (!this.gui) return;
    
    for (const controller of this.gui.controllers) {
      controller.updateDisplay();
    }
    for (const folder of Object.values(this.gui.folders)) {
      for (const controller of folder.controllers) {
        controller.updateDisplay();
      }
    }
  }

  resetParams() {
    this.params = {
      transmission: 0.92,
      thickness: 0.6,
      roughness: 0.35,
      ior: 1.45,
      color: G_COLORS[0].hex,
      metalness: 0.0,
      reflectivity: 0.5,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 1.0,
      attenuationColor: 0xffffff,
      attenuationDistance: 0.5,
    };
    this.updateFromParams();
    if (this.gui) this.updateGUI();
  }

  /**
   * Очистка ресурсов
   */
  dispose() {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
    if (this.material) {
      this.material.dispose();
    }
  }
}

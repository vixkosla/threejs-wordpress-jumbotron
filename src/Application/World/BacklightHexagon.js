import * as THREE from "three";
import PositionMarker from "./PositionMarker.js";

/**
 * Шестиугольник-подсветка (только свет + маркер позиции + хелперы)
 * Геометрия шестиугольника убрана - остался только источник света
 */
export default class BacklightHexagon {
  constructor(scene, boundingBox, positionOffset = null, label = "") {
    this.scene = scene;
    this.label = label;

    // Параметры света
    this.params = {
      intensity: 15,             // сила света RectAreaLight
      addLightBehind: true,      // дополнительный свет сзади для transmission
      addLightIntensity: 30,     // интенсивность заднего света
      showMarker: false,         // показывать маркер позиции (false по умолчанию)
      showHelpers: false,        // показывать хелперы (false по умолчанию)
    };

    // Позиция: передаётся извне
    this.position = positionOffset ? new THREE.Vector3().copy(positionOffset) : new THREE.Vector3(0, 0, 10);
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);

    // Группа для света
    this.group = new THREE.Group();

    // Создаём RectAreaLight (источник света)
    this.rectLight = this.createRectAreaLight();
    this.group.add(this.rectLight);

    // Хелпер для RectAreaLight (показывает панель света - рамка)
    this.rectLightHelper = this.createRectAreaLightHelper();
    this.rectLightHelper.visible = false;  // Скрыт по умолчанию
    this.group.add(this.rectLightHelper);

    // Дополнительный DirectionalLight сзади для transmission эффекта
    // Светит в том же направлении что и RectAreaLight (к центру композиции)
    this.backLight = this.createBackLight();
    this.group.add(this.backLight);

    // Хелпер для DirectionalLight (конус направления)
    this.backLightHelper = this.createDirectionalLightHelper();
    this.backLightHelper.visible = false;  // Скрыт по умолчанию
    this.group.add(this.backLightHelper);

    this.group.position.copy(this.position);
    this.group.lookAt(this.lookAtTarget);

    this.scene.add(this.group);

    // Маркер позиции (цветная сфера) - цвет зависит от label
    const markerColor = this.getMarkerColor(label);
    this.marker = new PositionMarker(scene, this.position, markerColor);
    this.marker.setVisible(false); // Скрыт по умолчанию
    
    // Применяем настройки сразу после создания
    this.updateFromParams();
  }

  /**
   * Получить цвет маркера по названию шестиугольника
   */
  getMarkerColor(label) {
    if (label.includes("Front")) return 0xff0000;  // 🔴 Красный (передний)
    if (label.includes("Left")) return 0x00ff00;   // 🟢 Зелёный (левый)
    if (label.includes("Right")) return 0x0000ff;  // 🔵 Синий (правый)
    return 0x000000;  // Чёрный (по умолчанию)
  }

  /**
   * Создать DirectionalLight (направленный свет как солнце)
   */
  createBackLight() {
    const intensity = this.params.addLightIntensity;
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(0, 0, 3);  // Сзади RectAreaLight
    light.lookAt(0, 0, -10);  // Светит в том же направлении (к центру)
    return light;
  }

  /**
   * Создать хелпер для DirectionalLight (конус направления)
   */
  createDirectionalLightHelper() {
    // Создаём конус показывающий направление света
    const coneGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,  // 🟦 Циан для DirectionalLight
      transparent: true,
      opacity: 0.6,
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.set(0, 0, 3);  // Позиция DirectionalLight
    cone.rotation.x = Math.PI;  // Поворот в направлении света
    return cone;
  }

  /**
   * Создать хелпер для RectAreaLight (рамка панели)
   */
  createRectAreaLightHelper() {
    // Создаём рамку (edges) для визуализации панели света
    const geometry = new THREE.PlaneGeometry(12, 12);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,  // Белая рамка
      transparent: true,
      opacity: 0.5,
    });
    const helper = new THREE.LineSegments(edges, material);
    helper.position.set(0, 0, 0.5);  // Позиция RectAreaLight
    helper.rotation.x = Math.PI;  // Поворот лицом к камере
    return helper;
  }

  /**
   * Рассчитать размер шестиугольника от bounding box композиции
   * (оставлено для совместимости, но не используется)
   */
  calculateHexagonSize(boundingBox) {
    if (!boundingBox) {
      return { width: 4, height: 4, radius: 2 };
    }
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxSize = Math.max(size.x, size.y);
    const hexRadius = (maxSize / 2) * 0.5;
    return { width: hexRadius * 2, height: hexRadius * 2, radius: hexRadius };
  }

  createRectAreaLight() {
    // RectAreaLight — это плоская прямоугольная поверхность света
    // Размер влияет на площадь освещения (чем больше, тем шире светит)
    const intensity = this.params.intensity;
    const light = new THREE.RectAreaLight(0xffffff, intensity, 12, 12); // 12x12 (в 3 раза больше)
    light.position.set(0, 0, 0.5);
    light.lookAt(0, 0, -1);
    return light;
  }

  createBackLight() {
    const intensity = this.params.addLightIntensity;
    const light = new THREE.PointLight(0xffffff, intensity, 50);
    light.position.set(0, 0, 3);
    return light;
  }

  /**
   * Обновить настройки света
   */
  updateFromParams() {
    this.rectLight.intensity = this.params.intensity;
    this.backLight.intensity = this.params.addLightIntensity;
    this.backLight.visible = this.params.addLightBehind;
    this.rectLightHelper.visible = this.params.showHelpers;
    this.backLightHelper.visible = this.params.showHelpers;
    this.marker.setVisible(this.params.showMarker);
  }

  /**
   * Включить/выключить маркер (из GUI)
   */
  setMarkerVisible(visible) {
    this.params.showMarker = visible;
    this.marker.setVisible(visible);
  }

  /**
   * Включить/выключить хелперы (из GUI)
   */
  setHelpersVisible(visible) {
    this.params.showHelpers = visible;
    this.rectLightHelper.visible = visible;
    this.backLightHelper.visible = visible;
  }

  /**
   * Обновить позицию маркера
   */
  updateMarkerPosition(newPosition) {
    this.marker.updatePosition(newPosition);
  }

  /**
   * Очистка ресурсов
   */
  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
    }
    if (this.backLight) {
      this.backLight.dispose?.();
    }
    if (this.marker) {
      this.marker.dispose();
    }
  }
}

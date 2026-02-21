import * as THREE from "three";
import PositionMarker from "./PositionMarker.js";

/**
 * Шестиугольник-подсветка (только свет + маркер позиции)
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
      showMarker: true,          // показывать маркер позиции
    };

    // Позиция: передаётся извне
    this.position = positionOffset ? new THREE.Vector3().copy(positionOffset) : new THREE.Vector3(0, 0, 10);
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);

    // Группа для света
    this.group = new THREE.Group();

    // Создаём RectAreaLight (источник света)
    this.rectLight = this.createRectAreaLight();
    this.group.add(this.rectLight);

    // Дополнительный PointLight сзади для transmission эффекта
    this.backLight = this.createBackLight();
    this.group.add(this.backLight);

    this.group.position.copy(this.position);
    this.group.lookAt(this.lookAtTarget);

    this.scene.add(this.group);

    // Маркер позиции (чёрная точка)
    this.marker = new PositionMarker(scene, this.position);
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
    // Размер не важен, так как геометрии нет
    const intensity = this.params.intensity;
    const light = new THREE.RectAreaLight(0xffffff, intensity, 4, 4);
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
    this.marker.setVisible(this.params.showMarker);
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

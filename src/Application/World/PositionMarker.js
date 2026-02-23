import * as THREE from "three";

/**
 * Маркер позиции (цветная сфера)
 * Отображает положение шестиугольника без влияния на свет
 */
export default class PositionMarker {
  constructor(scene, position, color = 0x000000) {
    this.scene = scene;
    this.position = position.clone();

    // Маленькая сфера (маркер) с цветом
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: color,  // Цвет маркера
      transparent: true,
      opacity: 0.8,
    });

    this.marker = new THREE.Mesh(geometry, material);
    this.marker.position.copy(this.position);
    this.marker.visible = false; // СКРЫТ по умолчанию!
    this.scene.add(this.marker);
  }

  /**
   * Обновить позицию маркера
   */
  updatePosition(newPosition) {
    this.position.copy(newPosition);
    this.marker.position.copy(newPosition);
  }

  /**
   * Показать/скрыть маркер
   */
  setVisible(visible) {
    this.marker.visible = visible;
  }

  /**
   * Очистка ресурсов
   */
  dispose() {
    if (this.marker) {
      this.marker.geometry.dispose();
      this.marker.material.dispose();
      this.scene.remove(this.marker);
    }
  }
}

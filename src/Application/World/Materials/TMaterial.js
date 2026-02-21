import * as THREE from "three";

export default class TMaterial {
  constructor() {
    this.material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
  }

  get() {
    return this.material;
  }

  setColor(color) {
    this.material.color.set(color);
  }
}

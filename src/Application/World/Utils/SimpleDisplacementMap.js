import * as THREE from "three";

/**
 * Генерирует простую карту высот для квадрата с мягкими краями
 */
export class SimpleDisplacementMap {
  constructor() {
    this.heightMap = null;
    this.normalMap = null;
    this.loaded = false;
  }

  /**
   * Создать карту высот для квадрата
   * @param {number} size - размер текстуры (512)
   * @param {number} squareSize - размер квадрата (0-1)
   * @param {number} softness - мягкость краёв (0-1)
   */
  createSquareDisplacement(size = 512, squareSize = 0.8, softness = 0.1) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Чёрный фон (нет высоты)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    // Белый прямоугольник по центру (растянут по горизонтали)
    const sqWidth = size * squareSize * 3.0;  // Растянут по горизонтали в 3 раза
    const sqHeight = size * squareSize * 1.5; // Растянут по вертикали в 1.5 раза
    const x = (size - sqWidth) / 2;
    const y = (size - sqHeight) / 2;
    
    // Создаём градиент для мягких краёв
    const gradient = ctx.createLinearGradient(x, y, x + sqWidth, y + sqHeight);
    
    // Центр белый, края серые (плавный переход)
    const edgeOffset = softness * sqHeight / 2;
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, '#cccccc');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, sqWidth, sqHeight);
    
    // Создаём текстуру высоты
    this.heightMap = new THREE.CanvasTexture(canvas);
    this.heightMap.wrapS = THREE.ClampToEdgeWrapping;
    this.heightMap.wrapT = THREE.ClampToEdgeWrapping;
    this.heightMap.flipY = false;
    
    // Генерируем нормаль-мапу из карты высот
    this.normalMap = this.generateNormalMap(canvas, size);
    
    this.loaded = true;
    return { heightMap: this.heightMap, normalMap: this.normalMap };
  }

  /**
   * Сгенерировать нормаль-мапу из карты высот
   */
  generateNormalMap(canvas, size) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    const normalData = new Uint8ClampedArray(size * size * 4);
    const height = 0.5; // Сила нормалей
    
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const idx = (py * size + px) * 4;
        
        // Соседи для градиента
        const left = px > 0 ? data[((py * size + px - 1)) * 4] / 255 : data[idx] / 255;
        const right = px < size - 1 ? data[((py * size + px + 1)) * 4] / 255 : data[idx] / 255;
        const top = py > 0 ? data[(((py - 1) * size + px)) * 4] / 255 : data[idx] / 255;
        const bottom = py < size - 1 ? data[(((py + 1) * size + px)) * 4] / 255 : data[idx] / 255;
        
        // Градиенты
        const dx = (right - left) * height * 2;
        const dy = (bottom - top) * height * 2;
        
        // Нормаль
        const nx = dx;
        const ny = dy;
        const nz = 1;
        
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        
        // Конвертируем в [0, 255]
        normalData[idx + 0] = ((nx / len + 1) * 127.5) | 0; // R = X
        normalData[idx + 1] = ((ny / len + 1) * 127.5) | 0; // G = Y
        normalData[idx + 2] = ((nz / len + 1) * 127.5) | 0; // B = Z
        normalData[idx + 3] = 255;
      }
    }
    
    // Создаём текстуру нормаль-мапы
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const normalCtx = normalCanvas.getContext('2d');
    const normalImageData = new ImageData(normalData, size, size);
    normalCtx.putImageData(normalImageData, 0, 0);
    
    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.ClampToEdgeWrapping;
    normalMap.wrapT = THREE.ClampToEdgeWrapping;
    normalMap.flipY = false;
    
    return normalMap;
  }

  getHeightMap() {
    return this.loaded ? this.heightMap : null;
  }

  getNormalMap() {
    return this.loaded ? this.normalMap : null;
  }
}

export default SimpleDisplacementMap;

import * as THREE from "three";

/**
 * Обрабатывает SVG логотип - обрезает, масштабирует, поворачивает
 */
export class SVGLogoProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Обработать SVG: обрезать рыбку, оставить только текст
   * @param {HTMLImageElement} img - загруженное SVG изображение
   * @param {number} targetSize - целевой размер (1024 для высокого качества)
   * @returns {HTMLCanvasElement} - обработанный canvas
   */
  processSVG(img, targetSize = 1024) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = targetSize;
    this.canvas.height = targetSize;
    this.ctx = this.canvas.getContext('2d');

    // Очищаем canvas (прозрачный фон)
    this.ctx.clearRect(0, 0, targetSize, targetSize);

    // Вычисляем область для обрезки (убираем рыбку сверху)
    // Обрезаем 30% сверху (рыбка)
    const cropTop = 0.30; // Обрезаем 30% сверху
    const cropHeight = 1 - cropTop; // Оставляем 70% снизу (только текст)

    // Рисуем только текст (без рыбки) - ЧЁРНЫЙ цвет
    const drawWidth = targetSize * 0.95; // 95% ширины
    const drawHeight = targetSize * cropHeight * 0.9; // 90% высоты текста
    const drawX = (targetSize - drawWidth) / 2; // Центрируем по X
    const drawY = targetSize * cropTop + (targetSize * cropHeight - drawHeight) / 2; // Центрируем по Y в оставшейся области

    // Рисуем с чёрным цветом
    this.ctx.fillStyle = '#000000';
    this.ctx.drawImage(
      img,
      0, img.height * cropTop, img.width, img.height * cropHeight, // Источник (обрезка)
      drawX, drawY, drawWidth, drawHeight // Назначение
    );

    return this.canvas;
  }

  /**
   * Создать карту высот из обработанного SVG
   */
  createHeightMap(processedCanvas, size = 512, softness = 0.1) {
    const ctx = processedCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
    const data = imageData.data;
    
    const heightData = new Uint8ClampedArray(size * size * 4);
    
    // Применяем мягкость краёв
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const idx = (py * size + px) * 4;
        const srcIdx = (py * processedCanvas.width + px) * 4;
        
        // Получаем alpha канала (прозрачность = высота)
        let alpha = data[srcIdx + 3] / 255;
        
        // Применяем мягкость к краям (градиент)
        const edgeDist = Math.min(
          px, size - px - 1,
          py, size - py - 1
        );
        const edgeFactor = Math.min(1, edgeDist / (size * softness));
        
        alpha *= edgeFactor;
        
        const heightValue = alpha * 255;
        heightData[idx + 0] = heightValue;
        heightData[idx + 1] = heightValue;
        heightData[idx + 2] = heightValue;
        heightData[idx + 3] = 255;
      }
    }
    
    // Создаём текстуру
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const heightCtx = heightCanvas.getContext('2d');
    const heightImageData = new ImageData(heightData, size, size);
    heightCtx.putImageData(heightImageData, 0, 0);
    
    return new THREE.CanvasTexture(heightCanvas);
  }

  /**
   * Создать нормаль-мапу из карты высот
   */
  createNormalMap(heightMap, size = 512, height = 0.5) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    const normalData = new Uint8ClampedArray(size * size * 4);
    
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const idx = (py * size + px) * 4;
        const h = data[idx] / 255;
        
        const left = px > 0 ? data[((py * size + px - 1)) * 4] / 255 : h;
        const right = px < size - 1 ? data[((py * size + px + 1)) * 4] / 255 : h;
        const top = py > 0 ? data[(((py - 1) * size + px)) * 4] / 255 : h;
        const bottom = py < size - 1 ? data[(((py + 1) * size + px)) * 4] / 255 : h;
        
        const dx = (right - left) * height * 2;
        const dy = (bottom - top) * height * 2;
        
        const nx = dx;
        const ny = dy;
        const nz = 1;
        
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        
        normalData[idx + 0] = ((nx / len + 1) * 127.5) | 0;
        normalData[idx + 1] = ((ny / len + 1) * 127.5) | 0;
        normalData[idx + 2] = ((nz / len + 1) * 127.5) | 0;
        normalData[idx + 3] = 255;
      }
    }
    
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
}

export default SVGLogoProcessor;

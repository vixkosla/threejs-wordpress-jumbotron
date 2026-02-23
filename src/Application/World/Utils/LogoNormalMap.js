import * as THREE from "three";

/**
 * Генерирует нормаль-мапу и мягкую карту высот (Bubble эффект) из логотипа
 */
export class LogoNormalMap {
  constructor() {
    this.texture = null;
    this.normalMap = null;
    this.heightMap = null;
    this.loaded = false;
  }

  /**
   * Gaussian blur для мягкости переходов (Bubble эффект)
   */
  applyGaussianBlur(data, width, height, radius = 4) {
    const output = new Uint8ClampedArray(data.length);
    const kernel = this.createGaussianKernel(radius);
    const kernelSize = radius * 2 + 1;
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const x = px + kx;
            const y = py + ky;
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
              const idx = (y * width + x) * 4;
              const kernelIdx = (ky + radius) * kernelSize + (kx + radius);
              const weight = kernel[kernelIdx];
              
              sum += data[idx + 3] * weight; // Alpha канал
              weightSum += weight;
            }
          }
        }
        
        const idx = (py * width + px) * 4;
        const blurred = sum / weightSum;
        output[idx] = blurred;
        output[idx + 1] = blurred;
        output[idx + 2] = blurred;
        output[idx + 3] = 255;
      }
    }
    
    return output;
  }

  /**
   * Создать Gaussian ядро
   */
  createGaussianKernel(radius) {
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size * size);
    const sigma = radius / 3;
    const twoSigmaSq = 2 * sigma * sigma;
    
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const idx = (y + radius) * size + (x + radius);
        const value = Math.exp(-(x * x + y * y) / twoSigmaSq);
        kernel[idx] = value;
        sum += value;
      }
    }
    
    // Нормализуем
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= sum;
    }
    
    return kernel;
  }

  /**
   * Загрузить SVG логотип и сгенерировать нормаль-мапу и мягкую карту высот
   */
  async load(logoPath, scale = 0.5, height = 0.1) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      
      loader.load(logoPath, (logoTexture) => {
        this.texture = logoTexture;
        
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, size, size);
        
        // Рисуем логотип с большим bevel (размытие для мягкости)
        const img = logoTexture.image;
        const logoSize = size * scale;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        
        // Рисуем с тенью для создания мягкого bevel
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20; // Большой blur для пузырчатого эффекта
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.drawImage(img, x, y, logoSize, logoSize);
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Применяем Gaussian blur для мягкости (Bubble эффект)
        const blurredData = this.applyGaussianBlur(data, size, size, 6);
        
        const normalData = new Uint8ClampedArray(size * size * 4);
        const heightData = new Uint8ClampedArray(size * size * 4);
        
        for (let py = 0; py < size; py++) {
          for (let px = 0; px < size; px++) {
            const idx = (py * size + px) * 4;
            
            // Получаем размытую яркость
            const alpha = blurredData[idx] / 255;
            
            // Соседи для градиента
            const left = px > 0 ? blurredData[((py * size + px - 1)) * 4] / 255 : 0;
            const right = px < size - 1 ? blurredData[((py * size + px + 1)) * 4] / 255 : 0;
            const top = py > 0 ? blurredData[(((py - 1) * size + px)) * 4] / 255 : 0;
            const bottom = py < size - 1 ? blurredData[(((py + 1) * size + px)) * 4] / 255 : 0;
            
            // Градиенты с увеличенной силой для Bubble эффекта
            const dx = (right - left) * height * 3;
            const dy = (bottom - top) * height * 3;
            
            const nx = dx;
            const ny = dy;
            const nz = 1;
            
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            
            // Нормаль-мапа
            normalData[idx + 0] = ((nx / len + 1) * 127.5) | 0;
            normalData[idx + 1] = ((ny / len + 1) * 127.5) | 0;
            normalData[idx + 2] = ((nz / len + 1) * 127.5) | 0;
            normalData[idx + 3] = 255;
            
            // Карта высот (размытая для мягкости)
            const heightValue = alpha * 255;
            heightData[idx + 0] = heightValue;
            heightData[idx + 1] = heightValue;
            heightData[idx + 2] = heightValue;
            heightData[idx + 3] = 255;
          }
        }
        
        // Создаём нормаль-мапу
        const normalCanvas = document.createElement('canvas');
        normalCanvas.width = size;
        normalCanvas.height = size;
        const normalCtx = normalCanvas.getContext('2d');
        const normalImageData = new ImageData(normalData, size, size);
        normalCtx.putImageData(normalImageData, 0, 0);
        
        this.normalMap = new THREE.CanvasTexture(normalCanvas);
        this.normalMap.wrapS = THREE.ClampToEdgeWrapping;
        this.normalMap.wrapT = THREE.ClampToEdgeWrapping;
        this.normalMap.flipY = false;
        
        // Создаём карту высот
        const heightCanvas = document.createElement('canvas');
        heightCanvas.width = size;
        heightCanvas.height = size;
        const heightCtx = heightCanvas.getContext('2d');
        const heightImageData = new ImageData(heightData, size, size);
        heightCtx.putImageData(heightImageData, 0, 0);
        
        this.heightMap = new THREE.CanvasTexture(heightCanvas);
        this.heightMap.wrapS = THREE.ClampToEdgeWrapping;
        this.heightMap.wrapT = THREE.ClampToEdgeWrapping;
        this.heightMap.flipY = false;
        
        this.loaded = true;
        resolve({ normalMap: this.normalMap, heightMap: this.heightMap });
        
      }, undefined, reject);
    });
  }

  getNormalMap() {
    return this.loaded ? this.normalMap : null;
  }

  getHeightMap() {
    return this.loaded ? this.heightMap : null;
  }

  getLogoTexture() {
    return this.loaded ? this.texture : null;
  }
}

export default LogoNormalMap;

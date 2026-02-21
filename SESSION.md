# Сессия разработки: G Material с эффектом матового стекла

## Дата начала
21 февраля 2026

## Цель
Добавить материал с эффектом frosted glass (матовое стекло) для G-блоков с возможностью runtime-настройки параметров.

## Что сделано

### 1. Установка зависимостей
```bash
npm install lil-gui
npm install postprocessing
```

### 2. Обновлён `src/Application/World/Materials/GMaterial.js`
- Переход с `MeshStandardMaterial` на `MeshPhysicalMaterial`
- Добавлены параметры transmission для эффекта стекла:
  - `transmission: 0.92` — прозрачность с преломлением
  - `thickness: 0.6` — толщина для преломления
  - `roughness: 0.35` — шероховатость (матовость)
  - `ior: 1.45` — индекс преломления
- Добавлена палитра цветов `G_COLORS`:
  - Фиолетовый (`0x9333ea`) — 40%
  - Белый (`0xffffff`) — 35%
  - Салатовый (`0xa3e635`) — 25%
- Интегрирован `lil-gui` для отладки в реальном времени
- Методы:
  - `getRandomColor()` — случайный цвет с учётом весов
  - `cloneWithColor(color)` — клонирование материала с новым цветом
  - `setupGUI()` — панель отладки

### 3. Обновлён `src/Application/World/MyModel.js`
- Добавлен `bevel` для `ExtrudeGeometry` (обе буквы G и T):
  ```js
  bevelEnabled: true,
  bevelThickness: 0.05,
  bevelSize: 0.05,
  bevelSegments: 3
  ```
- Каждый G-блок получает случайный цвет из палитры через `cloneWithColor()`
- `GMaterial` инициализируется с `scene` для работы GUI

### 4. Создан `src/Application/World/BacklightHexagon.js`
- Шестиугольник-подсветка сзади сцены (позиция: (0, 0, -20))
- `RectAreaLight` для интенсивного направленного света
- Белый `MeshBasicMaterial` для визуализации источника
- Поворот вершиной вверх (через rotateX + rotateZ)
- GUI для настройки:
  - Intensity (0-50)
  - Opacity шестиугольника
  - Видимость helper'а

### 5. Обновлён `src/Application/Application.js`
- Камера перемещена на (0, 0, 25)
- `camera.lookAt(0, 0, 0)` — точный фокус на центр сцены
- FOV изменён с 10 на 35 для лучшего обзора
- **Добавлен post-processing:**
  - `EffectComposer` + `RenderPass` + `UnrealBloomPass`
  - Bloom эффект для свечения белого шестиугольника
  - GUI для настройки bloom (strength, radius, threshold)
- `useLegacyLights = false` для корректной работы RectAreaLight

### 6. Обновлён `src/Application/World/World.js`
- Добавлен `setupBacklight()` для инициализации подсветки

## Структура проекта
```
src/Application/
├── World/
│   ├── Materials/
│   │   ├── GMaterial.js      ← обновлён
│   │   └── TMaterial.js      ← текущий (MeshStandardMaterial)
│   ├── BacklightHexagon.js   ← новый
│   ├── MyModel.js            ← обновлён
│   └── World.js              ← обновлён
└── Application.js            ← обновлён (post-processing, bloom)
```

## Следующие шаги
- [ ] Настроить `MeshPhysicalMaterial` для TMaterial (опционально)
- [ ] Добавить environment map для красивых отражений
- [ ] Реализовать анимацию появления блоков
- [ ] Оптимизировать производительность (если нужно)

## Команда для запуска
```bash
npm run dev
```

## Параметры для подбора (через GUI в браузере)

### G Material (справа сверху)
- Transmission (0.8-1.0)
- Roughness (0.1-0.5 для матовости)
- Thickness (0.5-2.0)
- IOR (1.3-1.8)

### Backlight Hexagon (справа сверху)
- Intensity (10-30 для яркого света)
- Hexagon Opacity (0.5-1.0)
- Light Visible (вкл/выкл helper)

### Bloom (справа сверху)
- Strength (1.0-2.5 для свечения)
- Radius (0.3-0.8)
- Threshold (0.7-0.95 — чем выше, то только яркие пиксели светятся)

'use client';

import { useEffect, useRef } from 'react';
import { Canvas, Rect, Point, util, ActiveSelection, PencilBrush } from 'fabric/es';

// Привязка ActiveSelection к Canvas
Canvas.ActiveSelection = ActiveSelection;

const ZOOM_LEVEL_MIN = 0;
const ZOOM_LEVEL_MAX = 3;

const CanvasComponent = () => {
  const canvasRef = useRef(null);

  const zoomLevelRef = useRef(0);
  const panningActiveRef = useRef(false);
  const mouseDownPointRef = useRef(null);

  // Храним последние два передвижения мыши для вычисления скорости
  const prevPointerRef = useRef(null);
  const prevTimeRef = useRef(null);
  const lastPointerRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Переменные для анимации инерции
  const inertiaRequestIdRef = useRef(null);
  const velocityRef = useRef({ x: 0, y: 0 });

  const ctrlPressedRef = useRef(false); // Отслеживание нажатия Ctrl

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const canvas = new Canvas(canvasElement, {
      selectionKey: 'ctrlKey'
      // Не задаём фиксированный размер: будем делать это динамически через resizeCanvas.
    });

    // Добавляем объекты для примера
    canvas.add(new Rect({
      left: 100,
      top: 100,
      width: 50,
      height: 50,
      fill: '#faa'
    }));
    canvas.add(new Rect({
      left: 300,
      top: 300,
      width: 50,
      height: 50,
      fill: '#afa'
    }));

    // =============================
    // Вспомогательные функции
    // =============================

    function clamp(value, min, max) {
      return Math.max(min, Math.min(value, max));
    }

    function keepPositionInBounds() {
      const zoom = canvas.getZoom();
      const xMin = (2 - zoom) * canvas.getWidth() / 2;
      const xMax = zoom * canvas.getWidth() / 2;
      const yMin = (2 - zoom) * canvas.getHeight() / 2;
      const yMax = zoom * canvas.getHeight() / 2;

      const centerPoint = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
      const center = util.transformPoint(centerPoint, canvas.viewportTransform);

      const clampedCenterX = clamp(center.x, xMin, xMax);
      const clampedCenterY = clamp(center.y, yMin, yMax);

      const diffX = clampedCenterX - center.x;
      const diffY = clampedCenterY - center.y;

      if (diffX !== 0 || diffY !== 0) {
        canvas.relativePan(new Point(diffX, diffY));
      }
    }

    function zoomIn(point) {
      if (zoomLevelRef.current < ZOOM_LEVEL_MAX) {
        zoomLevelRef.current += 1;
        canvas.zoomToPoint(point, Math.pow(2, zoomLevelRef.current));
        keepPositionInBounds();
      }
    }

    function zoomOut(point) {
      if (zoomLevelRef.current > ZOOM_LEVEL_MIN) {
        zoomLevelRef.current -= 1;
        canvas.zoomToPoint(point, Math.pow(2, zoomLevelRef.current));
        keepPositionInBounds();
      }
    }

    // Функция для подгонки канваса под размер окна
    function resizeCanvas() {
      canvas.setWidth(window.innerWidth);
      canvas.setHeight(window.innerHeight);
      canvas.renderAll();
      // Можно вызвать keepPositionInBounds(), если надо, после изменения размеров
    }

    // Функция анимации инерции (возвращена из предыдущих версий)
    function animateInertia() {
      const { x, y } = velocityRef.current;
      if (Math.abs(x) < 0.1 && Math.abs(y) < 0.1) {
        velocityRef.current = { x: 0, y: 0 };
        inertiaRequestIdRef.current = null;
        return;
      }

      canvas.relativePan(new Point(x, y));
      keepPositionInBounds();

      const friction = 0.9;
      velocityRef.current = { x: x * friction, y: y * friction };
      inertiaRequestIdRef.current = requestAnimationFrame(animateInertia);
    }

    // Функция запуска инерции (возвращена из предыдущих версий)
    function startInertia() {
      if (inertiaRequestIdRef.current) {
        cancelAnimationFrame(inertiaRequestIdRef.current);
      }
      inertiaRequestIdRef.current = requestAnimationFrame(animateInertia);
    }

    // Функция удаления выделенных объектов (была добавлена ранее)
    function deleteSelectedObjects() {
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length) {
        activeObjects.forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    }

    // Подписываемся на события для изменения размера
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // =============================
    // Обработчики событий
    // =============================

    const handleMouseWheel = (event) => {
      event.preventDefault();
      const delta = event.deltaY;
      const pointer = canvas.getPointer(event, true);
      const point = new Point(pointer.x, pointer.y);

      if (delta < 0) {
        zoomIn(point);
      } else if (delta > 0) {
        zoomOut(point);
      }
    };

    const handleMouseDown = (event) => {
      if (event.button === 1 && !canvas.isDrawingMode) {
        event.preventDefault();
        canvas.defaultCursor = 'move';
        canvas.selection = false;
        panningActiveRef.current = true;

        const pointer = canvas.getPointer(event, true);
        mouseDownPointRef.current = new Point(pointer.x, pointer.y);

        prevPointerRef.current = null;
        prevTimeRef.current = null;
        lastPointerRef.current = null;
        lastTimeRef.current = null;
        velocityRef.current = { x: 0, y: 0 };

        if (inertiaRequestIdRef.current) {
          cancelAnimationFrame(inertiaRequestIdRef.current);
          inertiaRequestIdRef.current = null;
        }
      }
    };

    const handleMouseMove = (event) => {
      if (panningActiveRef.current && mouseDownPointRef.current && !canvas.isDrawingMode) {
        const pointer = canvas.getPointer(event, true);
        const mouseMovePoint = new Point(pointer.x, pointer.y);
        canvas.relativePan(mouseMovePoint.subtract(mouseDownPointRef.current));
        mouseDownPointRef.current = mouseMovePoint;
        keepPositionInBounds();

        prevPointerRef.current = lastPointerRef.current;
        prevTimeRef.current = lastTimeRef.current;
        lastPointerRef.current = { x: pointer.x, y: pointer.y };
        lastTimeRef.current = performance.now();
      }
    };

    const handleMouseUp = (event) => {
      if (event.button === 1 && !canvas.isDrawingMode) {
        canvas.defaultCursor = 'default';
        canvas.selection = true;
        panningActiveRef.current = false;

        if (lastPointerRef.current && prevPointerRef.current && prevTimeRef.current && lastTimeRef.current) {
          const dx = lastPointerRef.current.x - prevPointerRef.current.x;
          const dy = lastPointerRef.current.y - prevPointerRef.current.y;
          const dt = (lastTimeRef.current - prevTimeRef.current) || 1;

          const vx = dx / dt;
          const vy = dy / dt;

          velocityRef.current = { x: vx * 10, y: vy * 10 };

          if (Math.abs(velocityRef.current.x) > 0.1 || Math.abs(velocityRef.current.y) > 0.1) {
            startInertia();
          }
        }

        mouseDownPointRef.current = null;
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Control') {
        ctrlPressedRef.current = true;
      } else if (event.key === 'Delete') {
        deleteSelectedObjects();
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Control') {
        ctrlPressedRef.current = false;
      }
    };

    canvas.wrapperEl.addEventListener('wheel', handleMouseWheel, { passive: false });
    canvas.wrapperEl.addEventListener('mousedown', handleMouseDown);
    canvas.wrapperEl.addEventListener('mousemove', handleMouseMove);
    canvas.wrapperEl.addEventListener('mouseup', handleMouseUp);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Сохраняем canvas в DOM элемент для доступа при нажатии кнопки
    canvasElement.__canvas = canvas;

    return () => {
      canvas.wrapperEl.removeEventListener('wheel', handleMouseWheel);
      canvas.wrapperEl.removeEventListener('mousedown', handleMouseDown);
      canvas.wrapperEl.removeEventListener('mousemove', handleMouseMove);
      canvas.wrapperEl.removeEventListener('mouseup', handleMouseUp);

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      window.removeEventListener('resize', resizeCanvas);

      if (inertiaRequestIdRef.current) {
        cancelAnimationFrame(inertiaRequestIdRef.current);
      }
    };
  }, []);

  const handleToggleDrawingClick = () => {
    const canvasElement = canvasRef.current;
    if (!canvasElement || !canvasElement.__canvas) return;
    const canvas = canvasElement.__canvas;
  
    // Инициализируем freeDrawingBrush, если он отсутствует
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new PencilBrush(canvas);
    }
  
    const currentlyDrawing = canvas.isDrawingMode;
    canvas.isDrawingMode = !currentlyDrawing;
    if (!currentlyDrawing) {
      canvas.freeDrawingBrush.color = '#000'; // Устанавливаем чёрный цвет кисти
      canvas.freeDrawingBrush.width = 5; // Устанавливаем толщину кисти
    }
  };
  

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ position: 'relative' }}>
      <button 
        onClick={handleToggleDrawingClick}
        style={{
          position: 'absolute',
          zIndex: 9999,
          top: '10px',
          left: '10px',
          background: 'white',
          border: '1px solid #ccc',
          padding: '5px'
        }}
      >
        Toggle Drawing
      </button>
      <canvas
        ref={canvasRef}
        className="border-0"
      />
    </div>
  );
};

export default CanvasComponent;

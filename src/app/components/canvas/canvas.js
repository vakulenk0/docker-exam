// components/canvas/CanvasComponent.js
'use client';

import { useEffect, useRef } from 'react';
import { Canvas, Rect, Point, util, ActiveSelection, PencilBrush, Pattern, Textbox} from 'fabric/es';
import {red} from "next/dist/lib/picocolors";

// Привязка ActiveSelection к Canvas
Canvas.ActiveSelection = ActiveSelection;

const ZOOM_LEVEL_MIN = -5;
const ZOOM_LEVEL_MAX = 3;

const CanvasComponent = ({ toggleDrawing, addTextTrigger, resetAddTextTrigger  }) => {
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
      selectionKey: 'ctrlKey',
      backgroundColor: '#EEF2F9'
      // Не задаём фиксированный размер: будем делать это динамически через resizeCanvas.
    });

    // Глобальные границы канваса
    const globalBounds = {
      left: -5000,  // Левая граница
      top: -5000,   // Верхняя граница
      right: 5000,  // Правая граница
      bottom: 5000, // Нижняя граница
    };

    // Инициализация freeDrawingBrush
    canvas.freeDrawingBrush = new PencilBrush(canvas, {
      color: '#000',
      width: 1
    });

    canvas.freeDrawingBrush.width = 100;

    // Функция для создания сетки с помощью pattern
    function createGridPattern() {
      const gridSize = 50;
      const patternCanvas = document.createElement('canvas');
      const patternContext = patternCanvas.getContext('2d');

      // Устанавливаем размер паттерна
      patternCanvas.width = gridSize;
      patternCanvas.height = gridSize;

      // Рисуем основные линии (светлые)
      patternContext.strokeStyle = '#ebebeb';
      patternContext.lineWidth = 1;

      // Горизонтальная линия
      patternContext.beginPath();
      patternContext.moveTo(0, 0);
      patternContext.lineTo(gridSize, 0);
      patternContext.stroke();

      // Вертикальная линия
      patternContext.beginPath();
      patternContext.moveTo(0, 0);
      patternContext.lineTo(0, gridSize);
      patternContext.stroke();

      // Создаем паттерн
      return new Pattern({
        source: patternCanvas.toDataURL(),
        repeat: 'repeat'
      });
    }

    // Создаем паттерн сетки
    const gridPattern = createGridPattern();
    canvas.backgroundImage = gridPattern;

    // Добавляем объекты для примера
    const rect1 = new Rect({
      left: 0,
      top: 0,
      width: 50,
      height: 50,
      fill: '#faa'
    });
    const rect2 = new Rect({
      left: 500,
      top: 300,
      width: 50,
      height: 50,
      fill: '#afa'
    });

    canvas.add(rect1);
    canvas.add(rect2);

    // Функция для рисования глобальных границ
    function drawGlobalBounds(canvas) {
      const boundary = new Rect({
        left: globalBounds.left,
        top: globalBounds.top,
        width: globalBounds.right - globalBounds.left,
        height: globalBounds.bottom - globalBounds.top,
        fill: 'transparent',
        stroke: 'blue',
        strokeWidth: 2, // Уменьшенный strokeWidth
        selectable: false,
        evented: false,
      });

      // Добавляем границы на канвас
      canvas.add(boundary);
    }

    // Рисуем глобальные границы
    drawGlobalBounds(canvas);

    // Функция для ограничения панорамирования
    function limitPan(canvas) {
      const vpt = canvas.viewportTransform;
      const zoom = canvas.getZoom();

      // Размеры видимой области
      const viewWidth = canvas.getWidth();
      const viewHeight = canvas.getHeight();

      // Половина размеров видимой области (для центрирования)
      const halfViewWidth = viewWidth / 2 / zoom;
      const halfViewHeight = viewHeight / 2 / zoom;

      // Границы с учётом половины видимой области
      const xMin = -(globalBounds.right - halfViewWidth);
      const xMax = -globalBounds.left + halfViewWidth;
      const yMin = -(globalBounds.bottom - halfViewHeight);
      const yMax = -globalBounds.top + halfViewHeight;

      // Ограничиваем панорамирование
      vpt[4] = Math.min(Math.max(vpt[4], xMin * zoom), xMax * zoom);
      vpt[5] = Math.min(Math.max(vpt[5], yMin * zoom), yMax * zoom);

      // Применяем ограничение
      canvas.setViewportTransform(vpt);
    }

    // Функция для ограничения зума
    function limitZoom(canvas) {
      const zoom = canvas.getZoom();

      // Ограничиваем зумирование
      if (zoom < ZOOM_LEVEL_MIN) {
        canvas.setZoom(ZOOM_LEVEL_MIN);
      } else if (zoom > ZOOM_LEVEL_MAX) {
        canvas.setZoom(ZOOM_LEVEL_MAX);
      }

      // Ограничиваем панорамирование после изменения масштаба
      limitPan(canvas);
      canvas.renderAll();
    }

    // Функция для зума в точку
    const ZOOM_FACTOR = 1.1; // 10% увеличение/уменьшение за шаг

    function zoomIn(point) {
      const currentZoom = canvas.getZoom();
      const newZoom = currentZoom * ZOOM_FACTOR;
      if (newZoom <= Math.pow(2, ZOOM_LEVEL_MAX)) {
        canvas.zoomToPoint(point, newZoom);
        limitPan(canvas);
        zoomLevelRef.current += 1;
      }
    }

    function zoomOut(point) {
      const currentZoom = canvas.getZoom();
      const newZoom = currentZoom / ZOOM_FACTOR;
      if (newZoom >= Math.pow(2, ZOOM_LEVEL_MIN)) {
        canvas.zoomToPoint(point, newZoom);
        limitPan(canvas);
        zoomLevelRef.current -= 1;
      }
    }


    // Функция для подгонки канваса под размер окна
    function resizeCanvas() {
      canvas.setWidth(window.innerWidth);
      canvas.setHeight(window.innerHeight);
      canvas.clear(); // Очистить канвас перед добавлением объектов

      // Перерисовываем границы
      drawGlobalBounds(canvas);

      // Добавляем объекты примера обратно
      canvas.add(rect1);
      canvas.add(rect2);
      canvas.renderAll();
    }

    // Функция анимации инерции
    function animateInertia() {
      const { x, y } = velocityRef.current;
      if (Math.abs(x) < 0.1 && Math.abs(y) < 0.1) {
        velocityRef.current = { x: 0, y: 0 };
        inertiaRequestIdRef.current = null;
        return;
      }

      canvas.relativePan(new Point(x, y));
      limitPan(canvas);

      const friction = 0.9;
      velocityRef.current = { x: x * friction, y: y * friction };
      inertiaRequestIdRef.current = requestAnimationFrame(animateInertia);
    }

    // Функция запуска инерции
    function startInertia() {
      if (inertiaRequestIdRef.current) {
        cancelAnimationFrame(inertiaRequestIdRef.current);
      }
      inertiaRequestIdRef.current = requestAnimationFrame(animateInertia);
    }

    // Функция удаления выделенных объектов
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

    // Обработчики событий
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

        prevPointerRef.current = lastPointerRef.current;
        prevTimeRef.current = lastTimeRef.current;
        lastPointerRef.current = { x: pointer.x, y: pointer.y };
        lastTimeRef.current = performance.now();
        limitPan(canvas);
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

    // Обработка перетаскивания объектов за границы канваса
    const handleObjectMoving = (options) => {
      const obj = options.target;

      // Получаем текущую матрицу трансформации и масштаб канваса
      const zoom = canvas.getZoom();
      const vpt = canvas.viewportTransform;

      // Обновляем координаты объекта с учётом текущего масштаба
      obj.left = (obj.left - vpt[4]) / zoom;
      obj.top = (obj.top - vpt[5]) / zoom;

      // Применяем обратное преобразование, чтобы объект корректно отображался
      obj.left = obj.left * zoom + vpt[4];
      obj.top = obj.top * zoom + vpt[5];
    };

    canvas.on('object:moving', handleObjectMoving);

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

  // Обработка включения/выключения режима рисования
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement || !canvasElement.__canvas) return;
    const canvas = canvasElement.__canvas;
    canvas.isDrawingMode = toggleDrawing;
  }, [toggleDrawing]);

  useEffect(() => {
    if (addTextTrigger) {
      const canvas = canvasRef.current.__canvas;
      const textbox = new Textbox("Первая строка\nВторая строка\nТретья строка", {
        left: 100,  // Позиция текста
        top: 100,
        fontSize: 20,
        fontFamily: 'Helvetica',
        fill: 'black',
        editable: true,
        strokeWidth: 10,
        backgroundColor: 'red',
        textAlign: 'left',
      });

      textbox.setControlsVisibility({
        mt: false, // Верхний
        mb: false, // Нижний
        ml: true, // Левый
        mr: true, // Правый
        mtr: true,  // Верхний поворотный (оставляем, если нужно)
        bl: true,  // Нижний левый угол
        br: true,  // Нижний правый угол
        tl: true,  // Верхний левый угол
        tr: true,  // Верхний правый угол
      });

      canvas.add(textbox);
      console.log(textbox.width)
      canvas.renderAll();

      // Сбрасываем триггер после добавления текста
      resetAddTextTrigger();
    }
  }, [addTextTrigger, resetAddTextTrigger]);

  return (
      <div className="w-screen h-screen overflow-hidden" style={{ position: 'relative' }}>
        <canvas
            ref={canvasRef}
            className="border-0"
        />
      </div>
  );
};

export default CanvasComponent;

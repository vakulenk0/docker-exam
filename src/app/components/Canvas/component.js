// components/Canvas/CanvasComponent.js
'use client';

import {useEffect, useRef, useState} from 'react';
import {ActiveSelection, Canvas, Pattern, PencilBrush, Point, Rect, Textbox} from 'fabric/es';
import ZoomIndicator from "@/app/components/ZoomIndicator/component";
import LeftPanel from "@/app/components/LeftPanel/component";

// Привязка ActiveSelection к Canvas
Canvas.ActiveSelection = ActiveSelection;

const ZOOM_LEVEL_MIN = -5;
const ZOOM_LEVEL_MAX = 3;

const CanvasComponent = ({ toggleDrawing, addTextTrigger, resetAddTextTrigger  }) => {
  const canvasRef = useRef(null);
  const [canvasInstance, setCanvasInstance] = useState(null);

  const zoomLevelRef = useRef(0);
  const [zoomPercent, setZoomPercent] = useState(100);
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

  // // Функция создания паттерна сетки с учетом текущего масштаба
  // function createGridPattern(canvas, color = '#999') {
  //   const zoom = canvas.getZoom();
  //   const gridSize = 50 * zoom;
  //
  //   const gridCanvas = document.createElement('canvas');
  //   gridCanvas.width = gridCanvas.height = gridSize;
  //
  //   const gridCtx = gridCanvas.getContext('2d');
  //   gridCtx.strokeStyle = color; // Цвет линий сетки
  //   gridCtx.lineWidth = 1;
  //
  //   // Рисуем линии сетки
  //   gridCtx.beginPath();
  //   // Горизонтальная линия
  //   gridCtx.moveTo(0, 0);
  //   gridCtx.lineTo(gridSize, 0);
  //   // Вертикальная линия
  //   gridCtx.moveTo(0, 0);
  //   gridCtx.lineTo(0, gridSize);
  //   gridCtx.stroke();
  //
  //   return new Pattern({
  //     source: gridCanvas,
  //     repeat: 'repeat',
  //   });
  // }
  //
  // // Функция применения сетки на Canvas с учетом масштаба
  // function updateGridPattern(canvas, color = '#999') {
  //   const gridPattern = createGridPattern(canvas, color);
  //   canvas.backgroundColor = gridPattern;
  //   canvas.renderAll();
  // }

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const canvas = new Canvas(canvasElement, {
      selectionKey: 'ctrlKey',
      backgroundColor: '#EEF2F9'
    });

    setCanvasInstance(canvas);

    // Применяем динамическую сетку в зависимости от масштаба
    // updateGridPattern(canvas, '#ebebeb');

    // Глобальные границы канваса
    const globalBounds = {
      left: -5000,
      top: -5000,
      right: 5000,
      bottom: 5000,
    };

    // Инициализация freeDrawingBrush
    canvas.freeDrawingBrush = new PencilBrush(canvas, {
      color: '#000',
      width: 1
    });
    canvas.freeDrawingBrush.width = 100;

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
        strokeWidth: 4,
        selectable: false,
        evented: false,
      });
      canvas.add(boundary);
    }

    drawGlobalBounds(canvas);

    // Функция для ограничения панорамирования
    function limitPan(canvas) {
      const vpt = canvas.viewportTransform;
      const zoom = canvas.getZoom();

      const viewWidth = canvas.getWidth();
      const viewHeight = canvas.getHeight();

      const halfViewWidth = viewWidth / 2 / zoom;
      const halfViewHeight = viewHeight / 2 / zoom;

      const xMin = -(globalBounds.right - halfViewWidth);
      const xMax = -globalBounds.left + halfViewWidth;
      const yMin = -(globalBounds.bottom - halfViewHeight);
      const yMax = -globalBounds.top + halfViewHeight;

      vpt[4] = Math.min(Math.max(vpt[4], xMin * zoom), xMax * zoom);
      vpt[5] = Math.min(Math.max(vpt[5], yMin * zoom), yMax * zoom);

      canvas.setViewportTransform(vpt);
    }

    function updateZoomPercent(canvas) {
      const zoom = canvas.getZoom();
      const zoomPercentage = Math.round(zoom * 100);
      setZoomPercent(zoomPercentage);
    }

    const ZOOM_FACTOR = 1.1; // 10% увеличение/уменьшение за шаг

    function zoomIn(point) {
      const currentZoom = canvas.getZoom();
      const newZoom = currentZoom * ZOOM_FACTOR;
      if (newZoom <= Math.pow(2, ZOOM_LEVEL_MAX)) {
        canvas.zoomToPoint(point, newZoom);
        limitPan(canvas);
        zoomLevelRef.current += 1;
        updateZoomPercent(canvas);
      }
    }

    function zoomOut(point) {
      const currentZoom = canvas.getZoom();
      const newZoom = currentZoom / ZOOM_FACTOR;
      if (newZoom >= Math.pow(2, ZOOM_LEVEL_MIN)) {
        canvas.zoomToPoint(point, newZoom);
        limitPan(canvas);
        zoomLevelRef.current -= 1;
        updateZoomPercent(canvas);
      }
    }

    // Функция для подгонки канваса под размер окна
    function resizeCanvas() {
      canvas.setWidth(window.innerWidth);
      canvas.setHeight(window.innerHeight);
      canvas.renderAll();
      // После изменения размера перерисуем сетку с учетом текущего масштаба
      // updateGridPattern(canvas, '#b8b8b8');
      drawGlobalBounds(canvas);
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

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

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

    const handleObjectMoving = (options) => {
      const obj = options.target;
      const zoom = canvas.getZoom();
      const vpt = canvas.viewportTransform;

      obj.left = (obj.left - vpt[4]) / zoom;
      obj.top = (obj.top - vpt[5]) / zoom;

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

    updateZoomPercent(canvas);

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

  const handleToggleDrawing = () => {
    if (canvasInstance) {
      canvasInstance.isDrawingMode = !canvasInstance.isDrawingMode;
    }
  };

  const handleAddText = () => {
    if (!canvasInstance) return;

    const textbox = new Textbox('Введите текст', {
      left: 100,
      top: 100,
      fontSize: 20,
      minWidth: 20,
      dynamicMinWidth: 20,
      fill: '#aaa',
      editable: true,
    });

    textbox.setControlsVisibility({
      mt: false,
      mb: false,
      ml: true,
      mr: true,
      mtr: true,
      bl: true,
      br: true,
      tl: true,
      tr: true,
    });

    canvasInstance.add(textbox);
    canvasInstance.setActiveObject(textbox);
    canvasInstance.renderAll();

    textbox.on('editing:entered', () => {
      if (textbox.text === 'Введите текст') {
        textbox.text = '';
        textbox.set('fill', '#000');
      }
    });

    textbox.on('editing:exited', () => {
      if (textbox.text === '') {
        textbox.text = 'Введите текст';
        textbox.set('fill', '#aaa');
      }
    });
  };

  const handleZoomIn = () => {
    const canvas = canvasRef.current.__canvas;
    const centerPoint = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    if (zoomLevelRef.current < ZOOM_LEVEL_MAX) {
      zoomLevelRef.current++;
      canvas.zoomToPoint(centerPoint, Math.pow(2, zoomLevelRef.current));
      setZoomPercent(Math.round(canvas.getZoom() * 100));
      updateGridPattern(canvas, '#ebebeb');
    }
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current.__canvas;
    const centerPoint = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    if (zoomLevelRef.current > ZOOM_LEVEL_MIN) {
      zoomLevelRef.current--;
      canvas.zoomToPoint(centerPoint, Math.pow(2, zoomLevelRef.current));
      setZoomPercent(Math.round(canvas.getZoom() * 100));
      updateGridPattern(canvas, '#ebebeb');
    }
  };

  return (
      <div className="w-screen h-screen overflow-hidden" style={{position: 'relative'}}>
        <ZoomIndicator
            zoomPercent={zoomPercent}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
        />
        <LeftPanel
            onToggleDrawing={handleToggleDrawing}
            onAddText={handleAddText}
        />
        <canvas
            ref={canvasRef}
            className="border-0"
        />
      </div>
  );
};

export default CanvasComponent;

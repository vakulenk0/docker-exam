'use client';

import { useEffect, useRef, useState } from 'react';
import { ActiveSelection, Canvas, PencilBrush, Point, Rect, Circle, Textbox, FabricObject, Group, Polygon, Ellipse, Triangle, Line, Control, Path, util, controlsUtils } from 'fabric/es';

// =====================================
// Константы и настройки
// =====================================
const ZOOM_LEVEL_MIN = -5;
const ZOOM_LEVEL_MAX = 3;
const ZOOM_FACTOR = 1.1;

Canvas.ActiveSelection = ActiveSelection;

const defaultObjectStyles = {
    borderColor: '#374151',
    cornerColor: '#1f2937',
    cornerStrokeColor: 'black',
    cornerSize: 10,
    transparentCorners: false,
    cornerStyle: 'circle',
    padding: 0,
    borderScaleFactor: 1,
};

// Настройки выделения для ActiveSelection
ActiveSelection.ownDefaults = {
    ...defaultObjectStyles,
};

// Настройки выделения для остальных объектов
FabricObject.ownDefaults = {
    ...defaultObjectStyles,
};

// =====================================
// Хук useCanvasLogic
// =====================================
export function useCanvasLogic() {
    // ============================
    // Рефы и стейт
    // ============================
    const canvasRef = useRef(null);
    const canvasInstanceRef = useRef(null);
    const isAddingTextRef = useRef(false);
    const isAddingFigureRef = useRef(false);
    const [activeMode, setActiveMode] = useState(null);
    const [figureType, setFigureType] = useState(null);

    const zoomLevelRef = useRef(0);
    const [zoomPercent, setZoomPercent] = useState(100);

    const panningActiveRef = useRef(false);
    const mouseDownPointRef = useRef(null);

    const prevPointerRef = useRef(null);
    const prevTimeRef = useRef(null);
    const lastPointerRef = useRef(null);
    const lastTimeRef = useRef(null);

    const inertiaRequestIdRef = useRef(null);
    const velocityRef = useRef({ x: 0, y: 0 });

    const ctrlPressedRef = useRef(false);

    // Глобальные границы холста
    const globalBounds = {
        left: -5000,
        top: -5000,
        right: 5000,
        bottom: 5000,
    };

    // ============================
    // Вспомогательные функции
    // ============================

    // Отрисовка глобальных границ
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

    // Ограничение панорамирования
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

    // Обновление процента зума
    function updateZoomPercent(canvas) {
        const zoom = canvas.getZoom();
        const zoomPercentage = Math.round(zoom * 100);
        setZoomPercent(zoomPercentage);
    }

    // Зумирование внутрь
    function zoomIn(point) {
        const canvas = canvasInstanceRef.current;
        const currentZoom = canvas.getZoom();
        const newZoom = currentZoom * ZOOM_FACTOR;
        if (newZoom <= Math.pow(2, ZOOM_LEVEL_MAX)) {
            canvas.zoomToPoint(point, newZoom);
            limitPan(canvas);
            zoomLevelRef.current += 1;
            updateZoomPercent(canvas);
        }
    }

    // Зумирование наружу
    function zoomOut(point) {
        const canvas = canvasInstanceRef.current;
        const currentZoom = canvas.getZoom();
        const newZoom = currentZoom / ZOOM_FACTOR;
        if (newZoom >= Math.pow(2, ZOOM_LEVEL_MIN)) {
            canvas.zoomToPoint(point, newZoom);
            limitPan(canvas);
            zoomLevelRef.current -= 1;
            updateZoomPercent(canvas);
        }
    }

    // Анимация инерции панорамирования
    function animateInertia() {
        const canvas = canvasInstanceRef.current;
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

    // Запуск инерции
    function startInertia() {
        if (inertiaRequestIdRef.current) {
            cancelAnimationFrame(inertiaRequestIdRef.current);
        }
        inertiaRequestIdRef.current = requestAnimationFrame(animateInertia);
    }

    // Удаление выбранных объектов
    function deleteSelectedObjects() {
        const currentCanvas = canvasInstanceRef.current;
        if (!currentCanvas) return;
        const activeObjects = currentCanvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach((obj) => currentCanvas.remove(obj));
            currentCanvas.discardActiveObject();
            currentCanvas.renderAll();
        }
    }

    // Ресайз холста под окно
    function resizeCanvas() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;
        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight);
        canvas.renderAll();
        drawGlobalBounds(canvas);
        canvas.renderAll();
    }


    // ============================
    // Обработчики событий
    // ============================

    // Колёсико мыши для зума
    const handleMouseWheel = (event) => {
        event.preventDefault();
        const canvas = canvasInstanceRef.current;
        const delta = event.deltaY;
        const pointer = canvas.getPointer(event, true);
        const point = new Point(pointer.x, pointer.y);
        if (delta < 0) {
            zoomIn(point);
        } else if (delta > 0) {
            zoomOut(point);
        }
    };

    // Нажатие средней кнопки мыши для панорамирования
    const handleMouseDown = (event) => {
        const canvas = canvasInstanceRef.current;
        if (event.button === 1 && !canvas.isDrawingMode) {
            event.preventDefault();
            canvas.defaultCursor = 'grabbing';
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

    // Добавление текста при клике
    const handleCanvasMouseDown = (event) => {
        const canvas = canvasInstanceRef.current;
        if (isAddingTextRef.current) {
            const pointer = canvas.getPointer(event.e);
            const textbox = new Textbox('Введите текст', {
                left: pointer.x,
                top: pointer.y,
                fontSize: 20,
                minWidth: 20,
                dynamicMinWidth: 20,
                fill: '#aaa',
                editable: true,
                ...defaultObjectStyles,
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

            canvas.add(textbox);
            canvas.setActiveObject(textbox);
            canvas.renderAll();

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

            isAddingTextRef.current = false;
            setActiveMode(null);
        }
        else if (isAddingFigureRef.current) {
            console.log("DADADAD");
            const pointer = canvas.getPointer(event.e);
            switch (figureType) {
                case "square": {
                    const square = new Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 50,
                        height: 50,
                        fill: 'transparent',
                        borderColor: 'black',
                    });
                    canvas.add(square);
                    canvas.setActiveObject(square);
                    canvas.renderAll();
                    isAddingFigureRef.current = false;
                    setFigureType(null);
                }
                break;
                case "circle": {
                    const circle = new Circle({
                        left: pointer.x,
                        top: pointer.y,
                        radius: 50,
                        fill: 'transparent',
                        borderColor: 'black',
                    });
                    canvas.add(circle);
                    canvas.setActiveObject(circle);
                    canvas.renderAll();
                    isAddingFigureRef.current = false;
                    setFigureType(null);
                }
                break;
                case "ellipse": {
                    const ellipse = new Ellipse({
                        left: pointer.x,
                        top: pointer.y,
                        rx: 100,
                        ry: 50,
                    });
                    canvas.add(ellipse);
                    canvas.setActiveObject(ellipse);
                    canvas.renderAll();
                    isAddingFigureRef.current = false;
                    setFigureType(null);
                }
                break;
                case "rhombus": {
                    let points = [
                        {x: pointer.x, y: pointer.y - 50},  // Верхняя вершина
                        {x: pointer.x + 50, y: pointer.y}, // Правая вершина
                        {x: pointer.x, y: pointer.y + 50}, // Нижняя вершина
                        {x: pointer.x - 50, y: pointer.y}   // Левая вершина
                    ];

                    let rhombus = new Polygon(points, {
                        fill: 'transparent',
                        stroke: 'black',
                        strokeWidth: 1,
                    });
                    canvas.add(rhombus);
                    canvas.setActiveObject(rhombus);
                    canvas.renderAll();
                    isAddingFigureRef.current = false;
                    setFigureType(null);
                }
                break;
                case "star": {
                    let starPoints = [
                        { x: pointer.x, y: pointer.y - 50 },   // Вершина 1
                        { x: pointer.x + 11, y: pointer.y - 15 },  // Вершина 2
                        { x: pointer.x + 48, y: pointer.y - 15 },  // Вершина 3
                        { x: pointer.x + 34, y: pointer.y + 7 },  // Вершина 4
                        { x: pointer.x + 39, y: pointer.y + 41 },  // Вершина 5
                        { x: pointer.x, y: pointer.y + 20 },  // Вершина 6
                        { x: pointer.x - 39, y: pointer.y + 41 },  // Вершина 7
                        { x: pointer.x - 34, y: pointer.y + 7 },  // Вершина 8
                        { x: pointer.x - 48, y: pointer.y - 15 },   // Вершина 9
                        { x: pointer.x - 11, y: pointer.y - 15 }  // Вершина 10
                    ];

                    let star = new Polygon(starPoints, {
                        fill: 'transparent',
                        stroke: 'black',
                        strokeWidth: 1,
                    });
                    canvas.add(star);
                    canvas.setActiveObject(star);
                    canvas.renderAll();
                    isAddingFigureRef.current = false;
                    setFigureType(null);
                }
                break;
                case "triangle": {
                    const triangle = new Triangle({
                        left: pointer.x,
                        top: pointer.y,
                        width: 50,
                        height: 50,
                        fill: 'transparent',
                        borderColor: 'black',
                    });
                    canvas.add(triangle);
                    canvas.setActiveObject(triangle);
                    canvas.renderAll();
                    isAddingFigureRef.current = false;
                    setFigureType(null);
                }
                break;
            }
        }
    };

    // Движение мыши при панорамировании
    const handleMouseMove = (event) => {
        const canvas = canvasInstanceRef.current;
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

    // Отпускание средней кнопки мыши и запуск инерции
    const handleMouseUp = (event) => {
        const canvas = canvasInstanceRef.current;
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

    // Нажатия клавиш
    const handleKeyDown = (event) => {
        if (event.key === 'Control') {
            ctrlPressedRef.current = true;
        } else if (event.key === 'Delete' || event.key === 'Del' || event.keyCode === 46) {
            deleteSelectedObjects();
        }
    };

    const handleKeyUp = (event) => {
        if (event.key === 'Control') {
            ctrlPressedRef.current = false;
        }
    };

    // Перемещение объектов
    const handleObjectMoving = (options) => {
        const canvas = canvasInstanceRef.current;
        const obj = options.target;
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;

        obj.left = (obj.left - vpt[4]) / zoom;
        obj.top = (obj.top - vpt[5]) / zoom;

        obj.left = obj.left * zoom + vpt[4];
        obj.top = obj.top * zoom + vpt[5];
    };

    // ============================
    // Инициализация и размонтирование
    // ============================
    useEffect(() => {
        // Инициализация canvas
        const canvasElement = canvasRef.current;
        const canvas = new Canvas(canvasElement, {
            selectionKey: 'ctrlKey',
            backgroundColor: '#EEF2F9',
        });

        canvasInstanceRef.current = canvas;

        // Настройка рисования карандашом
        canvas.freeDrawingBrush = new PencilBrush(canvas, {
            color: '#000',
            width: 1,
        });
        canvas.freeDrawingBrush.width = 100;

        // Примерные объекты на холсте
        const rect1 = new Rect({
            left: 0,
            top: 0,
            width: 50,
            height: 50,
            fill: '#faa',
        });
        const rect2 = new Rect({
            left: 500,
            top: 300,
            width: 50,
            height: 50,
            fill: '#afa',
        });

        canvas.add(rect1);
        canvas.add(rect2);

        const starPoints = [
            { x: 50, y: 0 },
            { x: 61, y: 35 },
            { x: 98, y: 35 },
            { x: 68, y: 57 },
            { x: 79, y: 91 },
            { x: 50, y: 70 },
            { x: 21, y: 91 },
            { x: 32, y: 57 },
            { x: 2, y: 35 },
            { x: 39, y: 35 },
        ];

        const star = new Polygon(starPoints, {
            left: 100,
            top: 100,
            fill: 'yellow',
            stroke: 'black',
            strokeWidth: 2
        });

        canvas.add(star);

        const diamondWithRect = new Rect({
            left: 200,
            top: 200,
            fill: 'cyan',
            width: 100,
            height: 100,
            angle: 45
        });

        canvas.add(diamondWithRect);


        drawGlobalBounds(canvas);
        const boundary = canvas.getObjects().find((obj) => obj.stroke === 'blue');
        if (boundary) {
            canvas.sendObjectToBack(boundary);
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // События для mouse wheel зума и панорамирования
        canvas.wrapperEl.addEventListener('wheel', handleMouseWheel, { passive: false });
        canvas.wrapperEl.addEventListener('mousedown', handleMouseDown);
        canvas.wrapperEl.addEventListener('mousemove', handleMouseMove);
        canvas.wrapperEl.addEventListener('mouseup', handleMouseUp);

        // События canvas
        canvas.on('mouse:down', handleCanvasMouseDown);
        canvas.on('object:moving', handleObjectMoving);
        canvas.on('object:moving', (e) => {
            e.target.hasControls = false;
        });
        canvas.on('object:modified', (e) => {
            e.target.hasControls = true;
        });

        // События клавиатуры
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp);

        updateZoomPercent(canvas);
        canvasElement.__canvas = canvas;

        // Очистка при размонтировании
        return () => {
            canvas.wrapperEl.removeEventListener('wheel', handleMouseWheel);
            canvas.wrapperEl.removeEventListener('mousedown', handleMouseDown);
            canvas.wrapperEl.removeEventListener('mousemove', handleMouseMove);
            canvas.wrapperEl.removeEventListener('mouseup', handleMouseUp);
            canvas.off('mouse:down', handleCanvasMouseDown);
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', resetHighlight);

            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', resizeCanvas);

            if (inertiaRequestIdRef.current) {
                cancelAnimationFrame(inertiaRequestIdRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================
    // Публичные методы
    // ============================
    const handleToggleDrawing = () => {
        const canvas = canvasInstanceRef.current;
        if (canvas) {
            isAddingTextRef.current = false;
            setActiveMode((prevMode) => {
                const isDrawing = prevMode === 'drawing';
                canvas.isDrawingMode = !isDrawing;
                return isDrawing ? null : 'drawing';
            });
        }
    };

    const handleEnableTextAdding = () => {
        const canvas = canvasInstanceRef.current;
        if (canvas) {
            canvas.defaultCursor = "text"
            canvas.isDrawingMode = false;
            setActiveMode('textAdding');
            isAddingTextRef.current = true;
        }
    };

    const handleAddFigure = (figureType) => {
        const canvas = canvasInstanceRef.current;
        if (canvas) {
            setFigureType(figureType);
            isAddingFigureRef.current = true;
            console.log('isAddingFigureRef:', isAddingFigureRef.current);
            canvas.isDrawingMode = false;
            canvas.selection = true;
            isAddingTextRef.current = false;
            setActiveMode("figureAdding");
        }
    }

    const handleZoomInButton = () => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const zoom = canvas.getZoom(); // Текущий зум
        const newZoom = zoom * ZOOM_FACTOR;

        if (newZoom > Math.pow(2, ZOOM_LEVEL_MAX)) return; // Проверка на максимальный зум

        const center = canvas.getCenter(); // Центр холста в координатах системы
        canvas.zoomToPoint(new Point(center.left, center.top), newZoom); // Зум к центру

        zoomLevelRef.current = Math.log2(newZoom); // Обновляем текущий уровень зума
        setZoomPercent(Math.round(newZoom * 100));
        canvas.renderAll();
    };

    const handleZoomOutButton = () => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const zoom = canvas.getZoom();
        const newZoom = zoom / ZOOM_FACTOR;

        if (newZoom < Math.pow(2, ZOOM_LEVEL_MIN)) return; // Проверка на минимальный зум

        const center = canvas.getCenter(); // Центр холста в координатах системы
        canvas.zoomToPoint(new Point(center.left, center.top), newZoom); // Зум к центру

        zoomLevelRef.current = Math.log2(newZoom); // Обновляем текущий уровень зума
        setZoomPercent(Math.round(newZoom * 100));
        canvas.renderAll();
    };

    return {
        canvasRef,
        activeMode,
        zoomPercent,
        handleToggleDrawing,
        handleEnableTextAdding,
        handleZoomInButton,
        handleZoomOutButton,
        handleAddFigure,
    };
}
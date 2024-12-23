'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ActiveSelection,
    Canvas,
    PencilBrush,
    Point,
    Rect,
    Circle,
    Textbox,
    FabricObject,
    Polygon,
    Ellipse,
    Triangle,
    Image, Group, util,
} from 'fabric';
import CanvasHistory from "@/app/components/Canvas/CanvasHistory";

// ======================[ Константы для зума ]======================
const ZOOM_LEVEL_MIN = -3;
const ZOOM_LEVEL_MAX = 3;
const ZOOM_FACTOR = 1.1;

// ======================[ Общий стиль для объектов ]======================
const defaultObjectStyles = {
    borderColor: '#374151',
    cornerColor: '#1f2937',
    cornerStrokeColor: '#627ca1',
    cornerSize: 10,
    transparentCorners: false,
    padding: 0,
    borderScaleFactor: 1,
    selectable: true,
    evented: true,
};

// Применяем общий стиль для объектов Fabric
FabricObject.ownDefaults = {
    ...defaultObjectStyles,
};

FabricObject.prototype.toObject = (function (toObject) {
    return function () {
        return {
            ...toObject.call(this),
            borderColor: this.borderColor,
            cornerColor: this.cornerColor,
            cornerSize: this.cornerSize,
            cornerStrokeColor: this.cornerStrokeColor,
            transparentCorners: this.transparentCorners,
            selectable: this.selectable,
            evented: this.evented,
        };
    };
})(FabricObject.prototype.toObject);

Textbox.prototype.toObject = (function (toObject) {
    return function () {
        return {
            ...toObject.call(this),
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fill: this.fill,
        };
    };
})(Textbox.prototype.toObject);

Image.prototype.toObject = (function (toObject) {
    return function () {
        return {
            ...toObject.call(this),
            src: this._element.src, // Сохраняем путь к изображению
        };
    };
})(Image.prototype.toObject);

// ======================[ Хук с логикой для Canvas ]======================
export function useCanvasLogic() {
    const canvasRef = useRef(null);
    const canvasInstanceRef = useRef(null);
    const canvasHistoryRef = useRef(null);

    // Рефы для отслеживания режима добавления текста / фигур
    const isAddingTextRef = useRef(false);
    const isAddingFigureRef = useRef(false);
    const figureTypeRef = useRef(null);

    // Режим активной операции (drawing, textAdding, figureAdding, etc.)
    const [activeMode, setActiveMode] = useState(null);

    // Зум
    const zoomLevelRef = useRef(0);
    const [zoomPercent, setZoomPercent] = useState(100);
    const isZoomingRef = useRef(false);

    // Координаты центра
    const [centerCoordinates, setCenterCoordinates] = useState({ x: 0, y: 0 });

    // Для панорамирования
    const panningActiveRef = useRef(false);
    const mouseDownPointRef = useRef(null);

    // Для инерции панорамирования
    const prevPointerRef = useRef(null);
    const prevTimeRef = useRef(null);
    const lastPointerRef = useRef(null);
    const lastTimeRef = useRef(null);
    const inertiaRequestIdRef = useRef(null);
    const velocityRef = useRef({ x: 0, y: 0 });

    // Для копирования/вставки
    const clipboardRef = useRef(null);

    // Контекстное меню
    const [contextMenu, setContextMenu] = useState({
        isVisible: false,
        position: { x: 0, y: 0 },
        target: null,
    });

    const [textMenu, setTextMenu] = useState({
        isVisible: false,
        position: { x: 0, y: 0 },
        target: null,
    });

    const [objectMenu, setObjectMenu] = useState({
        isVisible: false,
        position: { x: 0, y: 0 },
        target: null,
    });

    const [brushSettings, setBrushSettings] = useState({
        color: '#000000',
        width: 5,
        opacity: 1.0,
    });

    async function saveToDatabase() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const state = canvas.getObjects()
            .filter(obj => !obj.isBoundary)
            .map(obj => obj.toObject());

        try {
            const response = await fetch('/api/saveCanvas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ canvasState: JSON.stringify(state) }),
            });

            if (response.ok) {
                console.log('Canvas state saved to database.');
            } else {
                console.error('Failed to save canvas state to database.');
            }
        } catch (error) {
            console.error('Error saving canvas state to database:', error);
        }
    }

    async function loadFromDatabase() {
        try {
            const response = await fetch('/api/saveCanvas');
            if (response.ok) {
                const { state } = await response.json();
                const objects = await util.enlivenObjects(JSON.parse(state));
                objects.forEach((obj) => canvasInstanceRef.current.add(obj));
                canvasInstanceRef.current.renderAll();
                console.log('Canvas state loaded from database.');
            } else {
                console.error('Failed to load canvas state from database.');
            }
        } catch (error) {
            console.error('Error loading canvas state from database:', error);
        }
    }

    function handleUndo() {
        if (canvasHistoryRef.current) {
            canvasHistoryRef.current.undo();
        } else {
            console.warn('Canvas history is not initialized.');
        }
    }

    function handleRedo() {
        if (canvasHistoryRef.current) {
            canvasHistoryRef.current.redo();
        } else {
            console.warn('Canvas history is not initialized.');
        }
    }

    const handleUpdateBrush = (property, value) => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const brush = canvas.freeDrawingBrush;
        if (property === 'color') brush.color = value;
        if (property === 'width') brush.width = value;
        if (property === 'opacity') brush.opacity = value;

        setBrushSettings((prev) => ({
            ...prev,
            [property]: value,
        }));
    };

    // ======================[ Обработчики TextMenu ]======================
    function handleObjectSelectionChange() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;

        // Если ничего не выделено — скрываем оба меню
        if (!activeObject) {
            setTextMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
            setObjectMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
            return;
        }

        // Логика позиции меню
        const boundingRect = activeObject.getBoundingRect(false);

        // Если объект текстовый — показываем текстовое меню
        if (activeObject.type === 'textbox') {
            const left = boundingRect.left * zoom + vpt[4] + (boundingRect.width * zoom) / 2 - 120;
            const top = boundingRect.top * zoom + vpt[5] - 100;
            setTextMenu({
                isVisible: true,
                position: { x: left, y: top },
                target: activeObject,
            });
            setObjectMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
        } else if (
            activeObject.type !== 'image' && // Не показывать меню объектов для изображений
            activeObject.type !== 'video'   // Не показывать меню объектов для видео
        ) {
            const left = boundingRect.left * zoom + vpt[4] + (boundingRect.width * zoom) / 2 - 150;
            const top = boundingRect.top * zoom + vpt[5] - 110;
            setObjectMenu({
                isVisible: true,
                position: { x: left, y: top },
                target: activeObject,
            });
            setTextMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
        } else {
            // Скрываем оба меню для неподдерживаемых типов
            setTextMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
            setObjectMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
        }
    }

    function updateTextMenuPosition() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject || activeObject.type !== 'textbox') {
            setTextMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
            return;
        }

        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;
        const boundingRect = activeObject.getBoundingRect(false);

        const left = boundingRect.left * zoom + vpt[4] + (boundingRect.width * zoom) / 2 - 120;
        const top = boundingRect.top * zoom + vpt[5] - 100;

        setTextMenu({
            isVisible: true,
            position: { x: left, y: top },
            target: activeObject,
        });
    }

    function updateObjectMenuPosition() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (
            !activeObject ||
            activeObject.type === 'textbox' ||
            activeObject.type === 'image' ||  // Не обновляем позицию меню для изображений
            activeObject.type === 'video'    // Не обновляем позицию меню для видео
        ) {
            setObjectMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
            return;
        }

        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;
        const boundingRect = activeObject.getBoundingRect(false);

        const left = boundingRect.left * zoom + vpt[4] + (boundingRect.width * zoom) / 2 - 150;
        const top = boundingRect.top * zoom + vpt[5] - 110;

        setObjectMenu({
            isVisible: true,
            position: { x: left, y: top },
            target: activeObject,
        });
    }

    function handleUpdateText(property, value) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'textbox') {
            activeObject.set(property, value);
            canvas.renderAll();
        }
    }

    function handleUpdateObject(property, value) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            activeObject.set(property, value);
            canvas.renderAll();
        }
    }


    // ======================[ Обработчики ContextMenu ]======================
    function handleDomContextMenu(event) {
        event.preventDefault();
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const pointer = canvas.getPointer(event, true);
        const target = canvas.findTarget(event, true);

        if (target) {
            canvas.setActiveObject(target);
            canvas.renderAll();

            setContextMenu({
                isVisible: true,
                position: { x: event.pageX, y: event.pageY },
                target,
            });
        } else {
            setContextMenu({
                isVisible: false,
                position: { x: 0, y: 0 },
                target: null,
            });
        }
    }


    const handleCloseContextMenu = () => {
        setContextMenu({
            isVisible: false,
            position: { x: 0, y: 0 },
            target: null,
        });
    };

    // ======================[ Дополнительный функционал ContextMenu (некоторый функции в других секциях) ]======================
    function handleBringToFront() {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.bringObjectForward(activeObject);
            canvas.renderAll();
        }
    }

    function handleSendToBack() {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.sendObjectBackwards(activeObject);
            canvas.renderAll();
        }
    }

    function handleGroupObjects() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        // Получаем выделенные объекты
        const activeObjects = canvas.getActiveObjects();

        if (activeObjects.length > 1) {
            const group = new Group(activeObjects, {
                originX: 'left',
                originY: 'top',
                borderColor: '#374151',
                cornerColor: '#1f2937',
                cornerStrokeColor: '#627ca1',
                cornerSize: 10,
                transparentCorners: false,
            });

            activeObjects.forEach(obj => canvas.remove(obj));

            canvas.add(group);
            canvas.fire('custom:added');
            canvas.setActiveObject(group);
            canvas.requestRenderAll();
        } else {
            console.warn('At least two objects must be selected for grouping.');
        }
    }

    function handleUngroupObjects() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();

        if (activeObject && activeObject.type === 'group') {
            canvas.remove(activeObject);

            const groupItems = activeObject.removeAll();
            canvas.add(...groupItems);
            canvas.fire('custom:added');

            canvas.discardActiveObject();
            canvas.requestRenderAll();
        } else {
            console.warn('The selected object is not a group.');
        }
    }

    function handleRotate90() {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            const currentAngle = activeObject.angle || 0;
            activeObject.set('angle', (currentAngle + 90) % 360);
            activeObject.setCoords();
            canvas.renderAll();
        }
    }

    function handleRotate180() {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            const currentAngle = activeObject.angle || 0;
            activeObject.set('angle', (currentAngle + 180) % 360);
            activeObject.setCoords();
            canvas.renderAll();
        }
    }

    function handleFlipHorizontal() {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            activeObject.set('flipX', !activeObject.flipX);
            canvas.renderAll();
        }
    }

    function handleFlipVertical() {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            activeObject.set('flipY', !activeObject.flipY);
            canvas.renderAll();
        }
    }

    async function handleDuplicate() {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        const cloned = await activeObject.clone();
        cloned.left += 10;
        cloned.top += 10;

        canvas.add(cloned);
        canvas.fire('custom:added');
        canvas.setActiveObject(cloned);
        canvas.renderAll();
    }

    // ======================[ Обновляем координаты центра ]======================
    function updateCenterCoordinates() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const vpt = canvas.viewportTransform;
        const zoom = canvas.getZoom();
        const center = {
            x: (canvas.width / 2 - vpt[4]) / zoom,
            y: (canvas.height / 2 - vpt[5]) / zoom,
        };
        setCenterCoordinates({
            x: Math.round(center.x),
            y: Math.round(center.y),
        });
    }

    // ======================[ Копирование / Вставка ]======================
    const handleCopy = async () => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) {
            console.warn('No active object to copy');
            return;
        }

        const cloned = await activeObject.clone();
        clipboardRef.current = cloned;
        console.log('Copied to clipboard:', cloned);
    };

    const handlePaste = async () => {
        const canvas = canvasInstanceRef.current;
        if (!canvas || !clipboardRef.current) {
            console.warn('Clipboard is empty or canvas not initialized');
            return;
        }

        try {
            const clonedObj = await clipboardRef.current.clone();

            clonedObj.left += 10;
            clonedObj.top += 10;

            clonedObj.set({
                borderColor: '#374151',
                cornerColor: '#1f2937',
                cornerStrokeColor: '#627ca1',
                cornerSize: 10,
                transparentCorners: false,
                evented: true,
            });

            if (clonedObj instanceof ActiveSelection) {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    obj.set({
                        borderColor: '#374151',
                        cornerColor: '#1f2937',
                        cornerStrokeColor: '#627ca1',
                        cornerSize: 10,
                        transparentCorners: false,
                        evented: true,
                    });
                    canvas.add(obj);
                    canvas.fire('custom:added');
                });
                clonedObj.setCoords();
            } else {
                canvas.add(clonedObj);
                canvas.fire('custom:added');
            }

            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            console.log('Pasted from clipboard:', clonedObj);
        } catch (error) {
            console.error('Error during paste:', error);
        }
    };

    // ======================[ Опции ContextMenu ]======================
    const menuOptions = [
        { label: 'Удалить', onClick: handleDeleteSelected },
        { label: 'Копировать', onClick: handleCopy },
        { label: 'Вставить', onClick: handlePaste },
        { label: 'Дублировать', onClick: handleDuplicate },
        { label: 'На передний план', onClick: handleBringToFront },
        { label: 'На задний план', onClick: handleSendToBack },
        { label: 'Сгруппировать', onClick: handleGroupObjects },
        { label: 'Разгруппировать', onClick: handleUngroupObjects },
        { label: 'Повернуть на 90°', onClick: handleRotate90 },
        { label: 'Повернуть на 180°', onClick: handleRotate180 },
        { label: 'Отразить горизонтально', onClick: handleFlipHorizontal },
        { label: 'Отразить вертикально', onClick: handleFlipVertical },
    ];

    // ======================[ Ограничения границ ]======================
    const globalBounds = {
        left: -5000,
        top: -5000,
        right: 5000,
        bottom: 5000,
    };
    let boundary = null;

    function drawGlobalBounds(canvas) {
        if (boundary) return;
        boundary = new Rect({
            left: globalBounds.left,
            top: globalBounds.top,
            width: globalBounds.right - globalBounds.left,
            height: globalBounds.bottom - globalBounds.top,
            fill: 'transparent',
            stroke: 'blue',
            strokeWidth: 4,
            selectable: false,
            evented: false,
            isBoundary: true,
        });

        canvas.add(boundary);
        canvas.sendObjectToBack(boundary);
    }

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

    // ======================[ Зум ]======================
    function updateZoomPercent(canvas) {
        const zoom = canvas.getZoom();
        setZoomPercent(Math.round(zoom * 100));
    }

    function handleZoomIn(point) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        isZoomingRef.current = true; // Устанавливаем флаг

        const currentZoom = canvas.getZoom();
        const newZoom = currentZoom * ZOOM_FACTOR;
        if (newZoom <= Math.pow(2, ZOOM_LEVEL_MAX)) {
            canvas.zoomToPoint(point, newZoom);
            limitPan(canvas);
            zoomLevelRef.current += 1;
            updateZoomPercent(canvas);
        }

        isZoomingRef.current = false; // Сбрасываем флаг
    }

    function handleZoomOut(point) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        isZoomingRef.current = true; // Устанавливаем флаг

        const currentZoom = canvas.getZoom();
        const newZoom = currentZoom / ZOOM_FACTOR;
        if (newZoom >= Math.pow(2, ZOOM_LEVEL_MIN)) {
            canvas.zoomToPoint(point, newZoom);
            limitPan(canvas);
            zoomLevelRef.current -= 1;
            updateZoomPercent(canvas);
        }

        isZoomingRef.current = false; // Сбрасываем флаг
    }

    function handleZoomInButton() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const zoom = canvas.getZoom();
        const newZoom = zoom * ZOOM_FACTOR;
        if (newZoom > Math.pow(2, ZOOM_LEVEL_MAX)) return;

        const center = canvas.getCenter();
        canvas.zoomToPoint(new Point(center.left, center.top), newZoom);
        zoomLevelRef.current = Math.log2(newZoom);
        updateZoomPercent(canvas);
        canvas.renderAll();
    }

    function handleZoomOutButton() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const zoom = canvas.getZoom();
        const newZoom = zoom / ZOOM_FACTOR;
        if (newZoom < Math.pow(2, ZOOM_LEVEL_MIN)) return;

        const center = canvas.getCenter();
        canvas.zoomToPoint(new Point(center.left, center.top), newZoom);
        zoomLevelRef.current = Math.log2(newZoom);
        updateZoomPercent(canvas);
        canvas.renderAll();
    }

    // ======================[ Инерция ]======================
    function animateInertia() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

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

    function startInertia() {
        if (inertiaRequestIdRef.current) {
            cancelAnimationFrame(inertiaRequestIdRef.current);
        }
        inertiaRequestIdRef.current = requestAnimationFrame(animateInertia);
    }

    // ======================[ Создание фигур и текстбоксов ]======================
    function createFigure(type, pointer) {
        const commonProps = {
            left: pointer.x,
            top: pointer.y,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 1,
            originX: 'center',
            originY: 'center',
            ...defaultObjectStyles,
        };

        switch (type) {
            case 'circle':
                return new Circle({ ...commonProps, radius: 50 });
            case 'square':
                return new Rect({ ...commonProps, width: 100, height: 100 });
            case 'ellipse':
                return new Ellipse({ ...commonProps, rx: 100, ry: 50 });
            case 'triangle':
                return new Triangle({ ...commonProps, width: 100, height: 100 });
            case 'rhombus': {
                const points = [
                    { x: pointer.x, y: pointer.y - 50 },
                    { x: pointer.x + 50, y: pointer.y },
                    { x: pointer.x, y: pointer.y + 50 },
                    { x: pointer.x - 50, y: pointer.y },
                ];
                return new Polygon(points, { ...commonProps });
            }
            case 'star': {
                const createStarPoints = (centerX, centerY, outerRadius, innerRadius, numPoints) => {
                    const pts = [];
                    const angleStep = Math.PI / numPoints;
                    for (let i = 0; i < 2 * numPoints; i++) {
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const angle = i * angleStep - Math.PI / 2;
                        pts.push({
                            x: centerX + radius * Math.cos(angle),
                            y: centerY + radius * Math.sin(angle),
                        });
                    }
                    return pts;
                };
                const starPoints = createStarPoints(pointer.x, pointer.y, 50, 20, 5);
                return new Polygon(starPoints, { ...commonProps });
            }
            default:
                console.warn('Unknown figure type:', type);
                return null;
        }
    }

    function createTextbox(pointer) {
        const textbox = new Textbox('Введите текст', {
            left: pointer.x,
            top: pointer.y,
            fontSize: 20,
            minWidth: 20,
            dynamicMinWidth: 20,
            fill: '#c0c0c0',
            editable: true,
            originX: 'center',
            originY: 'center',
            selectable: true,
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

        return textbox;
    }

    // ======================[ Ресайз Canvas ]======================
    function handleResizeCanvas() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight);

        drawGlobalBounds(canvas);
        canvas.renderAll();
    }

    // ======================[ Мышиные события на DOM-элементе canvas ]======================
    function handleDomMouseWheel(event) {
        event.preventDefault();
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const delta = event.deltaY;
        const pointer = canvas.getPointer(event, true);
        const point = new Point(pointer.x, pointer.y);
        if (delta < 0) {
            handleZoomIn(point);
        } else if (delta > 0) {
            handleZoomOut(point);
        }
    }

    function handleDomMouseDown(event) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        // Средняя кнопка (колесо) — панорамирование
        if (event.button === 1 && !canvas.isDrawingMode) {
            event.preventDefault();
            canvas.defaultCursor = 'grabbing';
            canvas.selection = false;
            panningActiveRef.current = true;
            const pointer = canvas.getPointer(event, true);
            mouseDownPointRef.current = new Point(pointer.x, pointer.y);

            // Сбрасываем инерцию
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
    }

    function handleDomMouseMove(event) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

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
    }

    function handleDomMouseUp(event) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        // Завершаем панорамирование средней кнопкой
        if (event.button === 1 && !canvas.isDrawingMode) {
            canvas.defaultCursor = 'default';
            canvas.selection = true;
            panningActiveRef.current = false;

            if (
                lastPointerRef.current &&
                prevPointerRef.current &&
                prevTimeRef.current &&
                lastTimeRef.current
            ) {
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
    }

    // ======================[ Мышиные события Fabric Canvas ]======================
    function handleCanvasMouseDown(options) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const pointer = canvas.getPointer(options.e);

        // Добавление текста
        if (isAddingTextRef.current) {
            const textbox = createTextbox(pointer);
            canvas.add(textbox);
            canvas.fire('custom:added');
            canvas.setActiveObject(textbox);
            canvas.renderAll();

            isAddingTextRef.current = false;
            setActiveMode(null);
            return;
        }

        // Добавление фигур
        if (isAddingFigureRef.current) {
            const figure = createFigure(figureTypeRef.current, pointer);
            if (figure) {
                canvas.add(figure);
                canvas.fire('custom:added');
                canvas.setActiveObject(figure);
                canvas.renderAll();
            }

            isAddingFigureRef.current = false;
            figureTypeRef.current = null;
            setActiveMode(null);
            return;
        }
    }

    // ======================[ Клавиатурные события ]======================
    function handleWindowKeyDown(event) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        // Удаление выделенных
        if (event.key === 'Delete' || event.key === 'Del') {
            handleDeleteSelected();
        }

        // Копирование (Ctrl+C)
        if (event.ctrlKey && event.code === 'KeyC') {
            handleCopy();
        }

        // Вставка (Ctrl+V)
        if (event.ctrlKey && event.code === 'KeyV') {
            handlePaste();
        }

        if (event.ctrlKey && event.code === 'KeyZ') {
            event.preventDefault()
            handleUndo(); // Ctrl+Z
        }
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyZ') {
            event.preventDefault()
            handleRedo(); // Ctrl+Shift+Z
        }
    }

    function handleWindowKeyUp(event) {
        // Можно обрабатывать Shift/Alt/Ctrl если нужно
    }

    // ======================[ Удаление выделенных объектов ]======================
    function handleDeleteSelected() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach((obj) => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    }

    // ======================[ Обработчик события выделения ]======================
    function handleSelectionCreated() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'activeselection') {
            activeObject.set({
                borderColor: '#374151',
                cornerColor: '#1f2937',
                cornerSize: 10,
                transparentCorners: false,
                cornerStrokeColor: '#627ca1',
                padding: 0,
                borderScaleFactor: 1,
                selectable: true,
                evented: true,
            });
            canvas.renderAll();
        }
    }

    // ======================[ Инициализация canvas ]======================
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        const canvas = new Canvas(canvasElement, {
            backgroundColor: '#EEF2F9',
            selection: true,
        });
        canvasInstanceRef.current = canvas;

        const canvasHistory = new CanvasHistory(canvas);
        canvasHistoryRef.current = canvasHistory; // Храним его в ref для использования

        // Настройка кисти
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.color = brushSettings.color;
        canvas.freeDrawingBrush.width = brushSettings.width;
        canvas.freeDrawingBrush.opacity = brushSettings.opacity;

        // // Пример тестовых объектов
        // const rect1 = new Rect({
        //     left: 0,
        //     top: 0,
        //     width: 50,
        //     height: 50,
        //     fill: '#faa',
        //     ...defaultObjectStyles,
        // });
        // const rect2 = new Rect({
        //     left: 500,
        //     top: 300,
        //     width: 50,
        //     height: 50,
        //     fill: '#afa',
        //     ...defaultObjectStyles,
        // });
        // canvas.add(rect1, rect2);
        // canvas.fire('custom:added');
        //
        // const starPoints = [
        //     { x: 50, y: 0 },
        //     { x: 61, y: 35 },
        //     { x: 98, y: 35 },
        //     { x: 68, y: 57 },
        //     { x: 79, y: 91 },
        //     { x: 50, y: 70 },
        //     { x: 21, y: 91 },
        //     { x: 32, y: 57 },
        //     { x: 2, y: 35 },
        //     { x: 39, y: 35 },
        // ];
        // const star = new Polygon(starPoints, {
        //     left: 100,
        //     top: 100,
        //     fill: 'yellow',
        //     stroke: 'black',
        //     strokeWidth: 2,
        //     ...defaultObjectStyles,
        // });
        // canvas.add(star);
        // canvas.fire('custom:added');
        //
        // const diamondWithRect = new Rect({
        //     left: 200,
        //     top: 200,
        //     fill: 'cyan',
        //     width: 100,
        //     height: 100,
        //     angle: 45,
        //     ...defaultObjectStyles,
        // });
        // canvas.add(diamondWithRect);
        // canvas.fire('custom:added');

        // Ресайз + отрисовка границ
        handleResizeCanvas();
        window.addEventListener('resize', handleResizeCanvas);

        // Добавляем события на DOM-элемент канвы
        canvas.wrapperEl.addEventListener('wheel', handleDomMouseWheel, {
            passive: false,
        });
        canvas.wrapperEl.addEventListener('mousedown', handleDomMouseDown);
        canvas.wrapperEl.addEventListener('mousemove', handleDomMouseMove);
        canvas.wrapperEl.addEventListener('mouseup', handleDomMouseUp);
        canvas.wrapperEl.addEventListener('contextmenu', handleDomContextMenu);

        // Добавляем события Fabric
        canvas.on('mouse:down', handleCanvasMouseDown);
        canvas.on('selection:created', handleSelectionCreated);
        canvas.on('after:render', updateCenterCoordinates);
        canvas.on('object:added', () => canvas.fire('custom:added'));
        canvas.on('object:modified', () => canvas.fire('custom:added'));
        canvas.on('object:removed', () => canvas.fire('custom:added'));
        canvas.on('object:moving', (e) => {
            e.target.hasControls = false;
        });
        canvas.on('object:modified', (e) => {
            e.target.hasControls = true;
        });
        canvas.on('selection:created', handleObjectSelectionChange);
        canvas.on('selection:updated', handleObjectSelectionChange);
        canvas.on('selection:cleared', handleObjectSelectionChange);
        canvas.on('object:moving', () => {
            updateTextMenuPosition();
            updateObjectMenuPosition();
        });
        canvas.on('object:scaling', () => {
            updateTextMenuPosition();
            updateObjectMenuPosition();
        });

        // Глобальные события
        window.addEventListener('click', handleCloseContextMenu);
        window.addEventListener('keydown', handleWindowKeyDown, true);
        window.addEventListener('keyup', handleWindowKeyUp);

        // При первой загрузке устанавливаем зум
        updateZoomPercent(canvas);
        canvasElement.__canvas = canvas;

        // ================== [  Load from localStorage on mount  ] ==================
        const savedCanvasData = localStorage.getItem('fabricCanvasState');
        if (savedCanvasData) {
            canvas.loadFromJSON(savedCanvasData, () => {
                canvas.renderAll();
            });
        }

        // =========== [ Save to localStorage when the canvas changes ] ===========
        const handleSaveToLocalStorage = () => {
            // Include needed props so we keep custom styles & images:
            const json = canvas.toJSON([
                'src',
                'borderColor',
                'cornerColor',
                'cornerStrokeColor',
                'cornerSize',
                'transparentCorners',
                'selectable',
                'evented',
                'text',
                'fontSize',
                'fontFamily',
                'fill',
            ]);
            localStorage.setItem('fabricCanvasState', JSON.stringify(json));
        };

        canvas.on('custom:added', handleSaveToLocalStorage);
        canvas.on('object:modified', handleSaveToLocalStorage);
        canvas.on('object:removed', handleSaveToLocalStorage);

        // Очистка при размонтировании
        return () => {
            window.removeEventListener('resize', handleResizeCanvas);
            window.removeEventListener('click', handleCloseContextMenu);
            window.removeEventListener('keydown', handleWindowKeyDown, true);
            window.removeEventListener('keyup', handleWindowKeyUp);

            canvas.wrapperEl.removeEventListener('wheel', handleDomMouseWheel);
            canvas.wrapperEl.removeEventListener('mousedown', handleDomMouseDown);
            canvas.wrapperEl.removeEventListener('mousemove', handleDomMouseMove);
            canvas.wrapperEl.removeEventListener('mouseup', handleDomMouseUp);
            canvas.wrapperEl.removeEventListener('contextmenu', handleDomContextMenu);

            canvas.off('mouse:down', handleCanvasMouseDown);
            canvas.off('selection:created', handleSelectionCreated);
            canvas.off('after:render', updateCenterCoordinates);

            if (inertiaRequestIdRef.current) {
                cancelAnimationFrame(inertiaRequestIdRef.current);
            }
            canvasHistoryRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ======================[ Методы для переключения режимов ]======================
    function setMode(mode, figureType = null) {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        // Сброс режимов
        canvas.isDrawingMode = false;
        isAddingTextRef.current = false;
        isAddingFigureRef.current = false;
        figureTypeRef.current = null;

        switch (mode) {
            case 'drawing':
                canvas.isDrawingMode = true;
                break;
            case 'textAdding':
                isAddingTextRef.current = true;
                break;
            case 'figureAdding':
                isAddingFigureRef.current = true;
                figureTypeRef.current = figureType;
                break;
            default:
                break;
        }
        setActiveMode(mode);
    }

    // ======================[ Публичные методы для UI ]======================
    const handleToggleDrawing = () => {
        setMode(activeMode === 'drawing' ? null : 'drawing');
    };

    const handleEnableTextAdding = () => {
        setMode(activeMode === 'textAdding' ? null : 'textAdding');
    };

    const handleAddFigure = (type) => {
        setMode('figureAdding', type);
    };

    function handleImportFile(event) {
        const canvas = canvasInstanceRef.current;
        if (!canvas || !event.target.files || event.target.files.length === 0) {
            console.warn('No file selected or canvas not initialized');
            return;
        }

        const file = event.target.files[0];

        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validVideoTypes = ['video/mp4', 'video/webm'];

        if (validImageTypes.includes(file.type)) {
            // Обработка изображения (без изменений)
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target.result;
                const imageElement = document.createElement('img');
                imageElement.src = imageUrl;

                imageElement.onload = () => {
                    const fabricImage = new Image(imageElement, {
                        originX: 'center',
                        originY: 'center',
                        selectable: true,
                        ...defaultObjectStyles,
                    });

                    const vpt = canvas.viewportTransform;
                    const zoom = canvas.getZoom();
                    const canvasCenter = {
                        x: (canvas.width / 2 - vpt[4]) / zoom,
                        y: (canvas.height / 2 - vpt[5]) / zoom,
                    };

                    fabricImage.left = canvasCenter.x;
                    fabricImage.top = canvasCenter.y;

                    canvas.add(fabricImage);
                    canvas.fire('custom:added');
                    canvas.setActiveObject(fabricImage);
                    canvas.renderAll();
                };

                imageElement.onerror = () => {
                    console.error('Error loading the image file');
                };
            };

            reader.onerror = () => {
                console.error('Error reading the image file');
            };

            reader.readAsDataURL(file);
        } else if (validVideoTypes.includes(file.type)) {
            // Обработка видео
            const videoElement = document.createElement('video');
            const videoSource = document.createElement('source');

            videoElement.muted = true;
            videoElement.loop = true;
            videoElement.appendChild(videoSource);
            videoSource.src = URL.createObjectURL(file);

            videoElement.onloadeddata = () => {
                const videoWidth = videoElement.videoWidth;
                const videoHeight = videoElement.videoHeight;

                if (videoWidth === 0 || videoHeight === 0) {
                    console.error('Failed to retrieve video dimensions.');
                    return;
                }

                // Применяем реальные размеры к видео-элементу
                videoElement.width = videoWidth;
                videoElement.height = videoHeight;

                const fabricVideo = new Image(videoElement, {
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    objectCaching: false,
                    width: videoWidth, // Устанавливаем ширину объекта
                    height: videoHeight, // Устанавливаем высоту объекта
                    scaleX: 1, // Масштаб по умолчанию
                    scaleY: 1,
                    ...defaultObjectStyles,
                });

                const vpt = canvas.viewportTransform;
                const zoom = canvas.getZoom();
                const canvasCenter = {
                    x: (canvas.width / 2 - vpt[4]) / zoom,
                    y: (canvas.height / 2 - vpt[5]) / zoom,
                };

                fabricVideo.left = canvasCenter.x;
                fabricVideo.top = canvasCenter.y;

                // Убедимся, что масштаб объекта совпадает с видео
                fabricVideo.set({
                    scaleX: videoWidth / fabricVideo.width,
                    scaleY: videoHeight / fabricVideo.height,
                });

                canvas.add(fabricVideo);
                canvas.fire('custom:added');
                canvas.setActiveObject(fabricVideo);
                canvas.renderAll();

                videoElement.play();

                function renderLoop() {
                    canvas.renderAll();
                    util.requestAnimFrame(renderLoop);
                }
                renderLoop();
            };

            videoElement.onerror = (e) => {
                console.error('Error loading the video file:', e);
                console.log('File details:', file);
            };
        } else {
            console.warn('Unsupported file type');
        }

        event.target.value = ''; // Сбрасываем input
    }


    // ======================[ Возвращаем наружу ]======================
    return {
        canvasRef,
        contextMenu,
        menuOptions,
        textMenu,
        objectMenu,
        activeMode,
        zoomPercent,
        centerCoordinates,
        brushSettings,
        handleToggleDrawing,
        handleEnableTextAdding,
        handleZoomInButton,
        handleZoomOutButton,
        handleAddFigure,
        handleImportFile,
        handleCloseContextMenu,
        handleUpdateText,
        handleUpdateObject,
        handleUpdateBrush,
        handleUndo,
        handleRedo,
    };

}

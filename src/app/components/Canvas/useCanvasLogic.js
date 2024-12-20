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
    util,
    loadSVGFromString,
    Image, FabricImage,
} from 'fabric';

const ZOOM_LEVEL_MIN = -3;
const ZOOM_LEVEL_MAX = 3;
const ZOOM_FACTOR = 1.1;

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

FabricObject.ownDefaults = {
    ...defaultObjectStyles,
};

export function useCanvasLogic() {
    const canvasRef = useRef(null);
    const canvasInstanceRef = useRef(null);

    const isAddingTextRef = useRef(false);
    const isAddingFigureRef = useRef(false);
    const figureTypeRef = useRef(null);

    const [activeMode, setActiveMode] = useState(null);

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

    const clipboardRef = useRef(null); // Оставляем ref

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
        console.log('Copied to clipboard:', clipboardRef.current);
    };


    const handlePaste = async () => {
        const canvas = canvasInstanceRef.current;
        if (!canvas || !clipboardRef.current) {
            console.warn('Clipboard is empty or canvas not initialized');
            return;
        }

        try {
            const clonedObj = await clipboardRef.current.clone();

            // Устанавливаем смещение
            clonedObj.left += 10;
            clonedObj.top += 10;

            // Устанавливаем стили выделения
            clonedObj.set({
                borderColor: '#374151', // Ваш стиль для границы
                cornerColor: '#1f2937', // Цвет углов
                cornerStrokeColor: '#627ca1', // Цвет рамки углов
                cornerSize: 10, // Размер углов
                transparentCorners: false, // Прозрачные углы
                evented: true, // Объект должен быть интерактивным
            });

            // Обработка ActiveSelection
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
                });
                clonedObj.setCoords();
            } else {
                canvas.add(clonedObj);
            }

            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();

            console.log('Pasted from clipboard:', clonedObj);
        } catch (error) {
            console.error('Error during paste:', error);
        }
    };

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

    function updateZoomPercent(canvas) {
        const zoom = canvas.getZoom();
        const zoomPercentage = Math.round(zoom * 100);
        setZoomPercent(zoomPercentage);
    }

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

    const createFigure = (type, pointer) => {
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
                    const points = [];
                    const angleStep = Math.PI / numPoints;
                    for (let i = 0; i < 2 * numPoints; i++) {
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const angle = i * angleStep - Math.PI / 2;
                        points.push({
                            x: centerX + radius * Math.cos(angle),
                            y: centerY + radius * Math.sin(angle),
                        });
                    }
                    return points;
                };
                const starPoints = createStarPoints(pointer.x, pointer.y, 50, 20, 5);
                return new Polygon(starPoints, { ...commonProps });
            }
            default:
                console.warn('Unknown figure type:', type);
                return null;
        }
    };


    const createTextbox = (pointer) => {
        const textbox = new Textbox('Введите текст', {
            left: pointer.x,
            top: pointer.y,
            fontSize: 20,
            minWidth: 20,
            dynamicMinWidth: 20,
            fill: '#aaa',
            editable: true,
            originX: 'center',
            originY: 'center',
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
    };


    function startInertia() {
        if (inertiaRequestIdRef.current) {
            cancelAnimationFrame(inertiaRequestIdRef.current);
        }
        inertiaRequestIdRef.current = requestAnimationFrame(animateInertia);
    }

    function resizeCanvas() {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight);

        drawGlobalBounds(canvas);
        canvas.renderAll();
    }


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

    const handleMouseDown = (event) => {
        const canvas = canvasInstanceRef.current;
        // Средняя кнопка мыши - панорамирование
        if (event.button === 1 && !canvas.isDrawingMode) {
            event.preventDefault();
            canvas.defaultCursor = 'grabbing';
            // ИЗМЕНЕНО: Во время панорамирования отключаем выбор, потом вернём
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

    const handleCanvasMouseDown = (event) => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const pointer = canvas.getPointer(event.e);

        // Добавление текста
        if (isAddingTextRef.current) {
            const textbox = createTextbox(pointer);
            canvas.add(textbox);
            canvas.setActiveObject(textbox);
            canvas.renderAll();

            isAddingTextRef.current = false;
            setActiveMode(null);
            return;
        }

        if (isAddingFigureRef.current) {
            const figure = createFigure(figureTypeRef.current, pointer);
            if (figure) {
                canvas.add(figure);
                canvas.setActiveObject(figure);
                canvas.renderAll();
            }

            isAddingFigureRef.current = false;
            figureTypeRef.current = null;
            setActiveMode(null);
            return;
        }
    };

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

    const handleMouseUp = (event) => {
        const canvas = canvasInstanceRef.current;
        // ИЗМЕНЕНО: После панорамирования вернуть выбор объектов
        if (event.button === 1 && !canvas.isDrawingMode) {
            canvas.defaultCursor = 'default';
            canvas.selection = true; // Возвращаем возможность выделения объектов
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
        const canvas = canvasInstanceRef.current;

        if (!canvas) return;
        console.log('Key:', event.key, 'Ctrl:', event.ctrlKey, 'Shift:', event.shiftKey, 'Alt:', event.altKey);


        // Удаление выделенных объектов
        if (event.key === 'Delete' || event.key === 'Del') {
            console.log('Delete pressed');
            deleteSelectedObjects();
        }

        // Копирование (Ctrl+C)
        if (event.ctrlKey && event.code === 'KeyC') {
            console.log('Ctrl+C pressed');
            void handleCopy();
        }

        // Вставка (Ctrl+V)
        if (event.ctrlKey && event.code === 'KeyV') {
            console.log('Ctrl+V pressed');
            void handlePaste();
        }
    };

    const handleKeyUp = (event) => {
        if (event.key === 'Control') {
            ctrlPressedRef.current = false;
        }
    };

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

    const handleSelectionCreated = (event) => {
        const canvas = canvasInstanceRef.current;
        const activeObject = canvas.getActiveObject();
        if (activeObject.type === 'activeselection') {
            // Устанавливаем стили выделения
            activeObject.borderColor = '#374151';
            activeObject.cornerColor = '#1f2937'; // Углы
            activeObject.cornerSize = 10; // Размер углов
            activeObject.transparentCorners = false; // Прозрачность углов
            activeObject.cornerStrokeColor = '#627ca1';
            activeObject.padding = 0;
            activeObject.borderScaleFactor = 1;
            activeObject.selectable = true;
            activeObject.evented = true;
            canvas.renderAll();
        }
    };

    useEffect(() => {
        const canvasElement = canvasRef.current;
        const canvas = new Canvas(canvasElement, {
            backgroundColor: '#EEF2F9',
            selection: true,
        });

        canvasInstanceRef.current = canvas;

        canvas.freeDrawingBrush = new PencilBrush(canvas, {
            color: '#000',
            width: 1,
        });
        canvas.freeDrawingBrush.width = 100;

        const rect1 = new Rect({
            left: 0,
            top: 0,
            width: 50,
            height: 50,
            fill: '#faa',
            ...defaultObjectStyles,
        });
        const rect2 = new Rect({
            left: 500,
            top: 300,
            width: 50,
            height: 50,
            fill: '#afa',
            ...defaultObjectStyles,
        });

        canvas.add(rect1);
        canvas.add(rect2);

        var imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Felis_silvestris_silvestris.jpg/275px-Felis_silvestris_silvestris.jpg';

        FabricImage.fromURL(imageUrl, function(img) {
            // Опционально: измените размер изображения
            img.scaleToWidth(300);
            img.scaleToHeight(200);

            // Добавьте изображение на канвас
            canvas.add(img);

            // Опционально: сделайте изображение активным и перетаскиваемым
            img.set({
                left: 100,
                top: 100,
                selectable: true
            });

            canvas.renderAll();
        }, {
            crossOrigin: 'anonymous' // Опционально: если загружаете изображение с другого домена
        });


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
            strokeWidth: 2,
            ...defaultObjectStyles,
        });
        canvas.add(star);

        const diamondWithRect = new Rect({
            left: 200,
            top: 200,
            fill: 'cyan',
            width: 100,
            height: 100,
            angle: 45,
            ...defaultObjectStyles,
        });
        canvas.add(diamondWithRect);

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        canvas.wrapperEl.addEventListener('wheel', handleMouseWheel, { passive: false });
        canvas.wrapperEl.addEventListener('mousedown', handleMouseDown);
        canvas.wrapperEl.addEventListener('mousemove', handleMouseMove);
        canvas.wrapperEl.addEventListener('mouseup', handleMouseUp);

        canvas.on('mouse:down', handleCanvasMouseDown);
        canvas.on('object:moving', handleObjectMoving);
        canvas.on('object:moving', (e) => {
            e.target.hasControls = false;
        });
        canvas.on('object:modified', (e) => {
            e.target.hasControls = true;
        });
        canvas.on('selection:created', handleSelectionCreated);



        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp);
        updateZoomPercent(canvas);
        canvasElement.__canvas = canvas;

        return () => {
            canvas.wrapperEl.removeEventListener('wheel', handleMouseWheel);
            canvas.wrapperEl.removeEventListener('mousedown', handleMouseDown);
            canvas.wrapperEl.removeEventListener('mousemove', handleMouseMove);
            canvas.wrapperEl.removeEventListener('mouseup', handleMouseUp);
            canvas.off('mouse:down', handleCanvasMouseDown);
            canvas.off('selection:created', handleSelectionCreated);

            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', resizeCanvas);

            if (inertiaRequestIdRef.current) {
                cancelAnimationFrame(inertiaRequestIdRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function deleteSelectedObjects() {
        const canvas = canvasInstanceRef.current;
        const activeObjects = canvas.getActiveObjects();
        console.log('Active objects:', activeObjects);
        if (activeObjects.length) {
            activeObjects.forEach((obj) => {
                console.log('Removing object:', obj);
                canvas.remove(obj);
            });
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    }

    const setMode = (mode, figureType = null) => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        // Сброс всех режимов
        canvas.isDrawingMode = false;
        isAddingTextRef.current = false;
        isAddingFigureRef.current = false;
        figureTypeRef.current = null;

        // Установка нового режима, если он указан
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
                // Если mode === null, сбрасываем все режимы
                break;
        }

        setActiveMode(mode); // Устанавливаем активный режим
    };


    const handleToggleDrawing = () => {
        setMode(activeMode === 'drawing' ? null : 'drawing');
    };


    // Включение/выключение режима добавления текста
    const handleEnableTextAdding = () => {
        setMode(activeMode === 'textAdding' ? null : 'textAdding');
    };


    const handleAddFigure = (figureType) => {
        setMode('figureAdding', figureType); // Передаём тип фигуры
    };


    const handleZoomInButton = () => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const zoom = canvas.getZoom();
        const newZoom = zoom * ZOOM_FACTOR;
        if (newZoom > Math.pow(2, ZOOM_LEVEL_MAX)) return;

        const center = canvas.getCenter();
        canvas.zoomToPoint(new Point(center.left, center.top), newZoom);
        zoomLevelRef.current = Math.log2(newZoom);
        setZoomPercent(Math.round(newZoom * 100));
        canvas.renderAll();
    };

    const handleZoomOutButton = () => {
        const canvas = canvasInstanceRef.current;
        if (!canvas) return;

        const zoom = canvas.getZoom();
        const newZoom = zoom / ZOOM_FACTOR;
        if (newZoom < Math.pow(2, ZOOM_LEVEL_MIN)) return;

        const center = canvas.getCenter();
        canvas.zoomToPoint(new Point(center.left, center.top), newZoom);
        zoomLevelRef.current = Math.log2(newZoom);
        setZoomPercent(Math.round(newZoom * 100));
        canvas.renderAll();
    };

    const onImportImage = (event) => {
        const canvas = canvasInstanceRef.current;

        // Проверка на наличие canvas и файлов
        if (!canvas || !event.target.files || event.target.files.length === 0) {
            console.warn('No file selected or canvas not initialized');
            return;
        }

        const imgObj = event.target.files[0];

        // Проверка типа файла (только изображения)
        if (!imgObj.type.startsWith('image/')) {
            console.warn('Selected file is not an image');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const imageUrl = e.target.result;

            const imageElement = document.createElement('img');
            imageElement.src = imageUrl;

            imageElement.onload = () => {
                const image = new Image(imageElement, {
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: true, // Объект можно выделять
                    ...defaultObjectStyles,
                });

                // Добавляем изображение на canvas
                canvas.add(image);
                canvas.setActiveObject(image);
                canvas.renderAll();
            };

            imageElement.onerror = () => {
                console.error('Error loading the image');
            };
        };

        reader.onerror = () => {
            console.error('Error reading the file');
        };

        reader.readAsDataURL(imgObj);
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
        onImportImage,
    };
}

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, PencilBrush, Rect, FabricObject, ActiveSelection } from 'fabric/es'; // Импорт Canvas и PencilBrush
import styles from './style.css'

Canvas.ActiveSelection = ActiveSelection;

FabricObject.ownDefaults = {
    ...FabricObject.ownDefaults,
    cornerStyle: 'circle', 
    cornerSize: 10, 
    rotatingPointOffset: 40, // Расстояние до точки вращения
    transparentCorners: true,
};

ActiveSelection.ownDefaults = {
    ...ActiveSelection.ownDefaults,
    cornerStyle: 'circle',
    cornerSize: 10,
    rotatingPointOffset: 40,
    transparentCorners: true,
};

function CanvasApp() {
    const canvasRef = useRef(null);
    const [canvas, setCanvas] = useState(null);
    const [isDrawingMode, setIsDrawingMode] = useState(false);

    useEffect(() => {
        if (canvasRef.current) {
            const canvasElement = canvasRef.current;

            const initCanvas = new Canvas(canvasRef.current, {
                width: 500,
                height: 500,
                backgroundColor: '#f0f0f0',
            });

            initCanvas.freeDrawingBrush = new PencilBrush(initCanvas);
            initCanvas.freeDrawingBrush.width = 5; // Ширина линии
            initCanvas.freeDrawingBrush.color = 'blue'; // Цвет линии

            const rect = new Rect({
                left: 100,
                top: 100,
                width: 100,
                height: 100,
                fill: 'blue',
            });
    
            initCanvas.add(rect);

            setCanvas(initCanvas);

            const handleDelete = (e) => {
                if (e.key === 'Delete') {
                    const activeObjects = initCanvas.getActiveObjects(); 
                    if (activeObjects.length) {
                        activeObjects.forEach((obj) => {
                            initCanvas.remove(obj); // Удаляем каждый объект
                        });
                        initCanvas.discardActiveObject(); // Сбрасываем выделение
                        initCanvas.renderAll(); // Перерисовываем холст
                    }
                }
            };

            const SCALE_FACTOR = 1.1; // Коэффициент зума
            const ZOOM_MAX = 10;      // Максимальный масштаб
            const ZOOM_MIN = 0.5;     // Минимальный масштаб

            // Обработка зума колесиком мыши
            initCanvas.on('mouse:wheel', (event) => {
                event.e.preventDefault();

                const delta = event.e.deltaY; // Получаем направление прокрутки
                const zoomDirection = delta > 0 ? 'out' : 'in';
                const currentZoom = initCanvas.getZoom();
                let newZoom = zoomDirection === 'in' ? currentZoom * SCALE_FACTOR : currentZoom / SCALE_FACTOR;

                // Ограничиваем зум
                if (newZoom > ZOOM_MAX) newZoom = ZOOM_MAX;
                if (newZoom < ZOOM_MIN) newZoom = ZOOM_MIN;

                // Центрируем масштабирование в точке указателя мыши
                const pointer = initCanvas.getPointer(event.e);
                initCanvas.zoomToPoint(pointer, newZoom);

                initCanvas.renderAll();
                console.log(initCanvas.getZoom());
            });
            
            

            initCanvas.on('mouse:down', function(event) {
                var e = event.e;
                if (e.button === 2) {
                    // Правая кнопка мыши нажата
                    e.preventDefault(); // Отменяем стандартное поведение браузера
                    setIsRightMouseButtonDown(true);
                    console.log('Правая кнопка мыши нажата');
                    // Ваш код для обработки нажатия правой кнопки мыши
                }
            });
            
            window.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            })
            window.addEventListener('keyup', handleDelete);

            return () => {
                initCanvas.dispose();
            };
        }
    }, []);

    const toggleDrawingMode = () => {
        if (canvas) {
            canvas.isDrawingMode = !canvas.isDrawingMode;
            setIsDrawingMode(canvas.isDrawingMode);
        }
    };

    // // Функция для выхода из режима рисования (по клику правой кнопкой мыши)
    // const exitDrawingMode = (e) => {
    //     if (canvas) {
    //         canvas.isDrawingMode = false; // Выходим из режима рисования
    //         const newPath = canvas.getObjects().slice(-1)[0]; // Получаем последнюю нарисованную фигуру

    //         if (newPath) {
    //             newPath.set({
    //                 selectable: true, // Делаем фигуру редактируемой
    //                 hasControls: true, // Включаем контролы для изменения размера и вращения
    //             });
    //             canvas.renderAll();
    //         }
    //     }
    // };

    // useEffect(() => {
    //     if (canvas) {
    //         canvas.on('mouse:up', exitDrawingMode);
    //     }
    // }, [canvas]);


    const resetZoom = () => {
        if (canvas) {
            canvas.setZoom(1);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-4" style={styles.buttons}>
                <button
                    onClick={resetZoom}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                >
                    Reset Zoom
                </button>
                <button
                    onClick={toggleDrawingMode}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                >
                    {isDrawingMode ? 'Выключить рисование' : 'Включить рисование'}
                </button>
            </div>
            <canvas ref={canvasRef} className="border border-gray-300" style={styles.canvas}/>
        </div>
    );
}

export default CanvasApp;

'use client';

import { useState, useEffect } from "react";
import Image from 'next/image';

function LeftPanel({ activeMode, brushSettings, onUpdateBrush, onToggleDrawing, onAddText, onAddFigure, onImportFile, onUndo, onRedo }) {
    const [isFigureMenuVisible, setFigureMenuVisible] = useState(false);
    const [tooltipVisible, setTooltipVisible] = useState({ drawing: true, figures: true });

    useEffect(() => {
        if (activeMode !== 'figureAdding') {
            setFigureMenuVisible(false);
            setTooltipVisible((prev) => ({ ...prev, figures: true }));
        }
        if (activeMode !== 'drawing') {
            setTooltipVisible((prev) => ({ ...prev, drawing: true }));
        }
    }, [activeMode]);

    const handleToggleDrawing = () => {
        if (isFigureMenuVisible) {
            setFigureMenuVisible(false); // Закрываем меню фигур
        }
        onToggleDrawing();
        setTooltipVisible((prev) => ({ ...prev, drawing: false }));
    };

    const handleFigureMenu = (figureName) => {
        if (activeMode === 'drawing') {
            onToggleDrawing(); // Выключаем режим рисования
        }

        if (figureName) {
            // Если выбрана фигура
            onAddFigure(figureName);
            setFigureMenuVisible(false); // Закрываем меню фигур
            setTooltipVisible((prev) => ({ ...prev, figures: false }));
        } else {
            // Переключаем меню фигур
            setTimeout(() => {
                setFigureMenuVisible((prev) => !prev);
            }, 0);
            setTooltipVisible((prev) => ({ ...prev, figures: false }));
        }
    };


    const figureIcons = [
        { name: 'circle', src: '/panelicons/figures/circle.svg' },
        { name: 'rhombus', src: '/panelicons/figures/rhombus.svg' },
        { name: 'square', src: '/panelicons/figures/square.svg' },
        { name: 'star', src: '/panelicons/figures/star.svg' },
        { name: 'triangle', src: '/panelicons/figures/triangle.svg' },
        { name: 'ellipse', src: '/panelicons/figures/ellipse.svg' },
    ];

    return (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-2 z-10">
            <div className="bg-gray-800 p-2 flex flex-col items-center space-y-2.5 rounded-lg shadow-lg">
                <div
                    className={`w-12 h-12 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer relative group ${activeMode === 'drawing' ? 'bg-gray-500' : 'bg-gray-700'}`}
                    onClick={handleToggleDrawing}
                >
                    <Image src="/panelicons/drawing.svg" alt="Drawing" width={32} height={32} />
                    {tooltipVisible.drawing && (
                        <span className="absolute left-full ml-4 bg-gray-700 text-white font-sans text-lg px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                            Рисование
                        </span>
                    )}
                </div>
                {activeMode === 'drawing' && (
                    <div className="absolute left-[112%] top-1/2 transform -translate-y-[225%] bg-gray-900 rounded-lg shadow-lg p-2 w-20 flex flex-col space-y-2 z-50 border border-gray-700">
                        <input
                            type="color"
                            value={brushSettings.color || '#000000'}
                            onChange={(e) => onUpdateBrush('color', e.target.value)}
                            className="w-8 h-8 rounded border border-gray-600 hover:ring-2 hover:ring-blue-500 transition duration-200"
                        />
                        <input
                            type="number"
                            value={brushSettings.width || 1}
                            onChange={(e) => onUpdateBrush('width', parseFloat(e.target.value))}
                            className="w-16 bg-gray-800 text-white text-center p-1 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500"
                            min={1}
                        />
                    </div>
                )}

                <div className="relative">
                    <div
                        className={`w-12 h-12 ${activeMode === 'figureAdding' ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-600'} rounded flex items-center justify-center cursor-pointer relative group`}
                        onClick={() => handleFigureMenu()}
                    >
                        <Image src="/panelicons/figure.svg" alt="Figures" width={32} height={32} />
                        {tooltipVisible.figures && (
                            <span className="absolute left-full ml-4 bg-gray-700 text-white font-sans text-lg px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                Фигуры
                            </span>
                        )}
                    </div>
                    {isFigureMenuVisible && (
                        <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-4 bg-gray-800 rounded-lg shadow-lg p-2 w-max grid grid-cols-3 gap-2 place-items-center">
                            {figureIcons.map((figure) => (
                                <button
                                    key={figure.name}
                                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
                                    onClick={() => handleFigureMenu(figure.name)}
                                >
                                    <Image src={figure.src} alt={figure.name} width={32} height={32} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div
                    className={`w-12 h-12 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer relative group ${activeMode === 'textAdding' ? 'bg-gray-500' : 'bg-gray-700'}`}
                    onClick={onAddText}
                >
                    <Image src="/panelicons/text.svg" alt="Text" width={32} height={32} />
                    <span className="absolute left-full ml-4 bg-gray-700 text-white font-sans text-lg px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Текст
                    </span>
                </div>

                <div
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer relative group"
                    onClick={() => document.getElementById('imageUploadInput').click()}
                >
                    <Image src="/panelicons/import.svg" alt="Import" width={32} height={32} />
                    <span className="absolute left-full ml-4 bg-gray-700 text-white font-sans text-lg px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Импорт
                    </span>
                    <input
                        type="file"
                        id="imageUploadInput"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                        style={{ display: 'none' }}
                        onChange={(e) => onImportFile(e)}
                    />
                </div>
            </div>

            {/* Undo/Redo */}
            <div className="bg-gray-800 p-2 rounded-lg shadow-lg flex flex-col items-center space-y-2">
                <button
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
                    onClick={onUndo}
                >
                    <Image src="/panelicons/undo.svg" alt="Undo" width={32} height={32} />
                </button>
                <button
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
                    onClick={onRedo}
                >
                    <Image src="/panelicons/redo.svg" alt="Redo" width={32} height={32} />
                </button>
            </div>
        </div>
    );
}

export default LeftPanel;

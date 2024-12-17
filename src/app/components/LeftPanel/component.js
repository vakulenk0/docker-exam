'use client';

import { useState } from "react";
import Image from 'next/image';

const LeftPanel = ({ onToggleDrawing, onAddText, activeMode, onAddFigure }) => {
    const [isFigureMenuVisible, setFigureMenuVisible] = useState(false);

    const toggleFigureMenu = () => {
        setFigureMenuVisible((prev) => !prev);
    };

    const handleClick = () => {
        onAddFigure('Привет, родитель!');
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
        <div
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-800 p-2 flex flex-col items-center space-y-2.5 z-10 rounded-lg shadow-lg"
        >
            {/* Cursor Button */}
            <div
                className={`w-12 h-12 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer ${activeMode === 'drawing' ? 'bg-gray-500' : 'bg-gray-700'}`}
                onClick={onToggleDrawing}
            >
                <Image src="/panelicons/cursor.svg" alt="Cursor" width={32} height={32} />
            </div>

            {/* Figure Button with Dropdown Menu */}
            <div className="relative">
                {/* Кнопка для открытия меню */}
                <div
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer"
                    onClick={toggleFigureMenu}
                >
                    <Image src="/panelicons/figure.svg" alt="Figure" width={32} height={32} />
                </div>

                {/* Выпадающее меню с иконками */}
                {isFigureMenuVisible && (
                    <div
                        className="absolute left-full top-1/2 transform -translate-y-1/2 ml-4 bg-gray-800 rounded-lg shadow-lg p-2 w-max grid grid-cols-3 gap-2 place-items-center"
                    >
                        {figureIcons.map((figure) => (
                            <button
                                key={figure.name}
                                className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer"
                                onClick={() => onAddFigure(figure.name)}
                            >
                                <Image
                                    src={figure.src}
                                    alt={figure.name}
                                    width={32}
                                    height={32}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Text Adding */}
            <div
                className={`w-12 h-12 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer ${activeMode === 'textAdding' ? 'bg-gray-500' : 'bg-gray-700'}`}
                onClick={onAddText}
            >
                <Image src="/panelicons/text.svg" alt="Text" width={32} height={32}/>
            </div>

            {/* Import Button */}
            <div className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center">
                <Image src="/panelicons/import.svg" alt="Import" width={32} height={32} />
            </div>
        </div>
    );
};

export default LeftPanel;

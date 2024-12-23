import React from 'react';
import Image from "next/image";

function ZoomIndicator({zoomPercent, centerCoordinates, onZoomIn, onZoomOut}) {
    return (
        <div className="absolute bottom-4 right-4 flex items-center space-x-3 z-10 bg-gray-900 text-white rounded-lg shadow-lg p-2">
            {/* Блок управления зумом */}
            <div className="flex items-center space-x-2">
                <button
                    onClick={onZoomOut}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full shadow-sm"
                >
                    <Image src="/zoomicons/zoomOut.svg" alt="-" width={24} height={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-sans text-gray-400">Уровень Зума</span>
                    <span className="font-bold font-sans text-lg">{zoomPercent}%</span>
                </div>
                <button
                    onClick={onZoomIn}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full shadow-sm"
                >
                    <Image src="/zoomicons/zoomIn.svg" alt="+" width={24} height={24} />
                </button>
            </div>

            {/* Блок координат */}
            <div className="bg-gray-800 px-4 py-2 rounded-lg shadow-inner flex flex-col items-center">
                <span className="text-sm font-sans text-gray-400">Текущие координаты</span>
                <span className="font-sans text-sm font-semibold">
                    ({centerCoordinates.x}, {centerCoordinates.y})
                </span>
            </div>
        </div>
    );
}

export default ZoomIndicator;
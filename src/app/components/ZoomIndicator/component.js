import React from 'react';
import Image from "next/image";

const ZoomIndicator = ({ zoomPercent, onZoomIn, onZoomOut }) => {
    return (
        <div className="absolute bottom-4 right-4 flex items-center space-x-2 z-10 bg-gray-800 text-white rounded-lg shadow-lg p-2">
            <button
                onClick={onZoomOut}
                className="px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
                <Image src="/zoomicons/zoomOut.svg" alt="-" width={24} height={24} />
            </button>
            <span className="font-bold text-lg">{zoomPercent}%</span>
            <button
                onClick={onZoomIn}
                className="px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
                <Image src="/zoomicons/zoomIn.svg" alt="+" width={24} height={24} />
            </button>
        </div>
    );
};

export default ZoomIndicator;

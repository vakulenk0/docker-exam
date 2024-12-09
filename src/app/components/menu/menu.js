'use client';

import Image from 'next/image';

const LeftPanel = ({ onToggleDrawing, onAddText }) => {
    return (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-200 p-2 flex flex-col items-center space-y-4 z-10 rounded-lg shadow-lg">
            <div
                className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={onToggleDrawing}
            >
                <Image src="/panelicons/cursor.png" alt="Cursor" width={32} height={32} />
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Image src="/panelicons/figure.png" alt="Figure" width={32} height={32} />
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Image src="/panelicons/import.png" alt="Import" width={32} height={32} />
            </div>
            <div
                className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={onAddText}
            >
                <Image src="/panelicons/text.png" alt="Text" width={32} height={32} />
            </div>
        </div>
    );
};

export default LeftPanel;

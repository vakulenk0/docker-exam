'use client';

import Image from 'next/image';

const LeftPanel = ({ onToggleDrawing, onAddText, activeMode, onAddArrow }) => {
    return (
        <div
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-800 p-2 flex flex-col items-center space-y-2.5 z-10 rounded-lg shadow-lg">
            <div
                className={`w-12 h-12 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer ${activeMode === 'drawing' ? 'bg-gray-500' : 'bg-gray-700'}`}
                onClick={onToggleDrawing}
            >
                <Image src="/panelicons/cursor.svg" alt="Cursor" width={32} height={32}/>
            </div>
            <div
                className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer"
            >
                <Image src="/panelicons/figure.svg" alt="Figure" width={32} height={32}/>
            </div>
            <div
                className={`w-12 h-12 hover:bg-gray-600 rounded flex items-center justify-center cursor-pointer ${activeMode === 'textAdding' ? 'bg-gray-500' : 'bg-gray-700'}`}
                onClick={onAddText}
            >
                <Image src="/panelicons/text.svg" alt="Text" width={32} height={32}/>
            </div>
            <div className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center">
                <Image src="/panelicons/import.svg" alt="Import" width={32} height={32}/>
            </div>
        </div>
    );
};

export default LeftPanel;

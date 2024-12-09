'use client';

import LeftPanel from "@/app/components/menu/menu";
import CanvasComponent from "@/app/components/canvas/canvas";
import { useState } from 'react';

const CanvasPage = () => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [addTextTrigger, setAddTextTrigger] = useState(false);

    const handleToggleDrawing = () => {
        setIsDrawing(!isDrawing);
    };

    const handleAddText = () => {
        setAddTextTrigger(true); // Триггер добавления текста
    };

    return (
        <div className="flex h-screen">
            <LeftPanel onToggleDrawing={handleToggleDrawing} onAddText={handleAddText} />
            <div className="flex-1 flex flex-col">
                <CanvasComponent toggleDrawing={isDrawing} addTextTrigger={addTextTrigger} resetAddTextTrigger={() => setAddTextTrigger(false)} />
            </div>
        </div>
    );
};

export default CanvasPage;

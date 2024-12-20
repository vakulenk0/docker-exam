import React from 'react';
import { useCanvasLogic } from './useCanvasLogic';
import ZoomIndicator from "@/app/components/ZoomIndicator/component";
import LeftPanel from "@/app/components/LeftPanel/component";

const CanvasComponent = () => {
    const {
        canvasRef,
        activeMode,
        zoomPercent,
        handleToggleDrawing,
        handleEnableTextAdding,
        handleZoomInButton,
        handleZoomOutButton,
        handleAddFigure,
        onImportImage,
    } = useCanvasLogic();

    return (
        <div className="w-screen h-screen overflow-hidden relative">
            <ZoomIndicator
                zoomPercent={zoomPercent}
                onZoomIn={handleZoomInButton}
                onZoomOut={handleZoomOutButton}
            />
            <LeftPanel
                onToggleDrawing={handleToggleDrawing}
                onAddText={handleEnableTextAdding}
                activeMode={activeMode}
                onAddFigure={handleAddFigure}
                onImportImage={onImportImage}
            />
            <canvas ref={canvasRef} className="border-0" />
        </div>
    );
};

export default CanvasComponent;

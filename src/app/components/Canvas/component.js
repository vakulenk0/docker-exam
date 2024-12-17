'use client';

import React from 'react';
import { useCanvasLogic } from './useCanvasLogic'; // Импортируем хук с логикой
import ZoomIndicator from "@/app/components/ZoomIndicator/component";
import LeftPanel from "@/app/components/LeftPanel/component";

const CanvasComponent = () => {
  // Инициализируем логику canvas через хук
  const {
    canvasRef,
    activeMode,
    zoomPercent,
    handleToggleDrawing,
    handleEnableTextAdding,
    handleZoomInButton,
    handleZoomOutButton,
    handleAddFigure,
  } = useCanvasLogic();

  return (
      <div className="w-screen h-screen overflow-hidden" style={{ position: 'relative' }}>
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
        />
        <canvas ref={canvasRef} className="border-0" />
      </div>
  );
};

export default CanvasComponent;
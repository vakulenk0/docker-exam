import React from 'react';
import { useCanvasLogic } from './useCanvasLogic';
import ZoomIndicator from "@/app/components/ZoomIndicator/component";
import LeftPanel from "@/app/components/LeftPanel/component";
import ContextMenu from "@/app/components/ContextMenu/component";
import TextMenu from "@/app/components/TextMenu/component";
import ObjectMenu from "@/app/components/ObjectMenu/component";

const CanvasComponent = () => {
    const {
        canvasRef,
        contextMenu,
        menuOptions,
        textMenu,
        objectMenu,
        activeMode,
        zoomPercent,
        centerCoordinates,
        brushSettings,
        handleToggleDrawing,
        handleEnableTextAdding,
        handleZoomInButton,
        handleZoomOutButton,
        handleAddFigure,
        handleImportFile,
        handleCloseContextMenu,
        handleUpdateText,
        handleUpdateObject,
        handleUpdateBrush,
        handleUndo,
        handleRedo,
    } = useCanvasLogic();

    return (
        <div className="w-screen h-screen overflow-hidden relative">
            <ZoomIndicator
                zoomPercent={zoomPercent}
                centerCoordinates={centerCoordinates}
                onZoomIn={handleZoomInButton}
                onZoomOut={handleZoomOutButton}
            />

            <LeftPanel
                onToggleDrawing={handleToggleDrawing}
                onAddText={handleEnableTextAdding}
                activeMode={activeMode}
                onAddFigure={handleAddFigure}
                onImportFile={handleImportFile}
                onUpdateBrush={handleUpdateBrush}
                brushSettings={brushSettings}
                onUndo={handleUndo}
                onRedo={handleRedo}
            />

            {/* Рендер контекстного меню */}
            <ContextMenu
                isVisible={contextMenu.isVisible}
                position={contextMenu.position}
                options={menuOptions}
                onOptionClick={(option) => {
                    if (option.onClick) option.onClick();
                    handleCloseContextMenu();
                }}
            />

            <TextMenu
                isVisible={textMenu.isVisible}
                position={textMenu.position}
                target={textMenu.target}
                onUpdateText={handleUpdateText}
            />

            <ObjectMenu
                isVisible={objectMenu.isVisible}
                position={objectMenu.position}
                target={objectMenu.target}
                onUpdateObject={handleUpdateObject}
            />

            {/* Канва */}
            <canvas ref={canvasRef} className="border-0" />
        </div>
    );
};

export default CanvasComponent;

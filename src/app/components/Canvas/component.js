import React from 'react';
import { useCanvasLogic } from './useCanvasLogic';
import ZoomIndicator from '@/app/components/ZoomIndicator/component';
import LeftPanel from '@/app/components/LeftPanel/component';
import ContextMenu from '@/app/components/ContextMenu/component';
import TextMenu from '@/app/components/TextMenu/component';
import ObjectMenu from '@/app/components/ObjectMenu/component';
import { Canvas } from "fabric";

const CanvasComponent = ({ initialData, saveEndpoint, onSave }) => {
    const {
        canvasRef,
        saveCanvas,
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
        initializeCanvas,
    } = useCanvasLogic();

    React.useEffect(() => {
        // Инициализируем канву через функцию из useCanvasLogic
        initializeCanvas({ initialData, onSave: handleSave });
    }, [initializeCanvas, initialData]);

    const handleSave = async () => {
        const result = await saveCanvas(saveEndpoint);
        if (result) {
            console.log('Канвас сохранён вручную.');
        }
    };

    return (
        <div className="w-screen h-screen overflow-hidden relative">
            {/* Индикатор зума */}
            <ZoomIndicator
                zoomPercent={zoomPercent}
                centerCoordinates={centerCoordinates}
                onZoomIn={handleZoomInButton}
                onZoomOut={handleZoomOutButton}
            />

            {/* Панель инструментов */}
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

            {/* Контекстное меню */}
            <ContextMenu
                isVisible={contextMenu.isVisible}
                position={contextMenu.position}
                options={menuOptions}
                onOptionClick={(option) => {
                    if (option.onClick) option.onClick();
                    handleCloseContextMenu();
                }}
            />

            {/* Меню текста */}
            <TextMenu
                isVisible={textMenu.isVisible}
                position={textMenu.position}
                target={textMenu.target}
                onUpdateText={handleUpdateText}
            />

            {/* Меню объектов */}
            <ObjectMenu
                isVisible={objectMenu.isVisible}
                position={objectMenu.position}
                target={objectMenu.target}
                onUpdateObject={handleUpdateObject}
            />

            <button
                onClick={handleSave}
                className="absolute bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg"
            >
                Сохранить
            </button>

            {/* Холст */}
            <canvas ref={canvasRef} className="border-0"/>
        </div>
    );
};

export default CanvasComponent;

import React, { useEffect, useCallback } from 'react';
import { useCanvasLogic } from './useCanvasLogic';
import ZoomIndicator from '@/app/components/ZoomIndicator/component';
import LeftPanel from '@/app/components/LeftPanel/component';
import ContextMenu from '@/app/components/ContextMenu/component';
import TextMenu from '@/app/components/TextMenu/component';
import ObjectMenu from '@/app/components/ObjectMenu/component';
import { fetchWithAuth } from '@/app/lib/clientAuth';

// eslint-disable-next-line react/display-name
const CanvasComponent = React.memo(({ initialData, canvasId, setSaveCanvas }) => {
    const {
        canvasRef,
        initializeCanvas,
        getCanvasData,
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

    // Инициализация канваса при первом рендере
    useEffect(() => {
        if (initialData) {
            console.log("Попытка инициализации канваса при монтировании:", initialData);
            initializeCanvas({ initialData });
        }
    }, [initialData, initializeCanvas]); // Безопасно добавляем initializeCanvas

    const saveCanvasData = useCallback(async () => {
        const canvasJSON = getCanvasData();
        console.log("Попытка сохранения канваса:", canvasJSON);

        // Проверяем, есть ли объекты на канвасе
        if (!canvasJSON || !canvasJSON.objects || canvasJSON.objects.length === 0) {
            console.warn("Пустые данные канваса. Сохранение пропущено.");
            return; // Пропускаем сохранение
        }

        try {
            const response = await fetchWithAuth(`/api/canvas/save`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: canvasId,
                    content: JSON.stringify(canvasJSON), // Преобразуем в строку JSON
                }),
            });

            console.log("Ответ сервера на сохранение:", response);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Ошибка сохранения (ответ сервера):", errorData);
            } else {
                const successData = await response.json();
                console.log("Канвас успешно сохранён (ответ сервера):", successData);
            }
        } catch (error) {
            console.error("Ошибка при попытке сохранить канвас:", error);
        }
    }, [canvasId, getCanvasData]);

    useEffect(() => {
        if (setSaveCanvas) {
            setSaveCanvas(() => saveCanvasData);
        }
    }, [setSaveCanvas, saveCanvasData]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            saveCanvasData();
            event.preventDefault();
            event.returnValue = ''; // Требуется для предупреждения о выходе
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveCanvasData]);

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
            <canvas ref={canvasRef} className="border-0" />
        </div>
    );
});

export default CanvasComponent;

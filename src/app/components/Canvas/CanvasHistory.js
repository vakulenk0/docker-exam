import * as fabric from 'fabric';

class CanvasHistory {
    constructor(canvas) {
        this.canvas = canvas;
        this.history = [];
        this.historyRedo = [];
        this._isClearingCanvas = false; // Флаг для предотвращения отслеживания очистки холста
        this._isApplyingState = false; // Флаг для предотвращения сохранения при undo/redo

        this._init();
    }

    _init() {
        this._saveCanvasState(); // Сохраняем начальное состояние

        // Автоматически сохраняем состояние при изменении холста
        this.canvas.on("custom:added", () => this._conditionalSave());
        this.canvas.on("object:modified", () => this._conditionalSave());
        this.canvas.on("object:removed", () => {
            if (!this._isClearingCanvas) {
                this._conditionalSave();
            }
        });
    }

    _conditionalSave() {
        if (!this._isApplyingState) {
            this._saveCanvasState();
        }
    }

    _saveCanvasState() {
        const objects = this.canvas.getObjects().filter(obj => !obj.isBoundary);
        const jsonCanvas = JSON.parse(JSON.stringify(objects.map(obj => obj.toObject())));
        if (this.history.length === 0 || JSON.stringify(this.history[this.history.length - 1]) !== JSON.stringify(jsonCanvas)) {
            this.history.push(jsonCanvas);
            console.log("State saved. Current history:", this.history);
        }
    }

    _clearCanvas() {
        this._isClearingCanvas = true;
        this.canvas.getObjects()
            .filter((obj) => !obj.isBoundary) // Удаляем только объекты, кроме границы
            .forEach((obj) => this.canvas.remove(obj));
        this._isClearingCanvas = false;
    }

    async undo() {
        if (this.history.length <= 1) return; // Нельзя откатиться дальше начального состояния

        // Убираем последнее состояние в стек редо
        const currentState = this.history.pop();
        this.historyRedo.push(currentState);

        // Применяем предыдущее состояние
        const lastState = this.history[this.history.length - 1];
        await this._applyState(lastState);
    }

    async redo() {
        if (this.historyRedo.length === 0) return; // Нельзя повторить действия, если нет редо-истории

        // Возвращаем состояние из стека редо
        const nextState = this.historyRedo.pop();
        this.history.push(nextState);

        // Применяем состояние
        await this._applyState(nextState);
    }

    async _applyState(state) {
        this._isApplyingState = true; // Устанавливаем флаг, чтобы предотвратить сохранение
        this._clearCanvas();

        const objects = await fabric.util.enlivenObjects(state);
        objects.forEach((obj) => {
            this.canvas.add(obj);
        });

        this._isApplyingState = false; // Сбрасываем флаг

        this.canvas.renderAll();
    }
}

export default CanvasHistory;

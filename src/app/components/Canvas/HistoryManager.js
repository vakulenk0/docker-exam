import cloneDeep from 'lodash/cloneDeep';

export default class HistoryManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.history = [];
        this.historyIndex = -1;
        this.objectMap = new Map();
        this.mapIndex = 0;
        this.saveState = true;
        this.keysToSave = ["angle", "left", "top", "scaleX", "scaleY", "skewX", "skewY", "fill"];
        this._setupCanvasEvents();
    }

    _setupCanvasEvents() {
        this.canvas.on('object:added', (e) => {
            if (!this.saveState || !e.target.saveable) return;
            const uniqueId = this._addToMap(e.target);
            this._addState(uniqueId, 'add', null, null);
        });

        this.canvas.on('object:removed', (e) => {
            if (!this.saveState || !e.target.saveable) return;
            const uniqueId = e.target.uniqueId;
            this._addState(uniqueId, 'remove', null, null);
        });

        this.canvas.on('object:modified', (e) => {
            if (!this.saveState || !e.target.saveable) return;
            const uniqueId = this._addToMap(e.target);
            const beforeProperties = {};
            const afterProperties = {};

            this.keysToSave.forEach((key) => {
                afterProperties[key] = e.target[key];
                beforeProperties[key] = e.transform?.original[key] || e.target[key];
            });

            this._addState(uniqueId, 'modify', beforeProperties, afterProperties);
        });
    }

    _addToMap(object) {
        if (object.uniqueId) return object.uniqueId;
        this.mapIndex += 1;
        object.uniqueId = this.mapIndex;
        this.objectMap.set(this.mapIndex, object);
        return this.mapIndex;
    }

    _addState(uniqueId, action, before, after) {
        this.historyIndex += 1;
        this.history = this.history.slice(0, this.historyIndex);
        this.history.push([{ uniqueId, action, before: cloneDeep(before), after: cloneDeep(after) }]);
    }

    _applyState(object, state, reverse) {
        const properties = reverse ? state.before : state.after;
        object.set(properties);
        object.setCoords();
        this.canvas.requestRenderAll();
    }

    undo() {
        if (this.historyIndex < 0) return;
        this.saveState = false;

        const currentStates = this.history[this.historyIndex];
        currentStates.forEach((state) => {
            const object = this.objectMap.get(state.uniqueId);
            switch (state.action) {
                case 'add':
                    this.canvas.remove(object);
                    break;
                case 'remove':
                    this.canvas.add(object);
                    break;
                case 'modify':
                    this._applyState(object, state, true);
                    break;
            }
        });

        this.historyIndex -= 1;
        this.saveState = true;
        this.canvas.requestRenderAll();
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        this.saveState = false;

        this.historyIndex += 1;
        const currentStates = this.history[this.historyIndex];
        currentStates.forEach((state) => {
            const object = this.objectMap.get(state.uniqueId);
            switch (state.action) {
                case 'add':
                    this.canvas.add(object);
                    break;
                case 'remove':
                    this.canvas.remove(object);
                    break;
                case 'modify':
                    this._applyState(object, state, false);
                    break;
            }
        });

        this.saveState = true;
        this.canvas.requestRenderAll();
    }
}

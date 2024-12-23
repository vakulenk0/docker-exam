'use client';

import React from 'react';
import { createPortal } from 'react-dom';

function ObjectMenu({ isVisible, position, target, onUpdateObject }) {
    if (!isVisible || !target) return null;

    return createPortal(
        <div
            className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-2xl z-50 border border-gray-700 flex items-center space-x-4"
            style={{
                top: position.y, // Абсолютная координата Y
                left: position.x, // Абсолютная координата X
            }}
        >
            {/* Цвет заливки */}
            <input
                type="color"
                value={target.fill || '#ffffff'}
                onChange={(e) => onUpdateObject('fill', e.target.value)}
                className="w-8 h-8 rounded-lg border border-gray-600 hover:ring-2 hover:ring-blue-500"
            />

            <input
                type="color"
                value={target.stroke || '#000000'}
                onChange={(e) => onUpdateObject('stroke', e.target.value)}
                className="w-8 h-8 rounded-lg border border-gray-600 hover:ring-2 hover:ring-blue-500"
            />

            <input
                type="number"
                value={target.strokeWidth || 1}
                onChange={(e) => onUpdateObject('strokeWidth', parseFloat(e.target.value))}
                className="bg-gray-800 text-white p-1 rounded-md w-16 text-center border border-gray-600 focus:ring-2 focus:ring-blue-500"
                min={0}
            />

            <input
                type="range"
                value={target.opacity !== undefined ? target.opacity * 100 : 100}
                onChange={(e) => onUpdateObject('opacity', parseFloat(e.target.value) / 100)}
                className="w-24 accent-blue-500 hover:accent-blue-400"
                min={0}
                max={100}
            />
        </div>,
        document.body // Рендерим элемент в document.body
    );
}

export default ObjectMenu;
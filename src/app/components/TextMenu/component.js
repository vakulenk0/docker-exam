import React from 'react';
import { createPortal } from 'react-dom';

function TextMenu({ isVisible, position, target, onUpdateText }) {
    if (!isVisible || !target) return null;

    // Если window недоступен, ничего не рендерим
    if (typeof window === 'undefined') return null;

    return createPortal(
        <div
            className="absolute bg-gray-800 text-white p-2 rounded shadow-lg z-50"
            style={{
                top: position.y, // Абсолютная координата Y
                left: position.x, // Абсолютная координата X
            }}
        >
            <div className="flex space-x-2">
                {/* Шрифт */}
                <select
                    className="bg-gray-700 text-white p-1 rounded"
                    value={target.fontFamily || 'Arial'}
                    onChange={(e) => onUpdateText('fontFamily', e.target.value)}
                >
                    <option value="Arial">Arial</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Courier New">Courier New</option>
                </select>

                {/* Размер шрифта */}
                <input
                    type="number"
                    className="bg-gray-700 text-white p-1 rounded w-16 font-sans"
                    value={target.fontSize || 16}
                    onChange={(e) => onUpdateText('fontSize', parseInt(e.target.value, 10))}
                />

                {/* Цвет текста */}
                <input
                    type="color"
                    className="w-8 h-8"
                    value={target.fill || '#000000'}
                    onChange={(e) => onUpdateText('fill', e.target.value)}
                />
            </div>
        </div>,
        document.body // Рендерим элемент в document.body
    );
}

export default TextMenu;

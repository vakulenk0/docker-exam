'use client';

import React from 'react';
import { createPortal } from 'react-dom';

function ContextMenu({ isVisible, position, options, onOptionClick }) {
    if (!isVisible) return null;

    // Если window недоступен, тоже пока ничего не рендерим (SSR-сценарий)
    if (typeof window === 'undefined') return null;

    return createPortal(
        <div
            className="fixed z-50 bg-gray-800 border border-gray-600 shadow-lg rounded-lg w-56"
            style={{
                top: position.y,
                left: position.x,
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Мапим переданные options */}
            {options.map((option, index) => (
                <button
                    key={index}
                    onClick={() => {
                        onOptionClick(option);
                    }}
                    className="block w-full px-4 py-2 text-left font-sans text-sm text-white bg-gray-800 hover:bg-gray-600 rounded transition-all duration-200"
                >
                    {option.label}
                </button>
            ))}
        </div>,
        // Место в DOM, куда порталим (обычно document.body)
        document.body
    );
}

export default ContextMenu;
'use client';

import React, { useEffect, useState } from 'react';
import CanvasComponent from "@/app/components/Canvas/component";
import { fetchWithAuth } from "@/app/lib/clientAuth";

export default function CanvasPage({ params }) {
    const [canvasData, setCanvasData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // Разворачиваем params
    const { id } = React.use(params);

    useEffect(() => {
        if (!id) {
            setErrorMessage("ID канваса не найден.");
            setLoading(false);
            return;
        }

        const fetchCanvas = async () => {
            try {
                console.log(`Запрос на загрузку канваса с ID: ${id}`);
                const response = await fetchWithAuth(`/api/canvas/${id}`);
                console.log("Ответ сервера на загрузку канваса:", response);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Ошибка загрузки канваса (ответ сервера):", errorData);
                    setErrorMessage(errorData.message || 'Ошибка при загрузке канваса');
                    return;
                }

                const data = await response.json();
                console.log("Полученные данные канваса:", data);

                const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
                console.log("Контент канваса (после парсинга):", content);

                setCanvasData(content);
            } catch (error) {
                console.error("Ошибка загрузки данных канваса:", error);
                setErrorMessage("Ошибка загрузки данных канваса.");
            } finally {
                setLoading(false);
            }
        };

        fetchCanvas();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="flex items-center space-x-2 text-gray-600">
                    <svg
                        className="w-8 h-8 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                    </svg>
                    <span className="text-xl font-medium">Загрузка...</span>
                </div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Ошибка:</strong>
                    <span className="block sm:inline ml-2">{errorMessage}</span>
                </div>
            </div>
        );
    }

    if (!canvasData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-gray-500 text-lg font-medium">
                    Канвас не найден
                </div>
            </div>
        );
    }

    return (
        <CanvasComponent
            initialData={canvasData}
            canvasId={id} // Передаём ID канваса
        />
    );
}

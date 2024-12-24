'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from "@/app/lib/clientAuth";

export default function Dashboard() {
    const [canvases, setCanvases] = useState([]);
    const [newCanvasTitle, setNewCanvasTitle] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [username, setUsername] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            fetchUserData();
            fetchCanvases();
        }
    }, []);

    const fetchUserData = async () => {
        try {
            const response = await fetchWithAuth('/api/user'); // Реализуйте соответствующий API-эндпоинт
            const data = await response.json();
            if (response.ok) {
                setUsername(data.username);
            } else {
                console.error('Ошибка при загрузке данных пользователя:', data.message);
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных пользователя:', error);
        }
    };

    const fetchCanvases = async () => {
        try {
            const response = await fetchWithAuth('/api/canvas');
            const data = await response.json();
            if (response.ok) {
                setCanvases(data.canvases);
            } else {
                setErrorMessage(data.message || 'Ошибка при загрузке канвасов');
            }
        } catch (error) {
            setErrorMessage('Ошибка при загрузке данных');
        }
    };

    const createCanvas = async () => {
        try {
            const response = await fetchWithAuth('/api/canvas/create', {
                method: 'POST',
                body: JSON.stringify({ title: newCanvasTitle }),
            });

            const data = await response.json();
            if (response.ok) {
                setCanvases([...canvases, data.canvas]);
                setNewCanvasTitle('');
            } else {
                setErrorMessage(data.message || 'Ошибка при создании канваса');
            }
        } catch (error) {
            setErrorMessage('Ошибка при создании канваса');
        }
    };

    const deleteCanvas = async (id) => {
        try {
            const response = await fetchWithAuth('/api/canvas/delete', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
            });

            if (response.ok) {
                setCanvases(canvases.filter((canvas) => canvas.id !== id));
            } else {
                setErrorMessage('Ошибка при удалении канваса');
            }
        } catch (error) {
            setErrorMessage('Ошибка при удалении канваса');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="container mx-auto py-8 px-4">
                {/* Верхняя панель */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Здравствуйте, {username || 'Гость'}!
                    </h2>
                    <button
                        onClick={logout}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-md"
                    >
                        Выйти
                    </button>
                </div>

                <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">
                    Ваши Канвасы
                </h1>

                {errorMessage && (
                    <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
                        {errorMessage}
                    </div>
                )}

                {/* Форма для добавления канваса */}
                <div className="flex justify-between items-center mb-6">
                    <input
                        type="text"
                        value={newCanvasTitle}
                        onChange={(e) => setNewCanvasTitle(e.target.value)}
                        placeholder="Введите название канваса"
                        className="flex-grow mr-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={createCanvas}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md"
                    >
                        Создать Канвас
                    </button>
                </div>

                {/* Список канвасов */}
                {canvases.length === 0 ? (
                    <div className="text-center text-gray-500">
                        У вас пока нет канвасов. Создайте свой первый канвас!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {canvases.map((canvas) => (
                            <div
                                key={canvas.id}
                                className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300"
                            >
                                <h2 className="text-xl font-semibold text-gray-800 truncate">
                                    {canvas.title}
                                </h2>
                                <p className="text-sm text-gray-500 mt-2">
                                    Создан: {new Date(canvas.createdAt).toLocaleDateString()}
                                </p>
                                <div className="mt-4 flex justify-between items-center">
                                    <a
                                        href={`/canvas/${canvas.id}`}
                                        className="text-blue-500 hover:underline"
                                    >
                                        Открыть
                                    </a>
                                    <button
                                        onClick={() => deleteCanvas(canvas.id)}
                                        className="text-red-500 hover:underline"
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
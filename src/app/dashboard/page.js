'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {fetchWithAuth} from "@/app/utils/auth";

export default function Dashboard() {
    const [canvases, setCanvases] = useState([]);
    const [newCanvasTitle, setNewCanvasTitle] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            fetchCanvases(token);
        }
    }, []);

    const fetchCanvases = async (token) => {
        try {
            const response = await fetchWithAuth('/api/canvas');

            const data = await response.json();
            if (response.ok) {
                setCanvases(data.canvases);
            }
        } catch (error) {
            console.error('Ошибка при загрузке канвасов', error);
        }
    };

    const createCanvas = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetchWithAuth('/api/canvas/create', {
                method: 'POST',
                body: JSON.stringify({ title: newCanvasTitle }),
            });

            const data = await response.json();
            if (response.ok) {
                setCanvases([...canvases, data.canvas]);
                setNewCanvasTitle('');
            }
        } catch (error) {
            console.error('Ошибка при создании канваса', error);
        }
    };

    const deleteCanvas = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetchWithAuth('/api/canvas/delete', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
            });

            if (response.ok) {
                setCanvases(canvases.filter((canvas) => canvas.id !== id));
            }
        } catch (error) {
            console.error('Ошибка при удалении канваса', error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Ваши канвасы</h1>
            <div className="mb-4">
                <input
                    type="text"
                    value={newCanvasTitle}
                    onChange={(e) => setNewCanvasTitle(e.target.value)}
                    placeholder="Название канваса"
                    className="border px-4 py-2 mr-2 rounded"
                />
                <button
                    onClick={createCanvas}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Создать канвас
                </button>
            </div>
            <ul className="list-disc pl-5">
                {canvases.map((canvas) => (
                    <li key={canvas.id} className="flex items-center">
                        <a
                            href={`/canvas/${canvas.id}`}
                            className="text-blue-500 hover:underline flex-1"
                        >
                            {canvas.title}
                        </a>
                        <button
                            onClick={() => deleteCanvas(canvas.id)}
                            className="text-red-500 hover:underline ml-4"
                        >
                            Удалить
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

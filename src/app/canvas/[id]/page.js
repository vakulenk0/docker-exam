'use client';

import { useEffect, useState } from 'react';
import CanvasComponent from '@/app/components/Canvas/component';
import { useRouter } from 'next/navigation';
import {fetchWithAuth} from "@/app/utils/auth";

export default function CanvasPage({ params: initialParams }) {
    const [id, setId] = useState(null);
    const [canvasData, setCanvasData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchParams = async () => {
            const resolvedParams = await initialParams;
            setId(resolvedParams.id); // Извлечение параметра ID
        };

        fetchParams();
    }, [initialParams]);

    useEffect(() => {
        if (!id) return;

        const fetchCanvas = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const response = await fetchWithAuth(`/api/canvas/${id}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    setErrorMessage(errorData.message || 'Ошибка при загрузке канваса');
                    router.push('/dashboard');
                    return;
                }

                const data = await response.json();
                setCanvasData(data.content || {}); // Убедитесь, что формат подходит
            } catch (error) {
                setErrorMessage('Ошибка при загрузке канваса');
                router.push('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchCanvas();
    }, [id, router]);

    const handleSave = async (data) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setErrorMessage('Вы не авторизованы. Войдите в систему.');
            return;
        }

        try {
            const response = await fetchWithAuth(`/api/canvas/save`, {
                method: 'PUT',
                body: JSON.stringify({ id, content: data }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Ошибка при сохранении канваса');
                return;
            }

            const result = await response.json();
            console.log('Канвас успешно сохранён:', result);
        } catch (error) {
            console.error('Ошибка при сохранении канваса:', error);
            setErrorMessage('Произошла ошибка при сохранении канваса.');
        }
    };

    if (loading) return <div>Загрузка...</div>;
    if (errorMessage) return <div className="text-red-500">{errorMessage}</div>;
    if (!canvasData) return <div>Канвас не найден</div>;

    return (
        <CanvasComponent
            initialData={canvasData}
            saveEndpoint={`/api/canvas/save`}
            onSave={handleSave}
        />
    );
}

import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/app/lib/serverAuth';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded || !decoded.userId) {
            return new Response(JSON.stringify({ message: 'Неавторизованный запрос' }), { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { username: true, avatar: true },
        });

        if (!user) {
            return new Response(JSON.stringify({ message: 'Пользователь не найден' }), { status: 404 });
        }

        // Проверка аватара: если он пустой, то подставляем дефолтное изображение
        const avatarUrl = user.avatar && user.avatar.trim() !== '' ? user.avatar : '/default-avatar.png';

        return new Response(
            JSON.stringify({ username: user.username, avatar: avatarUrl }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        return new Response(
            JSON.stringify({ message: 'Ошибка сервера', error: error.message }),
            { status: 500 }
        );
    }
}
import { PrismaClient } from '@prisma/client';
import { verifyToken } from "@/app/utils/auth";

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        // Извлекаем токен из заголовка Authorization
        const token = req.headers.get('authorization')?.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: 'Неавторизованный запрос' }), { status: 401 });
        }

        // Получаем список всех канвасов пользователя
        const canvases = await prisma.canvas.findMany({
            where: { userId: decoded.userId },
            select: {
                id: true,
                title: true,
                createdAt: true,
            },
        });

        return new Response(JSON.stringify({ canvases }), { status: 200 });
    } catch (error) {
        console.error("Ошибка при получении канвасов:", error);
        return new Response(JSON.stringify({ message: 'Ошибка при получении канвасов', error: error.message }), { status: 500 });
    }
}

import { PrismaClient } from '@prisma/client';
import { verifyToken } from "@/app/utils/auth";

const prisma = new PrismaClient();

export async function GET(req, context) {
    try {
        const params = await context.params; // Ожидаем асинхронное получение params
        const id = params?.id;

        if (!id) {
            return new Response(JSON.stringify({ message: 'ID канваса не указан' }), { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: 'Неавторизованный запрос' }), { status: 401 });
        }

        const canvas = await prisma.canvas.findUnique({
            where: { id: parseInt(id) },
        });

        if (!canvas || canvas.userId !== decoded.userId) {
            return new Response(JSON.stringify({ message: 'Доступ запрещён' }), { status: 403 });
        }

        return new Response(JSON.stringify(canvas), { status: 200 });
    } catch (error) {
        console.error('Ошибка при получении канваса:', error);
        return new Response(JSON.stringify({ message: 'Ошибка при получении канваса', error: error.message }), { status: 500 });
    }
}

import { PrismaClient } from '@prisma/client';
import { verifyToken } from "@/app/utils/auth";

const prisma = new PrismaClient();

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, content } = body;

        const token = req.headers.get('authorization')?.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: 'Неавторизованный запрос' }), { status: 401 });
        }

        const canvas = await prisma.canvas.findUnique({ where: { id } });

        if (!canvas || canvas.userId !== decoded.userId) {
            return new Response(JSON.stringify({ message: 'Доступ запрещён' }), { status: 403 });
        }

        const updatedCanvas = await prisma.canvas.update({
            where: { id },
            data: { content: JSON.stringify(content) },
        });

        return new Response(JSON.stringify({ message: 'Канвас обновлён', canvas: updatedCanvas }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ message: 'Ошибка при сохранении канваса', error }), { status: 500 });
    }
}

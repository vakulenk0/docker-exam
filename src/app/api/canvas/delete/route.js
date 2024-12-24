import { PrismaClient } from '@prisma/client';
import { verifyToken } from "@/app/utils/auth";

const prisma = new PrismaClient();

export async function DELETE(req) {
    try {
        const body = await req.json();
        const { id } = body;

        const token = req.headers.get('authorization')?.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: 'Неавторизованный запрос' }), { status: 401 });
        }

        const canvas = await prisma.canvas.findUnique({
            where: { id },
        });

        if (!canvas || canvas.userId !== decoded.userId) {
            return new Response(JSON.stringify({ message: 'Доступ запрещён' }), { status: 403 });
        }

        await prisma.canvas.delete({ where: { id } });

        return new Response(JSON.stringify({ message: 'Канвас удалён' }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ message: 'Ошибка при удалении канваса', error }), { status: 500 });
    }
}

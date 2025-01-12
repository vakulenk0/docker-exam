import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/app/lib/serverAuth';

const prisma = new PrismaClient();

export async function PUT(req) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: 'Неавторизованный запрос' }), { status: 401 });
        }

        const body = await req.json();
        const { avatarUrl } = body;

        if (!avatarUrl) {
            return new Response(JSON.stringify({ message: 'URL аватара не указан' }), { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: decoded.userId },
            data: { avatar: avatarUrl },
        });

        return new Response(JSON.stringify({ message: 'Аватар обновлен', user: updatedUser }), { status: 200 });
    } catch (error) {
        console.error('Ошибка обновления аватара:', error);
        return new Response(JSON.stringify({ message: 'Ошибка сервера', error: error.message }), { status: 500 });
    }
}

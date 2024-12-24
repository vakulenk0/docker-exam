import { verifyRefreshToken, generateTokens } from "@/app/utils/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const { refreshToken } = await req.json();

        // Проверяем refresh токен
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded || decoded.error) {
            return new Response(
                JSON.stringify({ message: "Неверный или истёкший refresh токен" }),
                { status: 401 }
            );
        }

        // Проверяем существование пользователя
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return new Response(
                JSON.stringify({ message: "Пользователь не найден" }),
                { status: 404 }
            );
        }

        // Генерируем новые токены
        const tokens = generateTokens({ userId: user.id });

        return new Response(JSON.stringify(tokens), { status: 200 });
    } catch (error) {
        console.error("Ошибка обновления токена:", error);
        return new Response(
            JSON.stringify({ message: "Ошибка сервера" }),
            { status: 500 }
        );
    }
}

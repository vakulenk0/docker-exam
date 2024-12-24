import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/app/lib/serverAuth";

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const token = req.headers.get("authorization")?.split(" ")[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: "Неавторизованный запрос" }), { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { username: true },
        });

        if (!user) {
            return new Response(JSON.stringify({ message: "Пользователь не найден" }), { status: 404 });
        }

        return new Response(JSON.stringify(user), { status: 200 });
    } catch (error) {
        console.error("Ошибка получения данных пользователя:", error);
        return new Response(
            JSON.stringify({ message: "Ошибка сервера", error: error.message }),
            { status: 500 }
        );
    }
}

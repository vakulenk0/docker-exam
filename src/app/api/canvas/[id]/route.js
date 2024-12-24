// app/api/canvas/[id]/route.js
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/app/lib/serverAuth";

const prisma = new PrismaClient();

export async function GET(req, context) {
    try {
        const { id } = await context.params;
        console.log("Запрос на загрузку канваса с ID:", id);

        if (!id) {
            console.error("ID канваса не указан.");
            return new Response(JSON.stringify({ message: "ID канваса не указан" }), { status: 400 });
        }

        const token = req.headers.get("authorization")?.split(" ")[1];
        console.log("Полученный токен:", token);

        const decoded = verifyToken(token);
        if (!decoded) {
            console.error("Не удалось авторизовать запрос.");
            return new Response(JSON.stringify({ message: "Неавторизованный запрос" }), { status: 401 });
        }

        console.log("Пользователь авторизован:", decoded);

        const canvas = await prisma.canvas.findUnique({
            where: { id: parseInt(id) },
        });

        console.log("Данные канваса, загруженные из базы данных:", canvas);

        if (!canvas || canvas.userId !== decoded.userId) {
            console.error("Доступ к канвасу запрещён.", { canvas, userId: decoded.userId });
            return new Response(JSON.stringify({ message: "Доступ запрещён" }), { status: 403 });
        }

        return new Response(JSON.stringify(canvas), { status: 200 });
    } catch (error) {
        console.error("Ошибка при получении канваса:", error);
        return new Response(
            JSON.stringify({ message: "Ошибка при получении канваса", error: error.message }),
            { status: 500 }
        );
    }
}


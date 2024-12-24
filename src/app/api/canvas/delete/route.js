// app/api/canvas/delete/route.js
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/app/lib/serverAuth";

const prisma = new PrismaClient();

export async function DELETE(req) {
    try {
        const body = await req.json();
        const { id } = body;

        console.log("Получен запрос на удаление канваса:", body);

        if (!id) {
            return new Response(JSON.stringify({ message: "ID канваса не указан" }), { status: 400 });
        }

        const token = req.headers.get("authorization")?.split(" ")[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: "Неавторизованный запрос" }), { status: 401 });
        }

        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
            return new Response(JSON.stringify({ message: "Некорректный ID канваса" }), { status: 400 });
        }

        const canvas = await prisma.canvas.findUnique({ where: { id: parsedId } });

        if (!canvas || canvas.userId !== decoded.userId) {
            return new Response(JSON.stringify({ message: "Доступ запрещён" }), { status: 403 });
        }

        await prisma.canvas.delete({ where: { id: parsedId } });

        console.log(`Канвас с ID ${parsedId} успешно удалён.`);

        return new Response(JSON.stringify({ message: "Канвас удалён" }), { status: 200 });
    } catch (error) {
        console.error("Ошибка при удалении канваса:", error);
        return new Response(
            JSON.stringify({ message: "Ошибка при удалении канваса", error: error.message }),
            { status: 500 }
        );
    }
}

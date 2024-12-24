import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/app/lib/serverAuth";

const prisma = new PrismaClient();

export async function PUT(req) {
    try {
        console.log("Запрос на сохранение канваса принят.");

        const body = await req.json();
        console.log("Полученные данные в запросе:", body);

        const { id, content } = body;

        if (!id || !content) {
            console.error("Некорректные данные для сохранения:", { id, content });
            return new Response(
                JSON.stringify({ message: "Некорректные данные для сохранения." }),
                { status: 400 }
            );
        }

        const token = req.headers.get("authorization")?.split(" ")[1];
        console.log("Полученный токен:", token);

        const decoded = verifyToken(token);
        if (!decoded) {
            console.error("Не удалось авторизовать запрос.");
            return new Response(JSON.stringify({ message: "Неавторизованный запрос" }), { status: 401 });
        }

        console.log("Пользователь авторизован:", decoded);

        const canvas = await prisma.canvas.findUnique({ where: { id: parseInt(id) } });
        console.log("Найденный канвас в базе данных:", canvas);

        if (!canvas || canvas.userId !== decoded.userId) {
            console.error("Доступ запрещён:", { canvas, userId: decoded.userId });
            return new Response(JSON.stringify({ message: "Доступ запрещён" }), { status: 403 });
        }

        console.log("Начинаем обновление канваса...");

        // Проверка корректности JSON-формата content
        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
            console.log("Парсинг данных канваса успешен:", parsedContent);
        } catch (err) {
            console.error("Некорректный формат данных канваса:", err.message);
            return new Response(
                JSON.stringify({ message: "Некорректный формат данных канваса", error: err.message }),
                { status: 400 }
            );
        }

        const updatedCanvas = await prisma.canvas.update({
            where: { id: parseInt(id) },
            data: { content: parsedContent },
        });

        console.log("Канвас успешно обновлён в базе данных:", updatedCanvas);

        return new Response(JSON.stringify({ message: "Канвас успешно сохранён", canvas: updatedCanvas }), { status: 200 });
    } catch (error) {
        console.error("Ошибка при сохранении канваса:", error);
        return new Response(
            JSON.stringify({ message: "Ошибка при сохранении канваса", error: error.message }),
            { status: 500 }
        );
    }
}


import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/app/lib/serverAuth";

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const body = await req.json();
        const { title } = body;

        const token = req.headers.get("authorization")?.split(" ")[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return new Response(JSON.stringify({ message: "Неавторизованный запрос" }), { status: 401 });
        }

        const canvas = await prisma.canvas.create({
            data: {
                title: title || "Новый канвас",
                userId: decoded.userId,
            },
        });

        return new Response(JSON.stringify({ message: "Канвас создан", canvas }), { status: 201 });
    } catch (error) {
        console.error("Ошибка при создании канваса:", error);
        return new Response(
            JSON.stringify({ message: "Ошибка при создании канваса", error: error.message }),
            { status: 500 }
        );
    }
}

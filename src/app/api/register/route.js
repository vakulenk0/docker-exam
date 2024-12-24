import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import * as yup from "yup";
import {generateTokens} from "@/app/lib/serverAuth";

const prisma = new PrismaClient();

const userSchema = yup.object().shape({
    username: yup.string().min(3).required(),
    email: yup.string().email().required(),
    password: yup.string().min(8).required(),
});

export async function POST(req) {
    try {
        const body = await req.json();

        await userSchema.validate(body, { abortEarly: false });
        const { username, email, password } = body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { username, email, password: hashedPassword },
        });

        const tokens = generateTokens({ userId: user.id });

        return new Response(
            JSON.stringify({
                message: "Пользователь успешно зарегистрирован",
                user,
                ...tokens, // Возвращаем токены в ответе
            }),
            { status: 201 }
        );
    } catch (error) {
        if (error.name === "ValidationError") {
            return new Response(
                JSON.stringify({ message: "Ошибка валидации", errors: error.errors }),
                { status: 400 }
            );
        }
        return new Response(JSON.stringify({ message: "Ошибка сервера", error: error.message }), { status: 500 });
    }
}
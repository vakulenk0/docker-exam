import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateTokens } from "@/app/utils/auth";
import * as yup from "yup";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const loginSchema = yup.object().shape({
    email: yup.string().email("Некорректный формат электронной почты").required("Электронная почта обязательна"),
    password: yup.string().min(8, "Пароль должен содержать минимум 8 символов").required("Пароль обязателен"),
});

export async function POST(req) {
    try {
        const body = await req.json();
        await loginSchema.validate(body, { abortEarly: false });

        const { email, password } = body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return new Response(JSON.stringify({ message: "Пользователь не найден" }), { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return new Response(JSON.stringify({ message: "Неправильный пароль" }), { status: 401 });
        }

        const tokens = generateTokens({ userId: user.id });
        return new Response(
            JSON.stringify({ message: "Успешный вход", ...tokens }),
            { status: 200 }
        );
    } catch (error) {
        if (error.name === "ValidationError") {
            return new Response(JSON.stringify({ message: "Ошибка валидации", errors: error.errors }), { status: 400 });
        }
        return new Response(JSON.stringify({ message: "Ошибка сервера", error: error.message }), { status: 500 });
    }
}

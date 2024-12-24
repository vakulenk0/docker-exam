import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as yup from 'yup';

const prisma = new PrismaClient();

// Схема валидации
const userSchema = yup.object().shape({
    username: yup.string().min(3, 'Имя пользователя должно содержать минимум 3 символа').required('Имя пользователя обязательно'),
    email: yup.string().email('Некорректный формат электронной почты').required('Электронная почта обязательна'),
    password: yup.string().min(8, 'Пароль должен содержать минимум 8 символов').required('Пароль обязателен'),
});

export async function POST(req) {
    try {
        const body = await req.json();

        // Валидация данных
        await userSchema.validate(body, { abortEarly: false });

        const { username, email, password } = body;

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        const user = await prisma.user.create({
            data: { username, email, password: hashedPassword },
        });

        return new Response(
            JSON.stringify({ message: 'Пользователь успешно зарегистрирован', user }),
            { status: 201 }
        );
    } catch (error) {
        if (error.name === 'ValidationError') {
            // Обработка ошибок валидации
            return new Response(
                JSON.stringify({ message: 'Ошибка валидации', errors: error.errors }),
                { status: 400 }
            );
        }
        return new Response(
            JSON.stringify({ message: 'Ошибка сервера', error: error.message }),
            { status: 500 }
        );
    }
}

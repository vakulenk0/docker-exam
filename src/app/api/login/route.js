import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as yup from 'yup';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Схема валидации входных данных
const loginSchema = yup.object().shape({
    email: yup
        .string()
        .email('Некорректный формат электронной почты')
        .required('Электронная почта обязательна'),
    password: yup
        .string()
        .min(8, 'Пароль должен содержать минимум 8 символов')
        .required('Пароль обязателен'),
});

export async function POST(req) {
    try {
        const body = await req.json();

        // Валидация данных
        await loginSchema.validate(body, { abortEarly: false });

        const { email, password } = body;

        // Поиск пользователя по email
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return new Response(
                JSON.stringify({ message: 'Пользователь не найден' }),
                { status: 401 }
            );
        }

        // Проверка пароля
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return new Response(
                JSON.stringify({ message: 'Неправильный пароль' }),
                { status: 401 }
            );
        }

        // Генерация JWT токена
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

        return new Response(
            JSON.stringify({ message: 'Успешный вход', token }),
            { status: 200 }
        );
    } catch (error) {
        if (error.name === 'ValidationError') {
            return new Response(
                JSON.stringify({
                    message: 'Ошибка валидации',
                    errors: error.errors,
                }),
                { status: 400 }
            );
        }

        return new Response(
            JSON.stringify({ message: 'Ошибка при входе', error: error.message }),
            { status: 500 }
        );
    }
}

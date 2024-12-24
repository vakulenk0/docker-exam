import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your_refresh_secret';

export async function POST(req) {
    try {
        const { refreshToken } = await req.json();

        // Проверяем refresh токен
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

        if (!decoded) {
            return new Response(JSON.stringify({ message: 'Неавторизованный запрос' }), { status: 401 });
        }

        // Генерируем новый access токен
        const newAccessToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '1h' });

        return new Response(JSON.stringify({ accessToken: newAccessToken }), { status: 200 });
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        return new Response(JSON.stringify({ message: 'Ошибка обновления токена', error }), { status: 401 });
    }
}

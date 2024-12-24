import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET

// Функция для проверки токена
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.error('Токен истёк:', error);
            throw new Error('TokenExpiredError');
        }
        console.error('Ошибка проверки токена:', error);
        return null;
    }
}


// Функция для генерации токена (может понадобиться для тестов)
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

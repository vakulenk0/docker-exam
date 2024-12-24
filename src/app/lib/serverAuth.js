// app/lib/serverAuth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
    console.error("Переменные окружения не определены:", { JWT_SECRET, REFRESH_SECRET });
    throw new Error("JWT_SECRET или REFRESH_SECRET не определены в окружении");
}

// Генерация токенов
export function generateTokens(payload) {
    const accessToken = jwt.sign({ ...payload, type: "access" }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, { expiresIn: "7d" });
    return { accessToken, refreshToken };
}

// Проверка access токена
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error(`Ошибка проверки токена: ${error.name} - ${error.message}`);
        return { error: error.name, message: error.message };
    }
}

// Проверка refresh токена
export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
        console.error(`Ошибка проверки refresh токена: ${error.name} - ${error.message}`);
        return { error: error.name, message: error.message };
    }
}

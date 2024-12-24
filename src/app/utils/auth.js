import dotenv from "dotenv";
// const result = dotenv.config();
// const env = dotenv.config().parsed;
// if (result.error) {
//     console.error("Ошибка загрузки .env:", result.error);
// } else {
//     console.log("Переменные окружения успешно загружены:", result.parsed);
// }

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

console.log(REFRESH_SECRET);
console.log(JWT_SECRET)

if (!JWT_SECRET || !REFRESH_SECRET) {
    console.error("Переменные окружения не определены:", { JWT_SECRET, REFRESH_SECRET });
    throw new Error("JWT_SECRET или REFRESH_SECRET не определены в окружении");
}


// Генерация токенов
export function generateTokens(payload) {
    const accesssToken = jwt.sign({ ...payload, type: "access" }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, { expiresIn: "7d" });
    return { accesssToken, refreshToken };
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

export async function refreshToken() {
    try {
        const refreshToken = localStorage.getItem("refreshToken");
        const response = await fetch("/api/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            return data.accessToken;
        } else {
            console.error("Не удалось обновить токен:", data.message);
            return null;
        }
    } catch (error) {
        console.error("Ошибка при обновлении токена:", error);
        return null;
    }
}

export function isTokenExpired(token) {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
}


export async function fetchWithAuth(url, options = {}) {
    let token = localStorage.getItem("token");
    if (isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) {
            window.location.href = "/login"; // Перенаправление на страницу логина
            return;
        }
    }

    options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    return fetch(url, options);
}


// app/utils/clientAuth.js

// Проверка истечения токена
export function isTokenExpired(token) {
    if (!token) return true;
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;

    const payload = JSON.parse(atob(payloadBase64));
    return payload.exp * 1000 < Date.now();
}

// Обновление токена через /api/refresh
export async function refreshToken() {
    try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) return null;

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

// Основная функция запросов с авторизацией
export async function fetchWithAuth(url, options = {}) {
    let token = localStorage.getItem("token");

    if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) {
            window.location.href = "/login";
            return;
        }
    }

    options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    return fetch(url, options);
}

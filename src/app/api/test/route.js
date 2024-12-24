export async function GET() {
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    console.log("REFRESH_SECRET:", process.env.REFRESH_SECRET);

    return new Response("Проверка переменных окружения выполнена.", { status: 200 });
}

'use client'
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-800">Добро пожаловать!</h1>
      <div className="mt-8 flex space-x-4">
        <Link
          href="/login"
          className="px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Войти
        </Link>
        <Link
          href="/register"
          className="px-6 py-2 rounded bg-green-500 text-white hover:bg-green-600"
        >
          Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {fetchWithAuth} from "@/app/utils/auth";

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const response = await fetchWithAuth('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/login'); // Перенаправление на страницу логина
      } else if (response.status === 400) {
        // Ошибки валидации
        setErrorMessage(data.errors ? data.errors.join(', ') : data.message);
      } else {
        setErrorMessage(data.message || 'Ошибка регистрации');
      }
    } catch (error) {
      setErrorMessage('Произошла ошибка. Попробуйте позже.');
    }
  };

  return (
      <div className="flex min-h-screen font-sans items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Зарегистрироваться</h2>

          {/* Отображение ошибки */}
          {errorMessage && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
                {errorMessage}
              </div>
          )}

          <form className="mt-6" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="username">
                Имя пользователя
              </label>
              <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите имя пользователя"
                  required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Электронная почта
              </label>
              <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите вашу почту"
                  required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Пароль
              </label>
              <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите ваш пароль"
                  required
              />
            </div>
            <button
                type="submit"
                className="w-full px-4 py-2 mt-4 text-white bg-green-500 rounded hover:bg-green-600"
            >
              Зарегистрироваться
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-blue-500 hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
  );
}

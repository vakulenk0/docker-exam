import Link from 'next/link';

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800">Войти</h2>
        <form className="mt-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">
              Электронная почта
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите вашу почту"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-2 mt-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите ваш пароль"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Войти
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-blue-500 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
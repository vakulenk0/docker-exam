'use client'
import Head from 'next/head';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <Head>
        <title>Добро пожаловать</title>
        <meta name="description" content="Приветственная страница" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-gray-800">Добро пожаловать!</h1>

        <div className="mt-8 flex space-x-4">
          <button
            className="px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            onClick={() => alert('Войти нажато!')}
          >
            Войти
          </button>

          <button
            className="px-6 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            onClick={() => alert('Зарегистрироваться нажато!')}
          >
            Зарегистрироваться
          </button>
        </div>
      </main>
    </div>
  );
}

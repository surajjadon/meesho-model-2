import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Inventory Manager</h1>
        <p className="text-lg text-gray-600 mb-8">
          The all-in-one solution for processing labels and managing stock.
        </p>
        <Link 
          href="/dashboard" 
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
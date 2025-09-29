
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6">
          Shift Bidding System
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Employee roster management and bidding platform
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/admin"
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-md hover:bg-blue-700 transition"
          >
            Admin Panel
          </Link>
          
          <Link 
            href="/api/test-db"
            className="block w-full bg-green-600 text-white text-center py-3 rounded-md hover:bg-green-700 transition"
          >
            Test Database Connection
          </Link>
        </div>
      </div>
    </div>
  )
}

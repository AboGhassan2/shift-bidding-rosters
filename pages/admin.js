import { useState } from 'react'
import RosterTable from '../components/RosterTable'

export default function Admin() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [rosters, setRosters] = useState([])
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    totalLines: 2500
  })

  const handleGenerate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Example of frontend fetch with error handling
try {
  const response = await fetch('/api/roster/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year: 2025, month: 10 }),
  });

  if (!response.ok) {
    // Handle non-2xx responses (e.g., 500 errors)
    const errorText = await response.text(); // Get the HTML error page content
    console.error('API Error:', response.status, errorText);
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json(); // This line will fail if response is HTML
  console.log('Success:', data);
} catch (error) {
  console.error('Fetch Error:', error);
  // Handle the error appropriately in your UI
}
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Admin Panel - Roster Generation
        </h1>

        {/* Generation Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate New Roster</h2>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m-1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Lines
                </label>
                <input
                  type="number"
                  value={formData.totalLines}
                  onChange={(e) => setFormData({...formData, totalLines: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Generating...' : 'Generate Roster'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">
                ✓ Roster generated successfully! ID: {result.rosterPeriodId}
              </p>
              <p className="text-green-700 text-sm mt-1">
                Lines generated: {result.linesGenerated || 'Processing...'}
              </p>
            </div>
          )}
        </div>

        {/* Roster List */}
        <RosterTable rosters={rosters} onLoad={fetchRosters} />
      </div>
    </div>
  )
}

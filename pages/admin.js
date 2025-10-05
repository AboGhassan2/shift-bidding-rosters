// pages/admin.js
import { useState } from 'react'
import RosterTable from '../components/RosterTable' // Ensure this component exists

export default function Admin() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [rosters, setRosters] = useState([])
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    totalLines: 2500 // Note: totalLines is sent in the request but might not be used by the Python script directly
  })

  const handleGenerate = async (e) => {
    e.preventDefault() // Prevent default form submission behavior
    setLoading(true)   // Set loading state
    setError(null)     // Clear previous errors
    setResult(null)    // Clear previous results

    try {
      // Prepare the data to send to the API route
      // Use values from formData state instead of hardcoded ones
      const requestBody = {
        year: formData.year,
        month: formData.month,
        // totalLines: formData.totalLines // Include if the API route expects it, but the Python script might use its own default
      };

      console.log("Sending request to generate roster:", requestBody); // Debug log

      // Example of frontend fetch with error handling
      const response = await fetch('/api/roster/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody), // Send the prepared data
      });

      console.log("Response status:", response.status); // Debug log

      if (!response.ok) {
        // Handle non-2xx responses (e.g., 500 errors)
        const errorText = await response.text(); // Get the response body (could be HTML error page or JSON error)
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`); // Include response details in error
      }

      // Attempt to parse the response as JSON
      const data = await response.json(); 
      console.log('Success from API:', data);
      
      // Update state with the result
      setResult(data); // Assuming the API returns the relevant data
      setError(null); // Clear any previous error state if successful

    } catch (fetchError) {
      // This block catches network errors, non-JSON responses, or errors thrown above
      console.error('Fetch Error in handleGenerate:', fetchError);
      setError(fetchError.message); // Set the error message in state
      setResult(null); // Clear any previous result state
    } finally {
      // Always stop the loading state, regardless of success or error
      setLoading(false);
    }
  }

  // Placeholder for fetching existing rosters - you need to implement this API route
  const fetchRosters = async () => {
    // Example implementation:
    // try {
    //   const response = await fetch('/api/roster/list'); // You need to create this API route
    //   if (!response.ok) throw new Error('Failed to fetch rosters');
    //   const data = await response.json();
    //   setRosters(data);
    // } catch (error) {
    //   console.error('Error fetching rosters:', error);
    //   setError(error.message);
    // }
  };

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
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})} // Use parseInt safely
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="2020" // Example constraint
                  max="2030" // Example constraint
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: parseInt(e.target.value) || 1})} // Use parseInt safely
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
                  Total Lines (Employees)
                </label>
                <input
                  type="number"
                  value={formData.totalLines}
                  onChange={(e) => setFormData({...formData, totalLines: parseInt(e.target.value) || 2500})} // Use parseInt safely
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="100" // Example constraint
                  max="10000" // Example constraint
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
              <p className="text-red-800 font-medium">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && !error && ( // Only show success if no error occurred
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">Success!</p>
              <p className="text-green-700">
                Roster generation triggered. ID: {result.rosterPeriodId || 'N/A'}
              </p>
              {result.linesGenerated !== undefined && (
                <p className="text-green-700 text-sm mt-1">
                  Lines generated: {result.linesGenerated}
                </p>
              )}
              {result.message && (
                 <p className="text-green-700 text-sm mt-1">
                  Message: {result.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Roster List */}
        {/* Ensure the RosterTable component is designed to handle the rosters prop and the onLoad function */}
        <RosterTable rosters={rosters} onLoad={fetchRosters} />
      </div>
    </div>
  )
}

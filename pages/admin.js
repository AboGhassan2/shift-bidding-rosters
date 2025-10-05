// pages/admin.js
import { useState, useEffect } from 'react';

export default function Admin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [rosters, setRosters] = useState([]);
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: 'October', // API expects month name as string
    totalLines: 2500
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestBody = {
        year: parseInt(formData.year),
        month: formData.month, // Send as string (month name)
        totalLines: parseInt(formData.totalLines)
      };

      console.log("Sending request:", requestBody);

      const response = await fetch('/api/roster/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate roster');
      }

      setResult(data);
      setError(null);
      
      // Refresh roster list after successful generation
      fetchRosters();

    } catch (fetchError) {
      console.error('Error:', fetchError);
      setError(fetchError.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRosters = async () => {
    try {
      const response = await fetch('/api/roster/list');
      if (response.ok) {
        const data = await response.json();
        setRosters(data.rosters || []);
      }
    } catch (error) {
      console.error('Error fetching rosters:', error);
    }
  };

  // Fetch rosters on component mount
  useEffect(() => {
    fetchRosters();
  }, []);

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
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="2020"
                  max="2030"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {monthNames.map(monthName => (
                    <option key={monthName} value={monthName}>
                      {monthName}
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
                  onChange={(e) => setFormData({...formData, totalLines: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="1"
                  max="10000"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? 'Generating...' : 'Generate Roster'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-medium">Error:</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {result && !error && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">Success!</p>
              <p className="text-green-700 text-sm mt-1">
                {result.message || 'Roster generated successfully'}
              </p>
              {result.rosterPeriod && (
                <div className="mt-2 text-sm text-green-700">
                  <p>Year: {result.rosterPeriod.year}</p>
                  <p>Month: {result.rosterPeriod.month}</p>
                  <p>Total Lines: {result.rosterPeriod.totalLines}</p>
                  <p>Status: {result.rosterPeriod.status}</p>
                </div>
              )}
              {result.summary && (
                <div className="mt-2 text-sm text-green-700">
                  <p>Total Employees: {result.summary.totalEmployees}</p>
                  <p>Total Days: {result.summary.totalDays}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Roster List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Generated Rosters</h2>
            <button
              onClick={fetchRosters}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              Refresh
            </button>
          </div>
          
          {rosters.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No rosters generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Lines
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rosters.map((roster) => (
                    <tr key={roster.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {roster.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {roster.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {roster.totalLines}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          roster.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {roster.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(roster.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

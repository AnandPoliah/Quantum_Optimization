import React from "react";
import toast from 'react-hot-toast';

const SettingsPage = ({ costSettings, setCostSettings }) => {
  
  const handleInputChange = (field, value) => {
    setCostSettings({
      ...costSettings,
      [field]: parseFloat(value) || 0
    });
  };

  const resetToDefaults = () => {
    setCostSettings({
      fuelCostPerKm: 8.5,
      driverWagePerHour: 150,
      vehicleSpeed: 40
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">💰</span>
            <h1 className="text-3xl font-bold text-gray-800">Cost Calculator Settings</h1>
          </div>

          <p className="text-gray-600 mb-8">
            Configure the parameters used to calculate the operational costs of your routes. 
            These settings will be applied to all route optimizations and comparisons.
          </p>

          <div className="space-y-6">
            {/* Fuel Cost */}
            <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⛽</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Fuel Cost</h2>
                  <p className="text-sm text-gray-600">Cost per kilometer driven</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={costSettings.fuelCostPerKm}
                    onChange={(e) => handleInputChange('fuelCostPerKm', e.target.value)}
                    className="w-full border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-lg px-4 py-3 text-lg font-semibold outline-none transition-all"
                  />
                </div>
                <div className="text-2xl font-bold text-orange-700">₹/km</div>
              </div>
              <div className="mt-3 text-xs text-gray-600 bg-white bg-opacity-50 p-3 rounded">
                💡 <strong>Tip:</strong> Average diesel cost in India is around ₹8-10/km for commercial vehicles
              </div>
            </div>

            {/* Driver Wage */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">👨‍✈️</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Driver Wage</h2>
                  <p className="text-sm text-gray-600">Hourly wage for the driver</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={costSettings.driverWagePerHour}
                    onChange={(e) => handleInputChange('driverWagePerHour', e.target.value)}
                    className="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-semibold outline-none transition-all"
                  />
                </div>
                <div className="text-2xl font-bold text-blue-700">₹/hour</div>
              </div>
              <div className="mt-3 text-xs text-gray-600 bg-white bg-opacity-50 p-3 rounded">
                💡 <strong>Tip:</strong> Average driver wage ranges from ₹100-200 per hour depending on location
              </div>
            </div>

            {/* Vehicle Speed */}
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🚗</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Average Vehicle Speed</h2>
                  <p className="text-sm text-gray-600">Average speed for travel time calculation</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    step="5"
                    min="1"
                    value={costSettings.vehicleSpeed}
                    onChange={(e) => handleInputChange('vehicleSpeed', e.target.value)}
                    className="w-full border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-lg px-4 py-3 text-lg font-semibold outline-none transition-all"
                  />
                </div>
                <div className="text-2xl font-bold text-green-700">km/h</div>
              </div>
              <div className="mt-3 text-xs text-gray-600 bg-white bg-opacity-50 p-3 rounded">
                💡 <strong>Tip:</strong> City driving: 30-40 km/h, Highway: 60-80 km/h, Mixed: 40-50 km/h
              </div>
            </div>
          </div>

          {/* Cost Preview */}
          <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💵 Cost Preview (for 100 km route)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Fuel Cost</div>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{(costSettings.fuelCostPerKm * 100).toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Driver Cost</div>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{((100 / costSettings.vehicleSpeed) * costSettings.driverWagePerHour).toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Cost</div>
                <div className="text-2xl font-bold text-purple-600">
                  ₹{(
                    costSettings.fuelCostPerKm * 100 + 
                    ((100 / costSettings.vehicleSpeed) * costSettings.driverWagePerHour)
                  ).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              ⏱️ Estimated travel time: {(100 / costSettings.vehicleSpeed * 60).toFixed(0)} minutes
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={resetToDefaults}
              className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              🔄 Reset to Defaults
            </button>
            <button
              onClick={() => toast.success('Settings saved! These will be used for all cost calculations.')}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              ✓ Save Settings
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-300">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">How Cost Calculation Works</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>Fuel Cost:</strong> Distance × Fuel Cost per km</li>
                  <li>• <strong>Driver Cost:</strong> (Distance ÷ Speed) × Driver Wage per hour</li>
                  <li>• <strong>Total Cost:</strong> Fuel Cost + Driver Cost</li>
                  <li>• These costs are estimates and may vary based on actual conditions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

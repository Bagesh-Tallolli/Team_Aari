import React, { useState } from 'react';
import Card from '../../../components/common/Card.jsx';
import apiService from '../../../services/apiService.js';

function RfidServePanel() {
  const [rfid, setRfid] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState(null);
  const [serveMessage, setServeMessage] = useState('');

  const handleScan = async () => {
    if (!rfid) {
      setError('Please enter RFID card ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setServeMessage('');

      const result = await apiService.scanStudent(rfid);
      if (!result.success) {
        throw new Error(result.error || 'RFID scan failed');
      }

      setScanResult(result.data);
    } catch (err) {
      setScanResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServe = async () => {
    if (!scanResult?.student_id) {
      setError('No diet items found to serve');
      return;
    }

    try {
      setServing(true);
      setError(null);
      setServeMessage('');

      for (const item of (scanResult.items || [])) {
        const logResult = await apiService.logFood({
          student_id: parseInt(scanResult.student_id, 10),
          food_item: item.food_item,
          served_grams: parseFloat(item.required_grams),
        });

        if (!logResult.success) {
          throw new Error(logResult.error || `Failed to log ${item.food_item}`);
        }
      }

      setServeMessage('Meal served successfully. AI prediction, health update, and diet update triggered.');
    } catch (err) {
      setError(err.message);
    } finally {
      setServing(false);
    }
  };

  return (
    <Card variant="default">
      <h3 className="text-lg font-bold text-white mb-4">RFID Serving Flow</h3>
      <p className="text-sm text-slate-400 mb-4">
        Scan student RFID by entering ID, then serve recommended meal to trigger AI loop.
      </p>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          value={rfid}
          onChange={(e) => setRfid(e.target.value)}
          placeholder="Enter RFID card ID"
          className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleScan}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Scan RFID'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-900/20 border border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      {scanResult?.items?.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <p className="text-slate-300 text-sm mb-2">Meal Type: {scanResult.meal_type}</p>
            <ul className="space-y-1 text-sm">
              {scanResult.items.map((item, idx) => (
                <li key={`${item.food_item}-${idx}`} className="text-slate-200">
                  {item.food_item}: {parseFloat(item.required_grams)}g
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleServe}
            disabled={serving}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
          >
            {serving ? 'Serving...' : 'Serve Meal'}
          </button>

          {serveMessage && (
            <div className="px-3 py-2 rounded-lg bg-green-900/20 border border-green-700 text-green-200 text-sm">
              {serveMessage}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default RfidServePanel;

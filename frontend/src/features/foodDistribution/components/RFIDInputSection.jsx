import React from 'react';
import { Scan, Send } from 'lucide-react';

function RFIDInputSection({ rfidInput, setRfidInput, onScan, loading }) {
  return (
    <div className="glass rounded-xl p-6 border border-indigo-500/20">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Scan size={20} className="text-indigo-400" />
        RFID Input
      </h2>

      <form onSubmit={onScan} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            RFID Card ID
          </label>
          <input
            type="text"
            value={rfidInput}
            onChange={(e) => setRfidInput(e.target.value)}
            placeholder="Scan or enter RFID..."
            className="w-full px-4 py-3 bg-slate-800/50 border border-indigo-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            disabled={loading}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading || !rfidInput.trim()}
          className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <Send size={18} className="group-hover:translate-x-1 transition-transform" />
          {loading ? 'Scanning...' : 'Scan & Serve'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 Tip: Position your RFID card near the reader or enter the card ID manually
        </p>
      </div>
    </div>
  );
}

export default RFIDInputSection;

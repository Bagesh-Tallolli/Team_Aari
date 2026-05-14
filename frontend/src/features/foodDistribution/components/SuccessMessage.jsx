import React from 'react';
import { CheckCircle } from 'lucide-react';

function SuccessMessage({ studentName, grams }) {
  return (
    <div className="relative">
      <div className="animate-pulse absolute inset-0 bg-green-500/20 rounded-xl blur-lg"></div>
      <div className="relative glass rounded-xl p-8 border border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <CheckCircle className="text-green-400 animate-bounce" size={64} />
          </div>
          <h3 className="text-2xl font-bold text-green-400">Food Served Successfully!</h3>
          <div className="space-y-1">
            <p className="text-slate-300">
              <span className="font-semibold text-white">{studentName}</span> has been served
            </p>
            <p className="text-2xl font-bold text-green-300">
              {grams}g of rice
            </p>
          </div>
          <p className="text-sm text-slate-400 pt-2">
            ✓ Food logged | ✓ AI analysis complete | ✓ Diet plan updated
          </p>
        </div>
      </div>
    </div>
  );
}

export default SuccessMessage;

import React from 'react';
import { User, Cake, Gauge } from 'lucide-react';

function StudentInfoCard({ student }) {
  return (
    <div className="glass rounded-xl p-6 border border-indigo-500/20">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <User size={20} className="text-indigo-400" />
        Student Info
      </h3>

      <div className="space-y-4">
        {/* Name */}
        <div className="pb-4 border-b border-slate-700/50">
          <p className="text-slate-400 text-sm mb-1">Student Name</p>
          <p className="text-xl font-bold text-white">{student.name}</p>
        </div>

        {/* Age & BMI Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Age */}
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Cake size={16} />
              Age
            </div>
            <p className="text-2xl font-bold text-white">{student.age}</p>
            <p className="text-xs text-slate-500">years</p>
          </div>

          {/* BMI */}
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Gauge size={16} />
              BMI
            </div>
            <p className="text-2xl font-bold text-white">{student.bmi?.toFixed(2)}</p>
            <p className="text-xs text-slate-500">kg/m²</p>
          </div>
        </div>

        {/* Rice Quantity */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-2">Rice Quantity to Serve</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-green-400">{student.grams}</p>
            <p className="text-lg text-green-400">grams</p>
          </div>
          <p className="text-xs text-green-300 mt-2">
            ✓ Auto-calculated based on age and nutritional requirements
          </p>
        </div>

        {/* Calories */}
        <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-2">Estimated Calories</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-orange-400">{student.calories}</p>
            <p className="text-sm text-orange-400">kcal</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentInfoCard;

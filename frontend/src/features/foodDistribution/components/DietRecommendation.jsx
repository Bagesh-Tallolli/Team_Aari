import React, { useState } from 'react';
import { Utensils, Leaf, Drumstick, AlertCircle } from 'lucide-react';

function DietRecommendation({ dietPlan }) {
  const [activeTab, setActiveTab] = useState('vegetarian');

  if (!dietPlan) {
    return null;
  }

  const getDeficitColor = (category) => {
    switch(category?.toUpperCase()) {
      case 'HIGH_DEFICIT':
        return 'bg-red-500/10 border-red-500/50 text-red-400';
      case 'MODERATE_DEFICIT':
        return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
      case 'LOW_DEFICIT':
        return 'bg-orange-500/10 border-orange-500/50 text-orange-400';
      default:
        return 'bg-slate-500/10 border-slate-500/50 text-slate-400';
    }
  };

  const renderMealSection = (meal) => {
    if (!meal) return null;

    return (
      <div className="space-y-3">
        {meal.suggested && (
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Suggested</p>
            <p className="text-white font-semibold text-lg">{meal.suggested.name}</p>
            {meal.suggested.quantity && (
              <p className="text-slate-400 text-sm mt-1">Quantity: {meal.suggested.quantity}</p>
            )}
            {meal.suggested.calories && (
              <p className="text-indigo-300 text-sm mt-1">🔥 {meal.suggested.calories} kcal</p>
            )}
          </div>
        )}

        {meal.options && meal.options.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Other Options</p>
            <div className="space-y-2">
              {meal.options.map((option, idx) => (
                <div key={idx} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-300 font-medium">{option.name}</p>
                  {option.quantity && (
                    <p className="text-slate-500 text-xs mt-1">Qty: {option.quantity}</p>
                  )}
                  {option.calories && (
                    <p className="text-slate-400 text-xs mt-1">{option.calories} kcal</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass rounded-xl border border-indigo-500/20">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Utensils size={20} className="text-indigo-400" />
          AI Diet Recommendations
        </h3>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('vegetarian')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'vegetarian'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Leaf size={18} />
            Vegetarian
          </button>
          <button
            onClick={() => setActiveTab('nonVegetarian')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'nonVegetarian'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Drumstick size={18} />
            Non-Veg
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {activeTab === 'vegetarian' ? (
          <>
            {/* Breakfast */}
            {dietPlan.breakfast && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">
                  🌅 Breakfast
                </h4>
                {renderMealSection(dietPlan.breakfast.veg || dietPlan.breakfast)}
              </div>
            )}

            {/* Lunch - Veg */}
            {dietPlan.lunch && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">
                  🍽️ Lunch
                </h4>
                {renderMealSection(dietPlan.lunch.veg || dietPlan.lunch)}
              </div>
            )}

            {/* Dinner */}
            {dietPlan.dinner && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">
                  🌙 Dinner
                </h4>
                {renderMealSection(dietPlan.dinner.veg || dietPlan.dinner)}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Breakfast */}
            {dietPlan.breakfast && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">
                  🌅 Breakfast
                </h4>
                {renderMealSection(dietPlan.breakfast.nonVeg || dietPlan.breakfast)}
              </div>
            )}

            {/* Lunch - Non-Veg */}
            {dietPlan.lunch && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">
                  🍽️ Lunch
                </h4>
                {renderMealSection(dietPlan.lunch.nonVeg || dietPlan.lunch)}
              </div>
            )}

            {/* Dinner */}
            {dietPlan.dinner && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">
                  🌙 Dinner
                </h4>
                {renderMealSection(dietPlan.dinner.nonVeg || dietPlan.dinner)}
              </div>
            )}
          </>
        )}

        {/* Snacks */}
        {dietPlan.snacks && dietPlan.snacks.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">
              🥗 Snacks
            </h4>
            <div className="space-y-2">
              {dietPlan.snacks.map((snack, idx) => (
                <div key={idx} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-300 font-medium">{snack}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deficit Info */}
        {(dietPlan.deficit_kcal || dietPlan.deficit_category) && (
          <div className={`rounded-lg p-4 border ${getDeficitColor(dietPlan.deficit_category)}`}>
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Daily Calorie Deficit</p>
                <p className="text-sm">
                  {dietPlan.deficit_kcal} kcal needed daily to reach optimal nutrition
                </p>
                <p className="text-xs mt-2 opacity-80">
                  Status: <span className="font-semibold">{dietPlan.deficit_category?.replace(/_/g, ' ')}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {dietPlan.notes && dietPlan.notes.length > 0 && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-indigo-400 font-semibold mb-2">📋 Special Notes</p>
            <ul className="space-y-1">
              {dietPlan.notes.map((note, idx) => (
                <li key={idx} className="text-slate-300 text-sm flex gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default DietRecommendation;

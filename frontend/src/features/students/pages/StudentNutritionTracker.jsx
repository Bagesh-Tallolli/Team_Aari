import React, { useState, useCallback } from 'react';
import { Search, User, TrendingDown, Utensils, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import MainLayout from '../../../components/layout/MainLayout.jsx';

const API_BASE_URL = 'http://localhost:5001';

function StudentNutritionTracker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState(null);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast.error('Please enter student name or RFID ID');
      return;
    }

    setLoading(true);
    setError(null);
    setStudentData(null);
    setSearchAttempted(true);

    try {
      // First, search for the student by name or RFID
      const studentsResponse = await axios.get(`${API_BASE_URL}/api/students?search=${searchQuery}`, {
        timeout: 10000,
      });

      if (!studentsResponse.data.success || !studentsResponse.data.data.students.length) {
        setError(`No student found matching "${searchQuery}"`);
        toast.error('Student not found');
        return;
      }

      const student = studentsResponse.data.data.students[0];
      
      // Then fetch comprehensive profile data
      const profileResponse = await axios.get(
        `${API_BASE_URL}/api/students/${student.id}/details`,
        {
          timeout: 10000,
        }
      );

      if (profileResponse.data.success) {
        setStudentData(profileResponse.data.data);
        toast.success(`Loaded profile for ${student.name}`);
      } else {
        setError('Failed to load student profile');
        toast.error('Failed to load student profile');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to search student';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400', badge: 'bg-green-500/20' };
      case 'at risk':
      case 'at_risk':
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400', badge: 'bg-yellow-500/20' };
      case 'underweight':
        return { bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400', badge: 'bg-red-500/20' };
      default:
        return { bg: 'bg-slate-500/10', border: 'border-slate-500/50', text: 'text-slate-400', badge: 'bg-slate-500/20' };
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Student Nutrition Tracker</h1>
        <p className="text-slate-400 mt-2">Search and view complete nutrition profile with AI analysis</p>
      </div>

      {/* Search Section */}
      <div className="glass rounded-xl p-6 border border-indigo-500/20">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-500" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name or RFID card ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-indigo-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* No Search Attempt */}
      {!searchAttempted && !studentData && (
        <div className="glass rounded-xl p-12 text-center border border-slate-700/50">
          <Search className="text-slate-500 mx-auto mb-4" size={48} />
          <p className="text-slate-400 text-lg">Enter a student name or RFID card ID to view their nutrition profile</p>
        </div>
      )}

      {/* Error State */}
      {error && !studentData && (
        <div className="glass rounded-xl p-6 border border-red-500/50 bg-red-500/10">
          <div className="flex gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={20} />
            <div>
              <p className="text-red-400 font-semibold">Not Found</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glass rounded-xl p-12 text-center border border-indigo-500/20">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-600 border-t-indigo-400 rounded-full mb-4"></div>
          <p className="text-slate-300">Loading student profile...</p>
        </div>
      )}

      {/* Student Profile Display */}
      {studentData && (
        <div className="space-y-6 animate-fadeIn">
          {/* SECTION A: Basic Info */}
          <div className="glass rounded-xl p-6 border border-indigo-500/20">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <User size={24} className="text-indigo-400" />
              Basic Information
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Name</p>
                <p className="text-white font-bold text-lg">{studentData.student?.name || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Age</p>
                <p className="text-white font-bold text-lg">{studentData.student?.age || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Gender</p>
                <p className="text-white font-bold text-lg">{studentData.student?.gender || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Height</p>
                <p className="text-white font-bold text-lg">{studentData.student?.height || 'N/A'} cm</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Weight</p>
                <p className="text-white font-bold text-lg">{studentData.student?.weight || 'N/A'} kg</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">BMI</p>
                <p className="text-white font-bold text-lg">{studentData.student?.current_bmi?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 md:col-span-1">
                <p className="text-slate-400 text-sm mb-1">RFID ID</p>
                <p className="text-white font-bold text-sm">{studentData.student?.rfid_card_id || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Risk Level</p>
                <div className={`font-bold text-lg ${getStatusColor(studentData.student?.risk_level).text}`}>
                  {studentData.student?.risk_level?.toUpperCase() || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: Nutrition Analytics */}
          {studentData.nutrition_analytics && (
            <div className="glass rounded-xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-yellow-500/5">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingDown size={24} className="text-orange-400" />
                Nutrition Analytics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Average Weekly Calories</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-orange-400">
                      {studentData.nutrition_analytics.avg_weekly_calories?.toFixed(0) || 0}
                    </p>
                    <p className="text-orange-400">kcal</p>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">7-day rolling average</p>
                </div>

                <div>
                  <p className="text-slate-400 text-sm mb-2">Required Daily Calories</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-green-400">
                      {studentData.nutrition_analytics.required_calories?.toFixed(0) || 1800}
                    </p>
                    <p className="text-green-400">kcal</p>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">ICMR standard for age</p>
                </div>

                <div className="md:col-span-2 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">Calorie Deficit</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-red-400">
                      {studentData.nutrition_analytics.calorie_deficit?.toFixed(0) || 0}
                    </p>
                    <p className="text-red-400">kcal/day</p>
                  </div>
                  <p className="text-red-300 text-sm mt-2">
                    {studentData.nutrition_analytics.calorie_deficit > 500
                      ? '⚠️ High deficit - Priority nutrition intervention needed'
                      : '✓ Deficit within acceptable range'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-slate-400 text-sm mb-2">Total Servings Logged</p>
                  <p className="text-2xl font-bold text-indigo-400">
                    {studentData.nutrition_analytics.total_servings} servings
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION C: AI Analysis */}
          {studentData.ai_analysis && (
            <div className={`glass rounded-xl p-6 border ${getStatusColor(studentData.ai_analysis?.status).border}`}>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <AlertCircle size={24} className={getStatusColor(studentData.ai_analysis?.status).text} />
                AI Health Analysis
              </h2>

              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-full font-bold uppercase tracking-wide ${getStatusColor(studentData.ai_analysis?.status).badge} ${getStatusColor(studentData.ai_analysis?.status).text}`}>
                    {studentData.ai_analysis?.status || 'Unknown'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Confidence:</span>
                    <span className={`font-bold text-lg ${getStatusColor(studentData.ai_analysis?.status).text}`}>
                      {((studentData.ai_analysis?.confidence || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        studentData.ai_analysis?.status?.toLowerCase() === 'healthy'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : studentData.ai_analysis?.status?.toLowerCase().includes('risk')
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${(studentData.ai_analysis?.confidence || 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Reason */}
                {studentData.ai_analysis?.reason && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 font-semibold">Analysis & Reasoning</p>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {studentData.ai_analysis.reason}
                    </p>
                  </div>
                )}

                {/* Required vs Actual */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Required Calories</p>
                    <p className="text-2xl font-bold text-green-400">
                      {studentData.ai_analysis?.required_calories?.toFixed(0) || 1800}
                    </p>
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Avg Weekly Intake</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {studentData.ai_analysis?.avg_weekly_calories?.toFixed(0) || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION D: Diet Recommendation */}
          {studentData.ai_analysis?.diet_plan && (
            <div className="glass rounded-xl p-6 border border-indigo-500/20">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Utensils size={24} className="text-indigo-400" />
                Personalized Diet Recommendations
              </h2>

              <div className="space-y-4">
                {studentData.ai_analysis.diet_plan.breakfast && (
                  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-blue-400 mb-3">🌅 Breakfast</h3>
                    {studentData.ai_analysis.diet_plan.breakfast.suggested && (
                      <div className="mb-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">Suggested</p>
                        <p className="text-white font-bold">{studentData.ai_analysis.diet_plan.breakfast.suggested.name}</p>
                        {studentData.ai_analysis.diet_plan.breakfast.suggested.calories && (
                          <p className="text-cyan-300 text-sm mt-1">
                            🔥 {studentData.ai_analysis.diet_plan.breakfast.suggested.calories} kcal
                          </p>
                        )}
                      </div>
                    )}
                    {studentData.ai_analysis.diet_plan.breakfast.options?.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Other Options</p>
                        <div className="space-y-2">
                          {studentData.ai_analysis.diet_plan.breakfast.options.map((opt, idx) => (
                            <div key={idx} className="bg-slate-800/50 rounded p-2">
                              <p className="text-slate-300 text-sm">{opt.name}</p>
                              {opt.calories && <p className="text-cyan-300 text-xs mt-1">{opt.calories} kcal</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {studentData.ai_analysis.diet_plan.dinner && (
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-amber-400 mb-3">🍽️ Dinner</h3>
                    {studentData.ai_analysis.diet_plan.dinner.suggested && (
                      <div className="mb-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">Suggested</p>
                        <p className="text-white font-bold">{studentData.ai_analysis.diet_plan.dinner.suggested.name}</p>
                        {studentData.ai_analysis.diet_plan.dinner.suggested.calories && (
                          <p className="text-orange-300 text-sm mt-1">
                            🔥 {studentData.ai_analysis.diet_plan.dinner.suggested.calories} kcal
                          </p>
                        )}
                      </div>
                    )}
                    {studentData.ai_analysis.diet_plan.dinner.options?.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Other Options</p>
                        <div className="space-y-2">
                          {studentData.ai_analysis.diet_plan.dinner.options.map((opt, idx) => (
                            <div key={idx} className="bg-slate-800/50 rounded p-2">
                              <p className="text-slate-300 text-sm">{opt.name}</p>
                              {opt.calories && <p className="text-orange-300 text-xs mt-1">{opt.calories} kcal</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {studentData.ai_analysis.diet_plan.snacks?.length > 0 && (
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-green-400 mb-3">🥗 Recommended Snacks</h3>
                    <div className="space-y-2">
                      {studentData.ai_analysis.diet_plan.snacks.map((snack, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded p-2">
                          <p className="text-slate-300 text-sm">{snack}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {studentData.ai_analysis.diet_plan.notes?.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wide text-blue-400 font-semibold mb-2">📋 Special Notes</p>
                    <ul className="space-y-2">
                      {studentData.ai_analysis.diet_plan.notes.map((note, idx) => (
                        <li key={idx} className="text-slate-300 text-sm flex gap-2">
                          <span className="text-blue-400 font-bold">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION E: Food Serving History */}
          {studentData.food_history && studentData.food_history.length > 0 && (
            <div className="glass rounded-xl p-6 border border-slate-500/20">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar size={24} className="text-slate-400" />
                Food Serving History (Last {studentData.food_history.length} servings)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold">Date & Time</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold">Food Item</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold">Grams</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold">Calories</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold">Protein</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.food_history.map((log, idx) => (
                      <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(log.logged_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{log.food_item}</td>
                        <td className="py-3 px-4 text-slate-300">{log.served_grams}g</td>
                        <td className="py-3 px-4 text-orange-400 font-semibold">{log.estimated_calories} kcal</td>
                        <td className="py-3 px-4 text-slate-300">{log.protein?.toFixed(1) || 'N/A'}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No History */}
          {(!studentData.food_history || studentData.food_history.length === 0) && (
            <div className="glass rounded-xl p-6 text-center border border-slate-700/50">
              <Calendar className="text-slate-500 mx-auto mb-3" size={32} />
              <p className="text-slate-400">No food serving history available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return <MainLayout>{content}</MainLayout>;
}

export default StudentNutritionTracker;

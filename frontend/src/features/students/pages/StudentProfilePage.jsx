import React, { useState, useEffect } from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { useParams } from 'react-router-dom';
import { SkeletonCard, SkeletonTable } from '../../../components/common/Skeleton.jsx';
import { calculateBMI, getBMIStatus} from '../../../utils/formatters.js';
import apiService from '../../../services/apiService.js';

function StudentProfilePage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setError(null);
        // Fetch comprehensive student details from backend
        const detailsResult = await apiService.students.getDetails(id);

        if (!detailsResult.success) {
          throw new Error(detailsResult.error || 'Failed to fetch student details');
        }

        const payload = detailsResult.data || {};
        const studentData = payload.student || {};

        // Nutrition analytics
        const analytics = payload.nutrition_analytics || {};

        // AI analysis
        const ai = payload.ai_analysis || {};

        // Food history
        const foodHistory = (payload.food_history || []).map((log) => ({
          id: log.id,
          foodName: log.food_item,
          servedGrams: parseFloat(log.served_grams || 0),
          protein: parseFloat(log.protein || 0),
          calories: parseFloat(log.estimated_calories || 0),
          timestamp: log.logged_at || log.created_at,
        }));

        const computedBmi = studentData.current_bmi || calculateBMI(studentData.weight, studentData.height);

        setStudent({
          ...studentData,
          bmi: parseFloat(studentData.current_bmi || computedBmi || 0).toFixed(1),
          nutritionAnalytics: {
            avgWeeklyCalories: analytics.avg_weekly_calories || 0,
            requiredCalories: analytics.required_calories || 1800,
            calorieRatio: analytics.required_calories ? (analytics.avg_weekly_calories / analytics.required_calories).toFixed(2) : 0,
          },
          aiAnalysis: {
            status: ai?.status || ai?.ai_prediction || 'Unknown',
            reason: ai?.reason || ai?.analysis || null,
            confidence: ai?.confidence || null,
            dietPlan: ai?.diet_plan || ai?.diet_plan || null,
          },
          foodLogs: foodHistory,
        });
      } catch (error) {
        console.error('Failed to fetch student:', error);
        setError(error.message);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonTable />
        </div>
      </MainLayout>
    );
  }

  if (!student) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-slate-400">{error || 'Student not found'}</p>
        </div>
      </MainLayout>
    );
  }

  const bmiStatus = getBMIStatus(student.bmi);
  const riskColorMap = {
    healthy: { bg: 'bg-green-500/10', text: 'text-green-400', badge: 'success' },
    at_risk: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', badge: 'warning' },
    underweight: { bg: 'bg-red-500/10', text: 'text-red-400', badge: 'danger' },
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', badge: 'danger' },
  };

  const colors = riskColorMap[student.riskLevel] || riskColorMap.healthy;

  const foodColumns = [
    {
      key: 'timestamp',
      label: 'Date',
      render: (value) => new Date(value).toLocaleDateString()
    },
    { key: 'foodName', label: 'Food Item' },
    {
      key: 'servedGrams',
      label: 'Served (g)',
      render: (value) => `${value}g`,
    },
    { key: 'calories', label: 'Calories' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-white">{student.name}</h1>
          <p className="text-slate-400 mt-1">Student nutrition profile and history</p>
        </div>

        {/* Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="default">
            <h3 className="text-lg font-bold text-white mb-4">Basic Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Name</span>
                <span className="text-white font-semibold">{student.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RFID</span>
                <span className="text-white font-semibold">{student.rfid_card_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Age</span>
                <span className="text-white font-semibold">{student.age} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gender</span>
                <span className="text-white font-semibold">{student.gender || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Height</span>
                <span className="text-white font-semibold">{student.height} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Weight</span>
                <span className="text-white font-semibold">{student.weight} kg</span>
              </div>
            </div>
          </Card>

          {/* BMI Card */}
          <Card variant="elevated" className={colors.bg}>
            <h3 className="text-lg font-bold text-white mb-4">BMI Status</h3>
            <div className="text-center">
              <div className={`text-5xl font-bold ${colors.text} mb-2`}>
                {student.bmi}
              </div>
              <Badge variant={colors.badge} size="lg">
                {bmiStatus.label}
              </Badge>
              <p className="text-slate-400 text-sm mt-4">
                {bmiStatus.min} - {bmiStatus.max} {bmiStatus.label}
              </p>
            </div>
          </Card>

          {/* Nutrition Analytics */}
          <Card variant="default">
            <h3 className="text-lg font-bold text-white mb-4">Nutrition Analytics (7 days)</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Weekly Calories</span>
                <span className="text-white font-semibold">{student.nutritionAnalytics?.avgWeeklyCalories || 0} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Required Calories</span>
                <span className="text-white font-semibold">{student.nutritionAnalytics?.requiredCalories || 0} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Calorie Ratio</span>
                <span className="text-white font-semibold">{student.nutritionAnalytics?.calorieRatio || 0}</span>
              </div>
            </div>
          </Card>

          {/* AI Analysis */}
          <Card variant="default">
            <h3 className="text-lg font-bold text-white mb-4">Health Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Health Status</span>
                <span className="text-white font-semibold">{student.aiAnalysis?.status || student.health_status || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Notes / Reason</span>
                <span className="text-white font-semibold">{student.aiAnalysis?.reason || student.aiAnalysis?.analysis || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model Confidence</span>
                <span className="text-white font-semibold">{student.aiAnalysis?.confidence ? `${(parseFloat(student.aiAnalysis.confidence) * 100).toFixed(0)}%` : '—'}</span>
              </div>
            </div>
          </Card>

          {/* Diet Recommendation */}
          <Card variant="default" className="lg:col-span-3">
            <h3 className="text-lg font-bold text-white mb-4">Diet Recommendation</h3>
            <div className="space-y-4 text-sm text-slate-300">
              {student.aiAnalysis?.diet_plan || student.aiAnalysis?.dietPlan ? (
                <>
                  {/* Common top-level notes */}
                  {((student.aiAnalysis.diet_plan && student.aiAnalysis.diet_plan.notes) || (student.aiAnalysis.dietPlan && student.aiAnalysis.dietPlan.notes)) && (
                    <div className="text-slate-400 text-sm italic">
                      {(student.aiAnalysis.diet_plan && student.aiAnalysis.diet_plan.notes) || (student.aiAnalysis.dietPlan && student.aiAnalysis.dietPlan.notes)}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
                      // support either snake_case or camelCase diet_plan shapes
                      const diet = student.aiAnalysis.diet_plan || student.aiAnalysis.dietPlan;
                      if (!diet) return null;
                      const meal = diet[mealType] || diet[mealType.toLowerCase()] || diet[mealType.toUpperCase()];
                      if (!meal) return null;

                      // meal may be { suggested: { name, calories, quantity } } or may be { veg: {...}, nonVeg: {...} }
                      const mealIcons = {
                        breakfast: '🍳',
                        lunch: '🍱',
                        dinner: '🍽️',
                        snack: '🍪',
                      };

                      const optionLabel = (key) => {
                        if (!key) return 'Option';
                        if (key === 'veg') return 'Vegetarian';
                        if (key === 'nonVeg' || key === 'non_veg') return 'Non-Vegetarian';
                        if (key === 'suggested') return 'Recommended';
                        return key.charAt(0).toUpperCase() + key.slice(1);
                      };

                      return (
                        <div key={mealType} className="bg-slate-800/40 p-4 rounded-xl">
                          <h4 className="text-md font-semibold text-white capitalize mb-3">{mealIcons[mealType]} {mealType}</h4>
                          <div className="space-y-3">
                            {meal.suggested ? (
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-white font-semibold">{meal.suggested.name || meal.suggested.food || meal.suggested.item}</div>
                                  {meal.suggested.quantity && <div className="text-slate-400 text-xs mt-1">Quantity: {meal.suggested.quantity}</div>}
                                  {meal.suggested.benefits && <div className="text-slate-500 text-xs mt-1 italic">Benefits: {meal.suggested.benefits}</div>}
                                  {/* Nutrient breakdown if available */}
                                  {(meal.suggested.protein || meal.suggested.carbs || meal.suggested.fats) && (
                                    <div className="flex gap-2 mt-2">
                                      {meal.suggested.protein && (
                                        <Badge variant="success" size="sm">💪 {meal.suggested.protein}g</Badge>
                                      )}
                                      {meal.suggested.carbs && (
                                        <Badge variant="warning" size="sm">🍞 {meal.suggested.carbs}g</Badge>
                                      )}
                                      {meal.suggested.fats && (
                                        <Badge variant="info" size="sm">🧈 {meal.suggested.fats}g</Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-xs ml-2 shrink-0">{meal.suggested.calories || meal.suggested.estimated_calories || '—'} kcal</div>
                              </div>
                            ) : (
                              Object.keys(meal).map((optionKey) => {
                                const option = meal[optionKey];
                                if (!option) return null;
                                const label = optionLabel(optionKey);
                                return (
                                  <div key={optionKey} className="border-l-2 border-indigo-500 pl-3">
                                    <span className="text-indigo-400 font-semibold text-xs uppercase">{label}</span>
                                    <div className="mt-1 flex justify-between items-start">
                                      <span className="text-white">{option.name || option.food_item || option.food || option.item}</span>
                                      <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-xs ml-2 shrink-0">{option.calories || option.estimated_calories || 0} kcal</span>
                                    </div>
                                    {option.quantity && <div className="text-slate-400 text-xs mt-1">Quantity: {option.quantity} {option.unit || ''}</div>}
                                    {(option.protein || option.carbs || option.fats) && (
                                      <div className="flex gap-2 mt-1">
                                        {option.protein && (
                                          <Badge variant="success" size="sm">💪 {option.protein}g</Badge>
                                        )}
                                        {option.carbs && (
                                          <Badge variant="warning" size="sm">🍞 {option.carbs}g</Badge>
                                        )}
                                        {option.fats && (
                                          <Badge variant="info" size="sm">🧈 {option.fats}g</Badge>
                                        )}
                                      </div>
                                    )}
                                    {(option.benefits || option.benefit) && <div className="text-slate-500 text-xs mt-1 italic">Benefits: {option.benefits || option.benefit}</div>}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Deficit / meta info */}
                  {((student.aiAnalysis.diet_plan && (student.aiAnalysis.diet_plan.deficit_kcal || student.aiAnalysis.diet_plan.deficit)) || (student.aiAnalysis.dietPlan && (student.aiAnalysis.dietPlan.deficit_kcal || student.aiAnalysis.dietPlan.deficit))) && (
                    <div className="text-slate-400 text-sm mt-3">Calorie deficit: {(student.aiAnalysis.diet_plan && (student.aiAnalysis.diet_plan.deficit_kcal || student.aiAnalysis.diet_plan.deficit)) || (student.aiAnalysis.dietPlan && (student.aiAnalysis.dietPlan.deficit_kcal || student.aiAnalysis.dietPlan.deficit))} kcal</div>
                  )}
                </>
              ) : (
                <p className="text-slate-400">No diet recommendation available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Food Logs Table */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Food Logs</h2>
          <Table
            columns={foodColumns}
            data={student.foodLogs || []}
            emptyMessage="No food logs yet"
          />
        </div>
      </div>
    </MainLayout>
  );
}

export default StudentProfilePage;

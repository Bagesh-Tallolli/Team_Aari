import React from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import { BrainCircuit, Activity, Utensils, Info, ShieldCheck } from 'lucide-react';

function HowItWorksPage() {
  return (
    <MainLayout>
      <div className="space-y-8 animate-fadeIn pb-12">
        <div>
          <h1 className="text-3xl font-bold text-white">How It Works</h1>
          <p className="text-slate-400 mt-2 text-lg">
            End-to-End System Architecture & Nutrition Framework
          </p>
        </div>

        {/* Section 1: End-to-End Model Working */}
        <div className="glass p-6 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="text-indigo-400" size={28} />
            <h2 className="text-2xl font-bold text-white">End-to-End AI Model Operation</h2>
          </div>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              The Santulita platform operates on a closed-loop system integrating hardware, backend processing, and advanced AI to ensure nutritional assurance:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li><strong>Hardware Scan & Authentication:</strong> A student scans their RFID card at the distribution module. The ESP8266 authenticates the student via the backend.</li>
              <li><strong>Data Aggregation:</strong> The backend retrieves the student's profile (age, height, weight, gender) and aggregates their weekly food intake logs to calculate the <em>average weekly calories</em>.</li>
              <li><strong>AI Inference:</strong> The data is passed to our Random Forest AI model. The model computes the required calories (based on ICMR standards) and compares it with the student's current intake and BMI.</li>
              <li><strong>Prediction & Recommendation:</strong> The AI predicts the malnutrition risk status (Healthy, At Risk, or Critical) and generates an actionable diet plan.</li>
              <li><strong>Hardware Dispensation:</strong> The backend calculates the precise portion of food (e.g., Rice) required to meet the student's target and signals the hardware to dispense it using a load cell mechanism.</li>
            </ol>
          </div>
        </div>

        {/* Section 2: Malnutrition Detection & Diet Recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl border border-blue-500/30 bg-blue-900/10">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-blue-400" size={28} />
              <h2 className="text-xl font-bold text-white">Malnutrition Detection Parameters</h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li><strong>Pediatric BMI-for-Age Screening:</strong> Evaluated using WHO Growth References (5-19 years) and age/sex-specific percentiles. Adult BMI thresholds (18.5 - 24.9) are strictly avoided. BMI is treated as an assistive screening indicator, not a clinical diagnosis.</li>
              <li><strong>PM POSHAN School-Meal Targets:</strong> Benchmarked against statutory norms (Primary: 450 kcal & 12g protein; Upper Primary: 700 kcal & 20g protein per school meal).</li>
              <li><strong>Separation of 24h vs School Meal:</strong> Single school lunch servings are compared against the PM POSHAN school-meal target, never against the full 24-hour ICMR daily requirement (~1500 - 2200 kcal).</li>
              <li><strong>Weekly Trends from Daily Totals:</strong> Food logs are grouped by calendar day to aggregate all items served, then averaged across recorded school days without treating unrecorded days as zero.</li>
              <li><strong>Food Served vs Consumed:</strong> Records accurately reflect measured quantities served at the dispenser, avoiding assumptions of 100% consumption.</li>
            </ul>
          </div>

          <div className="glass p-6 rounded-2xl border border-emerald-500/30 bg-emerald-900/10">
            <div className="flex items-center gap-3 mb-6">
              <Utensils className="text-emerald-400" size={28} />
              <h2 className="text-xl font-bold text-white">Basis for Diet Recommendation</h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li><strong>Nutritional Gap Closure:</strong> Recommendations specifically target macros (Protein, Carbs, Fats) that are deficient in the student's recent intake.</li>
              <li><strong>Localized Availability:</strong> Recommends locally available, affordable items (e.g., specific pulses, local greens) to ensure the diet is actionable.</li>
              <li><strong>Current Implementation Scope:</strong> <em>Note: Our automated hardware dispensation is currently implemented exclusively for tracking and serving <strong>Rice</strong>. Future phases will incorporate automated tracking for dals and vegetables.</em></li>
            </ul>
          </div>
        </div>

        {/* Section 3: Karnataka Government Mid-Day Meal Details */}
        <div className="glass p-6 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-orange-400" size={28} />
            <h2 className="text-2xl font-bold text-white">Karnataka Govt. Mid-Day Meal Scheme Details</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Food Grains & Prescribed Quantities (per Child / day)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-600 bg-slate-800/50">
                      <th className="p-3 font-medium">Food Item</th>
                      <th className="p-3 font-medium">Class 1-5 (Gms)</th>
                      <th className="p-3 font-medium">Class 6-8 (Gms)</th>
                      <th className="p-3 font-medium">Class 9-10 (Gms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-700/50"><td className="p-3">Rice</td><td className="p-3">100</td><td className="p-3">150</td><td className="p-3">150</td></tr>
                    <tr className="border-b border-slate-700/50"><td className="p-3">Dal</td><td className="p-3">20</td><td className="p-3">30</td><td className="p-3">30</td></tr>
                    <tr className="border-b border-slate-700/50"><td className="p-3">Vegetables</td><td className="p-3">50</td><td className="p-3">75</td><td className="p-3">75</td></tr>
                    <tr className="border-b border-slate-700/50"><td className="p-3">Oil</td><td className="p-3">05</td><td className="p-3">7.5</td><td className="p-3">7.5</td></tr>
                    <tr><td className="p-3">Salt</td><td className="p-3">02</td><td className="p-3">04</td><td className="p-3">04</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Prescribed Weekly Menu Chart</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-600 bg-slate-800/50">
                      <th className="p-3 font-medium">Day</th>
                      <th className="p-3 font-medium">Food List</th>
                      <th className="p-3 font-medium">Vegetables Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-700/50"><td className="p-3 text-white">Monday</td><td className="p-3">Rice Sambar</td><td className="p-3">Palak, drumstick leaves, Potato, Brinjal, Onion, Tomato</td></tr>
                    <tr className="border-b border-slate-700/50"><td className="p-3 text-white">Tuesday</td><td className="p-3">Rice Sambar</td><td className="p-3">White pumpkin, carrot, Beans, Cabbage, Beetroot, Tomato</td></tr>
                    <tr className="border-b border-slate-700/50"><td className="p-3 text-white">Wednesday</td><td className="p-3">Rice Sambar</td><td className="p-3">Drumstick, Potato, Onion, Tomato</td></tr>
                    <tr className="border-b border-slate-700/50"><td className="p-3 text-white">Thursday</td><td className="p-3">Rice Sambar</td><td className="p-3">Pumpkin, Bottle guard, cucumber, Ladies Finger, Radish</td></tr>
                    <tr className="border-b border-slate-700/50"><td className="p-3 text-white">Friday</td><td className="p-3">Bisibelebath</td><td className="p-3">Beans, Turnip, Carrot, Capsicum, Onion, Tomato</td></tr>
                    <tr><td className="p-3 text-white">Saturday</td><td className="p-3">Wheat Products</td><td className="p-3">Carrot, Beans, Cabbages, Onion, Dill greens</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Additional Nutrition (Supplements)</h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                <li><strong>Vitamin A:</strong> 2 Lakh IU (2 Tablets/year)</li>
                <li><strong>WIFS (Iron & Folic Acid):</strong> One tablet weekly (45mg for 1st-5th std, 100mg for 6th-10th std)</li>
                <li><strong>Albendozal (De-worming):</strong> 400mg (2 Tablets/year)</li>
              </ul>
            </div>
            
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-start gap-3">
                <Info className="text-blue-400 shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-slate-400">
                  <strong className="text-slate-300">System Integration Context:</strong> While the above tables dictate the comprehensive state mandate, our current hardware prototype and data collection strictly track <strong>Rice</strong>. Computations for other items assume average state compliance unless manually adjusted in the dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}

export default HowItWorksPage;

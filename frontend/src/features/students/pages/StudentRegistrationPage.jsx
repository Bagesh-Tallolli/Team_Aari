import React, { useState } from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import StudentRegistrationForm from '../components/StudentRegistrationForm.jsx';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  Smartphone,
  Scale,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

function StudentRegistrationPage() {
  const navigate = useNavigate();
  const [lastRegistered, setLastRegistered] = useState(null);

  const handleRegistrationSuccess = (student) => {
    setLastRegistered(student);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/students"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mb-2"
            >
              <ArrowLeft size={14} /> Back to Student Registry
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Register New Student
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Enroll pupil into the PM POSHAN nutritional tracking roster with RFID identification
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/students"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors"
            >
              View Roster
            </Link>
          </div>
        </div>

        {/* Success Banner if recently enrolled */}
        {lastRegistered && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Successfully Enrolled: {lastRegistered.name}
                </p>
                <p className="text-xs text-slate-300">
                  BMI: {lastRegistered.current_bmi} kg/m² • RFID: <span className="font-mono text-emerald-300">{lastRegistered.rfid_card_id}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/students/${lastRegistered.id}`)}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              Open Profile →
            </button>
          </div>
        )}

        {/* Main Grid: Form + Reference Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2">
            <StudentRegistrationForm onSuccess={handleRegistrationSuccess} />
          </div>

          {/* Quick Guide / Checklist (1 col) */}
          <div className="space-y-6">
            
            {/* Workflow steps */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" /> Enrollment Verification Steps
              </h3>
              
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Identity & School Class</p>
                    <p className="text-slate-400 text-[11px]">Primary (I–V) or Upper Primary (VI–VIII) to determine PM POSHAN calorie targets.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Physical Anthropometry</p>
                    <p className="text-slate-400 text-[11px]">Height & weight are used to compute BMI and evaluate pediatric screening norms.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">RFID Card Assignment</p>
                    <p className="text-slate-400 text-[11px]">Enables contactless student recognition at the smart serving weighing station.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-white">Parent Communication</p>
                    <p className="text-slate-400 text-[11px]">Parents receive verified weekly nutritional summaries if consent is given.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* PM POSHAN Reference Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Scale size={16} className="text-indigo-400" /> PM POSHAN Meal Targets
              </h3>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Class I–V (Primary)</span>
                  <span className="font-bold text-emerald-400">450 kcal / 12g protein</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Class VI–VIII (Upper Pri)</span>
                  <span className="font-bold text-indigo-400">700 kcal / 20g protein</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </MainLayout>
  );
}

export default StudentRegistrationPage;
import React, { useState } from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import StudentRegistrationForm from '../components/StudentRegistrationForm.jsx';
import { useNavigate } from 'react-router-dom';

function StudentRegistrationPage() {
  const navigate = useNavigate();
  const [registeredStudents, setRegisteredStudents] = useState([]);

  const handleRegistrationSuccess = (student) => {
    // Add to registered students list
    setRegisteredStudents([...registeredStudents, student]);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-12">
            <button
              onClick={() => navigate('/students')}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mb-4 transition-colors"
            >
              ← Back to Students
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Student Management</h1>
            <p className="text-slate-400 text-lg">
              Register new students with RFID card integration for AI + IoT tracking
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Registration Form */}
            <div className="lg:col-span-2">
              <StudentRegistrationForm onSuccess={handleRegistrationSuccess} />
            </div>

            {/* Info & Recently Registered */}
            <div className="space-y-6">
              {/* System Info */}
              <div className="glass rounded-3xl p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">System Info</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Architecture</p>
                    <p className="text-white font-semibold">AI + IoT + RFID</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Data Handling</p>
                    <p className="text-white font-semibold">Server-side BMI calculation</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">RFID Validation</p>
                    <p className="text-white font-semibold">Unique per student</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Data Fields</p>
                    <ul className="text-white text-sm space-y-1">
                      <li>✓ Name, Age, Gender</li>
                      <li>✓ Height & Weight</li>
                      <li>✓ RFID Card ID</li>
                      <li>✓ Auto BMI</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recently Registered */}
              {registeredStudents.length > 0 && (
                <div className="glass rounded-3xl p-6 shadow-2xl">
                  <h2 className="text-xl font-bold text-white mb-4">Just Registered</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {registeredStudents.map((student, idx) => (
                      <div
                        key={idx}
                        className="bg-indigo-600/10 border border-indigo-500/30 rounded-lg p-3"
                      >
                        <p className="text-white font-semibold text-sm">{student.name}</p>
                        <p className="text-slate-400 text-xs">
                          BMI: {student.current_bmi} | Age: {student.age}
                        </p>
                        <p className="text-indigo-400 text-xs font-mono">
                          {student.rfid_card_id}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Field Descriptions */}
              <div className="glass rounded-3xl p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Field Guide</h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-indigo-400 font-semibold">Height</p>
                    <p className="text-slate-400">Measured in centimeters (cm)</p>
                  </div>
                  <div>
                    <p className="text-indigo-400 font-semibold">Weight</p>
                    <p className="text-slate-400">Measured in kilograms (kg)</p>
                  </div>
                  <div>
                    <p className="text-indigo-400 font-semibold">RFID Card ID</p>
                    <p className="text-slate-400">Unique identifier for each student</p>
                  </div>
                  <div>
                    <p className="text-indigo-400 font-semibold">BMI</p>
                    <p className="text-slate-400">Calculated automatically: weight / (height)²</p>
                  </div>
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

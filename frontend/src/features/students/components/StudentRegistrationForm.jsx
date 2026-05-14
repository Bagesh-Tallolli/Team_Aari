import React, { useState } from 'react';
import { User, Calendar, Ruler, Weight, Smartphone } from 'lucide-react';
import { useNotification } from '../../../context/NotificationContext.jsx';
import apiService from '../../../services/apiService.js';

function StudentRegistrationForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [rfidCardId, setRfidCardId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bmi, setBmi] = useState(null);
  const { showError, showSuccess, showLoading } = useNotification();

  // Calculate BMI in real-time for preview
  const calculateBMI = (h, w) => {
    if (h && w && parseFloat(h) > 0 && parseFloat(w) > 0) {
      const heightInMeters = parseFloat(h) / 100;
      const calculatedBMI = (parseFloat(w) / (heightInMeters * heightInMeters)).toFixed(2);
      setBmi(calculatedBMI);
    } else {
      setBmi(null);
    }
  };

  const handleHeightChange = (e) => {
    const value = e.target.value;
    setHeight(value);
    calculateBMI(value, weight);
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    setWeight(value);
    calculateBMI(height, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!name || !age || !gender || !height || !weight || !rfidCardId) {
      showError('All fields are required');
      return;
    }

    setIsLoading(true);
    const toastId = showLoading('Registering student...');

    try {
      // Call backend API
      const response = await apiService.students.registerStudent({
        name,
        age: parseInt(age, 10),
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        rfid_card_id: rfidCardId,
        email: email || null,
      });

      if (response.success) {
        showSuccess(`${name} registered successfully!`);
        
        // Reset form
        setName('');
        setAge('');
        setGender('Male');
        setHeight('');
        setWeight('');
        setRfidCardId('');
        setEmail('');
        setBmi(null);

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(response.data);
        }
        // Notify other parts of the app to refresh students list
        try {
          window.dispatchEvent(new CustomEvent('studentRegistered', { detail: response.data }));
        } catch (e) {
          // ignore
        }
      } else {
        showError(response.error || 'Failed to register student');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError(error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass rounded-3xl p-8 shadow-2xl">
        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">Student Registration</h1>
        <p className="text-slate-400 text-sm mb-8">Register a new student with RFID integration</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Name & Age */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Age (5-20) *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="12"
                  min="5"
                  max="20"
                  className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Gender & Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all"
                disabled={isLoading}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Height (cm) *
              </label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  value={height}
                  onChange={handleHeightChange}
                  placeholder="150"
                  min="80"
                  max="200"
                  step="0.1"
                  className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 3: Weight & BMI Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Weight (kg) *
              </label>
              <div className="relative">
                <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  value={weight}
                  onChange={handleWeightChange}
                  placeholder="45"
                  min="10"
                  max="150"
                  step="0.1"
                  className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* BMI Preview (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                BMI Preview (Auto-calculated)
              </label>
              <div className="w-full bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/50 rounded-xl px-4 py-3 text-white flex items-center justify-center font-semibold">
                {bmi ? `${bmi}` : 'Enter height & weight'}
              </div>
            </div>
          </div>

          {/* Row 4: RFID & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RFID Card ID */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                RFID Card ID *
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={rfidCardId}
                  onChange={(e) => setRfidCardId(e.target.value)}
                  placeholder="RFID-12345678"
                  className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.edu"
                className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4">
            <p className="text-sm text-indigo-300">
              ℹ️ <strong>Important:</strong> BMI is automatically calculated on the server. RFID card ID must be unique for each student.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/50 hover:shadow-indigo-500/70 disabled:shadow-none"
          >
            {isLoading ? 'Registering...' : 'Register Student'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentRegistrationForm;

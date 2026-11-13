import React, { useState } from 'react';
import {
  User,
  Calendar,
  Ruler,
  Weight,
  Smartphone,
  School,
  BookOpen,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useNotification } from '../../../context/NotificationContext.jsx';
import apiService from '../../../services/apiService.js';

function StudentRegistrationForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    age: '',
    gender: 'Male',
    admission_number: '',
    school_name: 'Govt. Model Primary School',
    class_grade: 'Class V',
    section: 'A',
    academic_year: '2024-2025',
    height: '',
    weight: '',
    rfid_card_id: '',
    email: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    parent_report_consent: false,
  });

  const [bmi, setBmi] = useState(null);
  const [bmiCategory, setBmiCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { showError, showSuccess, showLoading } = useNotification();

  // Handle DOB change to auto-calculate age
  const handleDobChange = (e) => {
    const dobVal = e.target.value;
    const updated = { ...formData, dob: dobVal };

    if (dobVal) {
      const birthDate = new Date(dobVal);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 3 && calculatedAge <= 20) {
        updated.age = calculatedAge.toString();
      }
    }
    setFormData(updated);
  };

  // Calculate BMI in real-time
  const calculateBMI = (h, w) => {
    if (h && w && parseFloat(h) > 0 && parseFloat(w) > 0) {
      const heightInMeters = parseFloat(h) / 100;
      const val = (parseFloat(w) / (heightInMeters * heightInMeters)).toFixed(2);
      setBmi(val);

      const numBmi = parseFloat(val);
      if (numBmi < 15.0) {
        setBmiCategory({ label: 'Thinness / Underweight', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' });
      } else if (numBmi <= 20.0) {
        setBmiCategory({ label: 'Healthy Weight for Age', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' });
      } else if (numBmi <= 24.0) {
        setBmiCategory({ label: 'Overweight for Age', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' });
      } else {
        setBmiCategory({ label: 'Obese for Age', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' });
      }
    } else {
      setBmi(null);
      setBmiCategory(null);
    }
  };

  const handleHeightChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, height: value }));
    calculateBMI(value, formData.weight);
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, weight: value }));
    calculateBMI(formData.height, value);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Helper to generate a dummy/test RFID if hardware is in simulation
  const handleGenerateRFID = () => {
    const randomHex = Math.floor(10000000 + Math.random() * 90000000);
    handleChange('rfid_card_id', `RFID-${randomHex}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.age || parseInt(formData.age, 10) < 5 || parseInt(formData.age, 10) > 20) {
      errors.age = 'Age must be between 5 and 20';
    }
    if (!formData.height || parseFloat(formData.height) < 80 || parseFloat(formData.height) > 200) {
      errors.height = 'Height must be between 80cm and 200cm';
    }
    if (!formData.weight || parseFloat(formData.weight) < 10 || parseFloat(formData.weight) > 150) {
      errors.weight = 'Weight must be between 10kg and 150kg';
    }
    if (!formData.rfid_card_id.trim()) errors.rfid_card_id = 'RFID Card UID is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showError('Please correct the errors in the form');
      return;
    }

    setIsLoading(true);
    const toastId = showLoading(`Registering ${formData.name}...`);

    try {
      const response = await apiService.students.registerStudent({
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        rfid_card_id: formData.rfid_card_id.trim(),
        email: formData.email.trim() || null,
        admission_number: formData.admission_number.trim() || null,
        dob: formData.dob || null,
        class_grade: formData.class_grade,
        section: formData.section,
        academic_year: formData.academic_year,
        school_name: formData.school_name.trim(),
        parent_name: formData.parent_name.trim() || null,
        parent_phone: formData.parent_phone.trim() || null,
        parent_email: formData.parent_email.trim() || null,
        parent_report_consent: Boolean(formData.parent_report_consent),
      });

      if (response.success) {
        showSuccess(`${formData.name} registered successfully!`);

        // Reset form
        setFormData({
          name: '',
          dob: '',
          age: '',
          gender: 'Male',
          admission_number: '',
          school_name: 'Govt. Model Primary School',
          class_grade: 'Class V',
          section: 'A',
          academic_year: '2024-2025',
          height: '',
          weight: '',
          rfid_card_id: '',
          email: '',
          parent_name: '',
          parent_phone: '',
          parent_email: '',
          parent_report_consent: false,
        });
        setBmi(null);
        setBmiCategory(null);

        if (onSuccess) {
          onSuccess(response.data);
        }
        try {
          window.dispatchEvent(new CustomEvent('studentRegistered', { detail: response.data }));
        } catch (e) {
          /* ignore */
        }
      } else {
        showError(response.error || 'Failed to register student');
      }
    } catch (error) {
      showError(error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Personal Information */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <User className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">1. Student Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className={`w-full bg-slate-950/60 border ${validationErrors.name ? 'border-red-500' : 'border-slate-700/80'} rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                disabled={isLoading}
              />
              {validationErrors.name && (
                <p className="text-[11px] text-red-400 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admission No.
              </label>
              <input
                type="text"
                value={formData.admission_number}
                onChange={(e) => handleChange('admission_number', e.target.value)}
                placeholder="ADM-2024-042"
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={handleDobChange}
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Age (Years) *
              </label>
              <input
                type="number"
                min="5"
                max="20"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="10"
                className={`w-full bg-slate-950/60 border ${validationErrors.age ? 'border-red-500' : 'border-slate-700/80'} rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                disabled={isLoading}
              />
              {validationErrors.age && (
                <p className="text-[11px] text-red-400 mt-1">{validationErrors.age}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isLoading}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: School & Academic Details */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <School className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">2. Academic Enrollment</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                School / Institution
              </label>
              <input
                type="text"
                value={formData.school_name}
                onChange={(e) => handleChange('school_name', e.target.value)}
                placeholder="Govt. Model Primary School"
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Class / Grade
              </label>
              <select
                value={formData.class_grade}
                onChange={(e) => handleChange('class_grade', e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isLoading}
              >
                <option value="Class I">Class I (Primary)</option>
                <option value="Class II">Class II (Primary)</option>
                <option value="Class III">Class III (Primary)</option>
                <option value="Class IV">Class IV (Primary)</option>
                <option value="Class V">Class V (Primary)</option>
                <option value="Class VI">Class VI (Upper Primary)</option>
                <option value="Class VII">Class VII (Upper Primary)</option>
                <option value="Class VIII">Class VIII (Upper Primary)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Section & Academic Year
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => handleChange('section', e.target.value)}
                  placeholder="A"
                  className="w-16 bg-slate-950/60 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => handleChange('academic_year', e.target.value)}
                  placeholder="2024-2025"
                  className="flex-1 bg-slate-950/60 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Anthropometry & Physical Measurements */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Ruler className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">3. Physical Measurements & BMI</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Height (cm) *
              </label>
              <div className="relative">
                <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="number"
                  step="0.1"
                  min="80"
                  max="200"
                  value={formData.height}
                  onChange={handleHeightChange}
                  placeholder="135.5"
                  className={`w-full bg-slate-950/60 border ${validationErrors.height ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.height && (
                <p className="text-[11px] text-red-400 mt-1">{validationErrors.height}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Weight (kg) *
              </label>
              <div className="relative">
                <Weight className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="number"
                  step="0.1"
                  min="10"
                  max="150"
                  value={formData.weight}
                  onChange={handleWeightChange}
                  placeholder="32.0"
                  className={`w-full bg-slate-950/60 border ${validationErrors.weight ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.weight && (
                <p className="text-[11px] text-red-400 mt-1">{validationErrors.weight}</p>
              )}
            </div>

            {/* BMI Live Preview Box */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Calculated BMI</p>
                <p className="text-xl font-bold text-white mt-0.5">
                  {bmi ? `${bmi} kg/m²` : '--'}
                </p>
              </div>
              {bmiCategory && (
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${bmiCategory.color}`}>
                  {bmiCategory.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: RFID Card Integration */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Smartphone className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">4. Hardware RFID Identification</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                RFID Card UID *
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={formData.rfid_card_id}
                  onChange={(e) => handleChange('rfid_card_id', e.target.value)}
                  placeholder="Scan or enter RFID (e.g. RFID-8392104)"
                  className={`w-full bg-slate-950/60 border ${validationErrors.rfid_card_id ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-3 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                  disabled={isLoading}
                />
              </div>
              {validationErrors.rfid_card_id && (
                <p className="text-[11px] text-red-400 mt-1">{validationErrors.rfid_card_id}</p>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={handleGenerateRFID}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-emerald-400" />
                <span>Simulate / Assign RFID</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Parent / Guardian Communication */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Mail className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">5. Parent / Guardian Communication</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Parent / Guardian Name
              </label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => handleChange('parent_name', e.target.value)}
                placeholder="Shri Suresh Kumar"
                className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Parent Mobile
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => handleChange('parent_phone', e.target.value)}
                  placeholder="+91 98765 12345"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Parent Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => handleChange('parent_email', e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="flex items-start gap-2.5 text-xs text-slate-400 hover:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.parent_report_consent}
                onChange={(e) => handleChange('parent_report_consent', e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>
                Parent/Guardian has provided affirmative consent to receive weekly student nutritional status and dietary assessment reports via email.
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-60"
          >
            {isLoading ? 'Enrolling Student...' : 'Complete Student Enrollment'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StudentRegistrationForm;
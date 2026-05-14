import React, { useState } from 'react';
import { Scan, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import RFIDInputSection from '../components/RFIDInputSection.jsx';
import StudentInfoCard from '../components/StudentInfoCard.jsx';
import AIHealthStatus from '../components/AIHealthStatus.jsx';
import DietRecommendation from '../components/DietRecommendation.jsx';
import SuccessMessage from '../components/SuccessMessage.jsx';

const API_BASE_URL = 'http://localhost:5001';

function FoodDistributionPage() {
  const [rfidInput, setRfidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanData, setScanData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    
    if (!rfidInput.trim()) {
      toast.error('Please enter RFID card ID');
      return;
    }

    setLoading(true);
    setError(null);
    setScanData(null);
    setShowSuccess(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/scan`, {
        rfid_card_id: rfidInput.trim()
      });

      if (response.data.success) {
        const data = response.data.data;
        setScanData(data);
        setShowSuccess(true);
        toast.success('Food served successfully!');
        
        // Clear input
        setRfidInput('');
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to process scan');
        toast.error(response.data.message || 'Failed to process scan');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to connect to backend';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Scan className="text-indigo-400" size={32} />
            <h1 className="text-4xl font-bold text-white">Food Distribution Panel</h1>
          </div>
          <p className="text-slate-400">Real-time RFID-based serving workflow with AI-powered nutrition guidance</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* RFID Input Section */}
            <RFIDInputSection 
              rfidInput={rfidInput}
              setRfidInput={setRfidInput}
              onScan={handleScan}
              loading={loading}
            />

            {/* Student Info Card */}
            {scanData && (
              <StudentInfoCard 
                student={scanData}
              />
            )}

            {/* Error Display */}
            {error && !scanData && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-red-300 font-semibold">Error</p>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - AI Status & Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Success Message Overlay */}
            {showSuccess && scanData && (
              <SuccessMessage 
                studentName={scanData.name}
                grams={scanData.grams}
              />
            )}

            {/* AI Health Status */}
            {scanData && (
              <AIHealthStatus 
                status={scanData.nutrition_status}
                confidence={scanData.nutrition_confidence}
                reason={scanData.nutrition_reason}
              />
            )}

            {/* Diet Recommendation */}
            {scanData && scanData.diet_recommendations && (
              <DietRecommendation 
                dietPlan={scanData.diet_recommendations}
              />
            )}

            {/* No Data State */}
            {!scanData && !loading && (
              <div className="glass rounded-xl p-12 text-center">
                <Scan className="text-slate-500 mx-auto mb-4" size={48} />
                <p className="text-slate-400 text-lg">Enter RFID and click "Scan & Serve" to begin</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="glass rounded-xl p-12 text-center">
                <Loader className="text-indigo-400 mx-auto mb-4 animate-spin" size={48} />
                <p className="text-slate-300 text-lg">Processing scan...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return <MainLayout>{content}</MainLayout>;
}

export default FoodDistributionPage;

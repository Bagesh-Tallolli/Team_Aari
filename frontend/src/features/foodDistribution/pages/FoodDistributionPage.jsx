import React, { useState, useEffect } from 'react';
import {
  Monitor,
  CheckCircle,
  Clock,
  Loader,
  Scale,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Sparkles,
  Info,
  Radio,
} from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import studentsEatingImg from '../../../assets/images/students_eating.png';
import apiService from '../../../services/apiService.js';
import { useNotification } from '../../../context/NotificationContext.jsx';

function FoodDistributionPage() {
  const [hardwareStatus, setHardwareStatus] = useState({
    espConnected: false,
    physicalConnected: false,
    isSimulation: true,
    statusLabel: 'Simulation Mode',
    rfidReady: true,
    loadCellReady: true,
    servoReady: true,
    waitingForStudent: true,
    currentState: 'waiting_for_student',
    lastScanData: null,
    lastServing: null,
    lastError: null,
  });

  const [recentDistributions, setRecentDistributions] = useState([]);
  const [simRfid, setSimRfid] = useState('');
  const [simWeight, setSimWeight] = useState(150);
  const [isSimulating, setIsSimulating] = useState(false);
  const { showSuccess, showError } = useNotification();

  // Polling for hardware status & recent distributions
  const fetchData = async () => {
    try {
      const [statusRes, recentRes] = await Promise.all([
        apiService.hardware.getStatus(),
        apiService.hardware.getRecent(),
      ]);

      if (statusRes.success && statusRes.data) {
        setHardwareStatus(statusRes.data);
      }
      if (recentRes.success && recentRes.data) {
        setRecentDistributions(recentRes.data);
      }
    } catch (err) {
      console.error('Error fetching hardware data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Quick simulation trigger for testing
  const handleSimulateServing = async () => {
    if (!simRfid.trim()) {
      showError('Please enter an RFID UID to simulate scan');
      return;
    }

    setIsSimulating(true);
    try {
      // 1. Simulate scan
      const scanRes = await apiService.hardware.scanRFID(simRfid.trim());
      if (!scanRes.success) {
        showError(scanRes.error || 'Student with this RFID not found');
        setIsSimulating(false);
        return;
      }

      showSuccess(`Student identified: ${scanRes.data.name || 'Enrolled Student'}`);

      // 2. Simulate dispensing & confirmation
      const txnId = scanRes.data.txn_id || `sim-txn-${Date.now()}`;
      const confirmRes = await apiService.hardware.confirmServing({
        txn_id: txnId,
        student_id: scanRes.data.student_id,
        food_item: 'Cooked Rice & Dal (Mid-Day Meal)',
        actual_grams_served: parseFloat(simWeight),
      });

      if (confirmRes.success) {
        showSuccess(`Meal recorded! ${simWeight}g verified via simulated HX711`);
        fetchData();
      } else {
        showError(confirmRes.error || 'Failed to record simulated serving');
      }
    } catch (e) {
      showError(e.message || 'Simulation error');
    } finally {
      setIsSimulating(false);
    }
  };

  const StatusPill = ({ label, isPhysical, detail }) => {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div>
          <span className="text-slate-300 font-medium text-xs block">{label}</span>
          {detail && <span className="text-[10px] text-slate-500">{detail}</span>}
        </div>
        {isPhysical ? (
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[11px] font-semibold">
            <CheckCircle size={12} />
            <span>Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30 text-[11px] font-semibold">
            <Radio size={12} />
            <span>Simulation</span>
          </div>
        )}
      </div>
    );
  };

  const currentState = hardwareStatus.currentState || (hardwareStatus.waitingForStudent ? 'waiting_for_student' : 'student_identified');

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
              <Monitor size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Smart Food Distribution Station
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                HX711 precision load cell serving verification & RC522 RFID card identification
              </p>
            </div>
          </div>

          {/* Hardware Connection Indicator */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs font-medium text-slate-300 shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${hardwareStatus.physicalConnected ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
            <span>
              {hardwareStatus.physicalConnected
                ? 'ESP8266 Physical Controller Online'
                : '🔵 Simulation Mode (Software Test Bench Active)'}
            </span>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-400">
          <Info size={18} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-slate-200 font-semibold">
              Serving Verification Note:
            </p>
            <p>
              An RFID scan identifies the student; meal servings are recorded exclusively upon confirmation of stable food weight on the HX711 load cell. Physical hardware not currently attached runs under software simulation.
            </p>
          </div>
        </div>

        {/* Diagnostics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusPill
            label="ESP8266 IoT Controller"
            isPhysical={hardwareStatus.physicalConnected}
            detail={hardwareStatus.physicalConnected ? 'WiFi Client Connected' : 'Simulated (Loopback)'}
          />
          <StatusPill
            label="RC522 RFID Scanner"
            isPhysical={hardwareStatus.physicalConnected}
            detail="13.56 MHz Card Reader"
          />
          <StatusPill
            label="HX711 Load Cell"
            isPhysical={hardwareStatus.physicalConnected}
            detail="24-bit Precision ADC"
          />
          <StatusPill
            label="Dispenser Gate"
            isPhysical={hardwareStatus.physicalConnected}
            detail="PWM Controlled Servo"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: State Machine & Test Bench */}
          <div className="space-y-6">
            
            {/* Dispenser State Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Cpu size={15} className="text-indigo-400" /> Dispenser State Machine
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Live Sync</span>
              </div>

              {currentState === 'waiting_for_student' && (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Clock size={18} className="animate-pulse" />
                  </div>
                  <p className="text-white font-semibold text-xs">Waiting for Student RFID</p>
                  <p className="text-slate-400 text-[11px]">
                    Tap card at scanner or use the simulation console below.
                  </p>
                </div>
              )}

              {currentState === 'student_identified' && hardwareStatus.lastScanData && (
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-2 text-xs">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold">
                    Student Identified
                  </span>
                  <p className="text-base font-bold text-white">{hardwareStatus.lastScanData.name}</p>
                  <p className="text-slate-400">
                    Target: {hardwareStatus.lastScanData.targetGrams || 150}g portion
                  </p>
                </div>
              )}

              {currentState === 'serving_confirmed' && hardwareStatus.lastServing && (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-2 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                    <CheckCircle size={10} /> Serving Confirmed
                  </span>
                  <p className="text-base font-bold text-white">{hardwareStatus.lastServing.student_name}</p>
                  <p className="text-emerald-400 font-mono">
                    {hardwareStatus.lastServing.actual_grams_served}g served • {hardwareStatus.lastServing.calories_served} kcal
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Simulation Console */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Simulation Test Console
                </h3>
              </div>
              <p className="text-slate-400 text-xs">
                Simulate an RFID badge tap and weighing cycle to verify the backend pipeline:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Student RFID UID
                  </label>
                  <input
                    type="text"
                    value={simRfid}
                    onChange={(e) => setSimRfid(e.target.value)}
                    placeholder="e.g. RFID-12345678"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Simulated Portion Weight (Grams)
                  </label>
                  <input
                    type="number"
                    value={simWeight}
                    onChange={(e) => setSimWeight(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSimulateServing}
                  disabled={isSimulating}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-60"
                >
                  {isSimulating ? 'Simulating Serving...' : 'Simulate Meal Distribution'}
                </button>
              </div>
            </div>

            {/* Photo Card */}
            <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative h-48">
              <img
                src={studentsEatingImg}
                alt="Mid-day Meal"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-4">
                <p className="text-white text-xs font-medium">PM POSHAN Mid-Day Meal Automated Nutrition Assurance</p>
              </div>
            </div>

          </div>

          {/* Right Column: Confirmed Meal Servings Table */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Recent Confirmed Servings
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Verified weight measurements recorded exclusively via post-dispensing HX711 feedback
                  </p>
                </div>
                <span className="px-3 py-1 bg-slate-950 text-slate-400 rounded-xl text-xs font-mono border border-slate-800">
                  {recentDistributions.length} Records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 px-3 font-semibold">Student</th>
                      <th className="pb-3 px-3 font-semibold">Food Item</th>
                      <th className="pb-3 px-3 font-semibold text-right">Measured Weight</th>
                      <th className="pb-3 px-3 font-semibold text-right">Calories</th>
                      <th className="pb-3 px-3 font-semibold text-right">Protein</th>
                      <th className="pb-3 px-3 font-semibold">Timestamp</th>
                      <th className="pb-3 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 text-xs divide-y divide-slate-800/60">
                    {recentDistributions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-slate-500">
                          No confirmed distributions recorded yet. Tap an RFID card on the IoT dispenser to start.
                        </td>
                      </tr>
                    ) : (
                      recentDistributions.map((dist, idx) => (
                        <tr key={dist.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white">
                            {dist.student_name}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {dist.food_item}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                            {dist.grams_served}g
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-orange-400">
                            {dist.calories_served} kcal
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-indigo-300">
                            {dist.protein_served || (dist.grams_served * 0.027).toFixed(1)}g
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {dist.distribution_date} {dist.distribution_time}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-semibold">
                              <CheckCircle size={10} />
                              Confirmed
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Note: Serving logs represent confirmed meal distributions verified server-side.</span>
                <span className="text-slate-400 font-mono">PM POSHAN Standard</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}

export default FoodDistributionPage;
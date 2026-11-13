import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  Settings,
  Shield,
  School,
  Calendar,
  User,
  ChevronDown,
} from 'lucide-react';
import apiService from '../../services/apiService.js';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchAlertCount() {
      try {
        const res = await apiService.alerts.getAll();
        if (isMounted && res.success && Array.isArray(res.data)) {
          setAlertCount(res.data.length);
        }
      } catch (e) {
        // silent
      }
    }
    fetchAlertCount();
    return () => { isMounted = false; };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/students?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: School Name & Date context */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <School size={15} className="text-emerald-400" />
            <span className="font-semibold text-white">
              {user?.school_name || 'Govt. Model Primary School'}
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar size={13} />
            <span>{todayFormatted}</span>
          </div>
        </div>

        {/* Middle: Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search students, RFID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </form>

        {/* Right Section: Alert Bell + User Badge */}
        <div className="flex items-center gap-3">
          
          {/* Notifications Bell */}
          <Link
            to="/alerts"
            title={`${alertCount} Active Alerts`}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors"
          >
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px] flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">
                  {user?.name || 'Staff Member'}
                </p>
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                  {user?.role || 'Staff'}
                </span>
              </div>
              <ChevronDown size={14} className="text-slate-400 ml-0.5" />
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn text-xs">
                <div className="px-4 py-2 border-b border-slate-800/80">
                  <p className="font-semibold text-white truncate">{user?.name || 'Staff'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/how-it-works"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <Shield size={14} className="text-indigo-400" />
                    <span>System Architecture</span>
                  </Link>

                  <Link
                    to="/government-schemes"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <School size={14} className="text-emerald-400" />
                    <span>Govt. Schemes</span>
                  </Link>
                </div>

                <div className="border-t border-slate-800/80 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}

export default Navbar;
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UtensilsCrossed,
  Activity,
  AlertTriangle,
  BarChart3,
  Landmark,
  HelpCircle,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppContext();
  const { user, logout } = useAuth();

  const navigationSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      ],
    },
    {
      title: 'Students & Registry',
      items: [
        { id: 'students', label: 'All Students', icon: Users, path: '/students' },
        { id: 'registerStudent', label: 'Register Student', icon: UserPlus, path: '/students/register' },
        { id: 'nutritionTracker', label: 'Nutrition Tracker', icon: Activity, path: '/students/nutrition-tracker' },
      ],
    },
    {
      title: 'Meal Operations',
      items: [
        { id: 'foodDistribution', label: 'Meal Serving Log', icon: UtensilsCrossed, path: '/food-distribution' },
        { id: 'alerts', label: 'Nutritional Alerts', icon: AlertTriangle, path: '/alerts' },
      ],
    },
    {
      title: 'Governance & Insights',
      items: [
        { id: 'schemes', label: 'Govt. Schemes', icon: Landmark, path: '/government-schemes' },
        { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3, path: '/analytics' },
        { id: 'howItWorks', label: 'System Architecture', icon: HelpCircle, path: '/how-it-works' },
      ],
    },
  ];

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header / Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950">
          {!sidebarCollapsed && (
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="font-bold text-white text-base tracking-tight block leading-tight">Santulita</span>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wide uppercase">PM POSHAN AI</span>
              </div>
            </Link>
          )}

          {sidebarCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white">
                <ShieldCheck size={20} />
              </div>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors ${
              sidebarCollapsed ? 'hidden' : 'block'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {navigationSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    <IconComponent
                      size={19}
                      className={`flex-shrink-0 transition-colors ${
                        isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card & Logout at bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs flex-shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : <User size={15} />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate leading-tight">
                    {user?.name || 'School Staff'}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium uppercase truncate">
                    {user?.role || 'Staff'} • {user?.school_name || 'Santulita'}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ml-1 flex-shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Spacer to push page content */}
      <div
        className={`transition-all duration-300 flex-shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      />
    </>
  );
}

export default Sidebar;
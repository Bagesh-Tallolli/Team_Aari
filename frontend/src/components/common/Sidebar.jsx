import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  BarChart3,
  Menu,
  X,
  Utensils,
  Activity,
} from 'lucide-react';
import { MENU_ITEMS } from '../../utils/constants.js';
import { useAppContext } from '../../context/AppContext.jsx';

function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppContext();

  // Icon mapping
  const iconMap = {
    LayoutDashboard,
    Users,
    AlertCircle,
    BarChart3,
    Utensils,
    Activity,
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-slate-900/95 border-r border-indigo-500/20 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-500/20">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <h1 className="text-lg font-bold text-white hidden lg:block" title="AI Nutrition Monitoring System">AI Nutrition Monitoring System</h1>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 space-y-2 px-3">
          {MENU_ITEMS.map((item) => {
            const IconComponent = iconMap[item.icon];
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                {IconComponent && <IconComponent size={20} className="flex-shrink-0" />}
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom info */}
        {!sidebarCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-indigo-500/20">
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400">Dark Mode</p>
              <p className="text-xs font-semibold text-indigo-400">Enabled</p>
            </div>
          </div>
        )}
      </aside>

      {/* Sidebar spacer */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      />
    </>
  );
}

export default Sidebar;

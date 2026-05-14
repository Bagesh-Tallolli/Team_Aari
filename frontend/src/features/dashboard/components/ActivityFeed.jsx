import React from 'react';
import Card from '../../../components/common/Card.jsx';
import { AlertCircle, Utensils } from 'lucide-react';
import { formatRelativeTime } from '../../../utils/formatters.js';

function ActivityFeed({ activities = [] }) {
  return (
    <Card variant="default">
      <h3 className="text-lg font-bold text-white mb-6">Live Activity Feed</h3>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors"
            >
              {/* Icon */}
              <div className={`flex-shrink-0 p-2 rounded-lg ${
                activity.type === 'meal_served'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {activity.type === 'meal_served' ? (
                  <Utensils size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {activity.type === 'meal_served' ? (
                  <>
                    <p className="text-sm text-slate-200 font-medium">
                      <span className="text-indigo-400">{activity.studentName}</span> served {activity.quantity } {activity.foodName}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-200 font-medium">
                      <span className="text-red-400">{activity.studentName}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{activity.message}</p>
                  </>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>

              {/* Status Badge */}
              {activity.severity && (
                <div className={`flex-shrink-0 h-fit px-2 py-1 rounded-full text-xs font-medium ${
                  activity.severity === 'critical'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {activity.severity}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default ActivityFeed;

import { Bell, X, AlertCircle, TrendingDown, Target } from 'lucide-react';
import { useAlerts } from '../context/AlertsContext';
import clsx from 'clsx';

export default function AlertsPanel() {
    const { alerts, unreadAlertCount, markAlertAsRead, clearAllAlerts } = useAlerts();
    
    const unreadAlerts = alerts.filter(a => !a.read);
    const severityColor = {
        high: 'border-l-4 border-red-500 bg-red-50',
        medium: 'border-l-4 border-yellow-500 bg-yellow-50',
        low: 'border-l-4 border-blue-500 bg-blue-50'
    };

    const typeIcon = {
        anomaly: <AlertCircle className="w-4 h-4 text-red-500" />,
        budget_exceeded: <TrendingDown className="w-4 h-4 text-orange-500" />,
        goal_milestone: <Target className="w-4 h-4 text-green-500" />,
        savings_drop: <TrendingDown className="w-4 h-4 text-purple-500" />
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-slate-700" />
                    <h3 className="font-bold text-slate-900">Alertas ({unreadAlertCount})</h3>
                </div>
                {unreadAlerts.length > 0 && (
                    <button
                        onClick={clearAllAlerts}
                        className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                        Limpar tudo
                    </button>
                )}
            </div>

            {unreadAlerts.length === 0 ? (
                <p className="text-sm text-slate-600">✅ Nenhum alerta novo</p>
            ) : (
                <div className="space-y-3">
                    {unreadAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={clsx(
                                'p-3 rounded-lg flex gap-3 items-start cursor-pointer hover:opacity-80 transition-opacity',
                                severityColor[alert.severity] || severityColor.medium
                            )}
                            onClick={() => markAlertAsRead(alert.id)}
                        >
                            {typeIcon[alert.type] || <Bell className="w-4 h-4" />}
                            <div className="flex-1">
                                <p className="font-semibold text-sm text-slate-900">{alert.title}</p>
                                <p className="text-xs text-slate-700">{alert.message}</p>
                                {alert.category && (
                                    <p className="text-xs text-slate-600 mt-1">📁 {alert.category}</p>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    markAlertAsRead(alert.id);
                                }}
                                className="hover:opacity-60"
                            >
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

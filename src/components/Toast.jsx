import { X, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Toast({ type = 'info', title, message, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        warning: <AlertCircle className="w-5 h-5" />,
        info: <Zap className="w-5 h-5" />
    };

    return (
        <div className={`${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`}>
            {icons[type]}
            <div className="flex-1">
                {title && <p className="font-bold text-sm">{title}</p>}
                {message && <p className="text-sm opacity-90">{message}</p>}
            </div>
            <button onClick={onClose} className="hover:opacity-80">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

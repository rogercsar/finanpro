import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
    const [permission, setPermission] = useState(Notification.permission);

    useEffect(() => {
        if (!("Notification" in window)) {
            console.log("Este navegador não suporta notificações de desktop");
        }
    }, []);

    const requestPermission = useCallback(async () => {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
    }, []);

    const showNotification = useCallback((title, options) => {
        if (permission === 'granted') {
            new Notification(title, options);
        }
    }, [permission]);

    return {
        permission,
        requestPermission,
        showNotification,
    };
}
import React from 'react';
import { Warning, Printer } from 'phosphor-react';
import { usePrinterNotifications } from '@/context/PrinterNotificationContext';

export const PrinterAlertIndicator: React.FC = () => {
  const { criticalErrors, isCheckingErrors } = usePrinterNotifications();

  if (criticalErrors.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg border border-red-300 animate-pulse">
        <div className="relative">
          <Printer size={18} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{criticalErrors.length}</span>
          </div>
        </div>
        <span className="text-sm font-medium">
          {criticalErrors.length === 1 ? '1 Alerta Crítico' : `${criticalErrors.length} Alertas Críticos`}
        </span>
        <Warning size={16} className="text-red-600" />
      </div>
      
      {isCheckingErrors && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-ping"></div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Warning, X, Printer, Clock } from 'phosphor-react';
import { usePrinterNotifications } from '@/context/PrinterNotificationContext';

export const PrinterCriticalAlert: React.FC = () => {
  const { criticalErrors, acknowledgeError } = usePrinterNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);

  useEffect(() => {
    if (criticalErrors.length > 0) {
      setIsVisible(true);
      setCurrentErrorIndex(0);
      
      // Reproduzir som de alerta (opcional)
      if (typeof window !== 'undefined') {
        try {
          const audio = new Audio('/alert-sound.mp3'); // Você pode adicionar um arquivo de som
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Ignorar se não conseguir reproduzir som
          });
        } catch (e) {
          // Ignorar erro de áudio
        }
      }
    } else {
      setIsVisible(false);
    }
  }, [criticalErrors]);

  const handleAcknowledge = (errorId: string) => {
    acknowledgeError(errorId);
  };

  const getCurrentError = () => {
    return criticalErrors[currentErrorIndex];
  };

  const nextError = () => {
    if (currentErrorIndex < criticalErrors.length - 1) {
      setCurrentErrorIndex(currentErrorIndex + 1);
    }
  };

  const prevError = () => {
    if (currentErrorIndex > 0) {
      setCurrentErrorIndex(currentErrorIndex - 1);
    }
  };

  const closeAlert = () => {
    setIsVisible(false);
  };

  if (!isVisible || criticalErrors.length === 0) {
    return null;
  }

  const currentError = getCurrentError();
  const errorId = `${currentError.printerId}-${currentError.error}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto transform animate-pulse">
        {/* Header */}
        <div className={`p-4 rounded-t-xl flex items-center justify-between ${
          currentError.severity === 'critical' ? 'bg-red-600' : 'bg-orange-600'
        }`}>
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white bg-opacity-20 rounded-full">
              <Warning size={24} weight="fill" />
            </div>
            <div>
              <h3 className="font-bold text-lg">ALERTA CRÍTICO</h3>
              <p className="text-sm opacity-90">Impressora Requer Atenção Imediata</p>
            </div>
          </div>
          <button
            onClick={closeAlert}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Printer Info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <Printer size={24} className="text-gray-600" />
            <div>
              <div className="font-bold text-gray-800">{currentError.printerName}</div>
              <div className="text-sm text-gray-600">IP: {currentError.printerIP}</div>
            </div>
          </div>

          {/* Error Details */}
          <div className="mb-6">
            <div className={`p-4 rounded-lg border-l-4 ${
              currentError.severity === 'critical' 
                ? 'bg-red-50 border-red-500' 
                : 'bg-orange-50 border-orange-500'
            }`}>
              <div className={`font-bold mb-2 ${
                currentError.severity === 'critical' ? 'text-red-800' : 'text-orange-800'
              }`}>
                {currentError.error}
              </div>
              <div className={`text-sm mb-3 ${
                currentError.severity === 'critical' ? 'text-red-700' : 'text-orange-700'
              }`}>
                {currentError.description}
              </div>
              <div className={`text-sm font-medium ${
                currentError.severity === 'critical' ? 'text-red-800' : 'text-orange-800'
              }`}>
                <strong>Ação Necessária:</strong> {currentError.action}
              </div>
            </div>
          </div>

          {/* Multiple Errors Navigation */}
          {criticalErrors.length > 1 && (
            <div className="flex items-center justify-between mb-6 p-3 bg-gray-100 rounded-lg">
              <button
                onClick={prevError}
                disabled={currentErrorIndex === 0}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                {currentErrorIndex + 1} de {criticalErrors.length} alertas
              </span>
              <button
                onClick={nextError}
                disabled={currentErrorIndex === criticalErrors.length - 1}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
              >
                Próximo
              </button>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <Clock size={12} />
            Detectado em: {new Date(currentError.timestamp).toLocaleString('pt-BR')}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => handleAcknowledge(errorId)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                currentError.severity === 'critical' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              Reconhecer e Resolver
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs text-blue-800">
              <strong>💡 Dica:</strong> Este alerta não aparecerá novamente após ser reconhecido. 
              A impressora continuará sendo monitorada automaticamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CriticalError {
  printerId: number;
  printerName: string;
  printerIP: string;
  error: string;
  severity: 'critical' | 'error';
  action: string;
  description: string;
  timestamp: string;
}

interface PrinterNotificationContextType {
  criticalErrors: CriticalError[];
  acknowledgedErrors: Set<string>;
  acknowledgeError: (errorId: string, printerId: number) => void;
  checkForCriticalErrors: () => Promise<void>;
  isCheckingErrors: boolean;
}

const PrinterNotificationContext = createContext<PrinterNotificationContextType | undefined>(undefined);

export const usePrinterNotifications = () => {
  const context = useContext(PrinterNotificationContext);
  if (!context) {
    throw new Error('usePrinterNotifications deve ser usado dentro de um PrinterNotificationProvider');
  }
  return context;
};

interface PrinterNotificationProviderProps {
  children: ReactNode;
}

export const PrinterNotificationProvider: React.FC<PrinterNotificationProviderProps> = ({ children }) => {
  const [criticalErrors, setCriticalErrors] = useState<CriticalError[]>([]);
  const [acknowledgedErrors, setAcknowledgedErrors] = useState<Set<string>>(new Set());
  const [isCheckingErrors, setIsCheckingErrors] = useState(false);
  const [snoozedPrinters, setSnoozedPrinters] = useState<Map<number, number>>(new Map());

  const generateErrorId = (printerId: number, error: string) => `${printerId}-${error}`;

  const checkForCriticalErrors = async () => {
    setIsCheckingErrors(true);
    try {
      const response = await fetch('/api/printer-status');
      const data = await response.json();

      const newCriticalErrors: CriticalError[] = [];
      const currentTime = Date.now();

      data.printers?.forEach((printer: any) => {
        // Verificar se a impressora está em snooze
        const snoozeUntil = snoozedPrinters.get(printer.id);
        const isPrinterSnoozed = snoozeUntil && currentTime < snoozeUntil;

        if (printer.errorDetails && printer.errorDetails.length > 0) {
          printer.errorDetails.forEach((errorDetail: any) => {
            if (errorDetail.severity === 'critical' ||
                (errorDetail.severity === 'error' &&
                 (errorDetail.error.includes('Papel Atolado') ||
                  errorDetail.error.includes('Toner Vazio') ||
                  errorDetail.error.includes('Papel Vazio')))) {

              const errorId = generateErrorId(printer.id, errorDetail.error);

              // Só adicionar se não foi reconhecido E se a impressora não está em snooze
              if (!acknowledgedErrors.has(errorId) && !isPrinterSnoozed) {
                newCriticalErrors.push({
                  printerId: printer.id,
                  printerName: printer.sigla,
                  printerIP: printer.ip,
                  error: errorDetail.error,
                  severity: errorDetail.severity,
                  action: errorDetail.action,
                  description: errorDetail.description,
                  timestamp: new Date().toISOString()
                });
              }
            }
          });
        }
      });

      setCriticalErrors(newCriticalErrors);
    } catch (error) {
      console.error('Erro ao verificar erros críticos das impressoras:', error);
    } finally {
      setIsCheckingErrors(false);
    }
  };

  const acknowledgeError = (errorId: string, printerId: number) => {
    setAcknowledgedErrors(prev => new Set([...Array.from(prev), errorId]));

    // Adicionar snooze de 10 minutos para esta impressora
    const snoozeUntil = Date.now() + (10 * 60 * 1000); // 10 minutos em ms
    setSnoozedPrinters(prev => new Map(prev).set(printerId, snoozeUntil));

    // Remover erro da lista de críticos
    setCriticalErrors(prev =>
      prev.filter(error => generateErrorId(error.printerId, error.error) !== errorId)
    );
  };

  useEffect(() => {
    // Verificar erros críticos imediatamente
    checkForCriticalErrors();

    // Verificar a cada 2 minutos
    const interval = setInterval(checkForCriticalErrors, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [snoozedPrinters]);

  // Limpar erros reconhecidos após 4 horas
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setAcknowledgedErrors(new Set());
    }, 4 * 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Limpar snoozes expirados periodicamente
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const currentTime = Date.now();
      setSnoozedPrinters(prev => {
        const updated = new Map(prev);
        for (const [printerId, snoozeUntil] of updated.entries()) {
          if (currentTime >= snoozeUntil) {
            updated.delete(printerId);
          }
        }
        return updated;
      });
    }, 60 * 1000); // Verificar a cada minuto

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <PrinterNotificationContext.Provider value={{
      criticalErrors,
      acknowledgedErrors,
      acknowledgeError,
      checkForCriticalErrors,
      isCheckingErrors
    }}>
      {children}
    </PrinterNotificationContext.Provider>
  );
};
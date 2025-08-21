import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, RotateCcw, Zap, ZapOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BarcodeScannerAdvancedProps {
  onScan: (data: string) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export const BarcodeScannerAdvanced: React.FC<BarcodeScannerAdvancedProps> = ({ 
  onScan, 
  onError, 
  onClose 
}) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  // Get available cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      // Try to select rear camera by default
      const rearCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      setSelectedCamera(rearCamera?.id || devices[0]?.id || '');
    } catch (err) {
      console.error('Erro ao obter câmeras:', err);
      setError('Não foi possível acessar as câmeras do dispositivo');
    }
  }, []);

  // Initialize scanner
  const initScanner = useCallback(() => {
    if (!scannerRef.current || !selectedCamera) return;

    const config = {
      fps: 10,
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1.0,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 1,
      useBarCodeDetectorIfSupported: true,
      rememberLastUsedCamera: true,
      // Advanced camera selection
      cameraIdOrConfig: {
        deviceId: { exact: selectedCamera }
      }
    };

    try {
      const scanner = new Html5QrcodeScanner(
        scannerRef.current.id,
        config,
        false
      );

      scanner.render(
        (decodedText, decodedResult) => {
          console.log('Código escaneado:', decodedText);
          setIsScanning(false);
          onScan(decodedText);
          cleanup();
        },
        (errorMessage) => {
          // Don't show continuous scanning errors
          if (!errorMessage.includes('NotFoundException')) {
            console.warn('Erro no scanner:', errorMessage);
            if (onError) {
              onError(errorMessage);
            }
          }
        }
      );

      scannerInstanceRef.current = scanner;
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error('Erro ao inicializar scanner:', err);
      setError('Erro ao inicializar o scanner');
      if (onError) {
        onError(err);
      }
    }
  }, [selectedCamera, onScan, onError]);

  // Cleanup scanner
  const cleanup = useCallback(() => {
    if (scannerInstanceRef.current) {
      try {
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      } catch (err) {
        console.warn('Erro ao limpar scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  // Toggle flashlight (if supported)
  const toggleTorch = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: selectedCamera,
          advanced: [{ torch: !torch } as any]
        } 
      });
      
      const track = stream.getVideoTracks()[0];
      if ('torch' in track.getCapabilities()) {
        await track.applyConstraints({
          advanced: [{ torch: !torch } as any]
        });
        setTorch(!torch);
      }
    } catch (err) {
      console.warn('Torch não suportado:', err);
    }
  }, [selectedCamera, torch]);

  // Switch camera
  const switchCamera = useCallback(() => {
    cleanup();
    
    const currentIndex = cameras.findIndex(cam => cam.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    if (nextCamera) {
      setSelectedCamera(nextCamera.id);
    }
  }, [cameras, selectedCamera, cleanup]);

  // Initialize
  useEffect(() => {
    getCameras();
  }, [getCameras]);

  // Start scanning when camera is selected
  useEffect(() => {
    if (selectedCamera) {
      initScanner();
    }
    
    return cleanup;
  }, [selectedCamera, initScanner, cleanup]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Scanner de Código</h3>
            <p className="text-blue-100 text-sm">
              {isScanning ? 'Aponte para o código de barras' : 'Preparando câmera...'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Camera Switch */}
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Trocar câmera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
            
            {/* Torch Toggle */}
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-lg transition-colors ${
                torch 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={torch ? 'Desligar flash' : 'Ligar flash'}
            >
              {torch ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
            
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Fechar scanner"
              >
                <CameraOff className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="p-6">
        {error ? (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Erro no Scanner</h4>
            <p className="text-gray-600 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                getCameras();
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {/* Scanner Container */}
            <div className="relative">
              <div 
                id="qr-scanner-advanced" 
                ref={scannerRef}
                className="rounded-lg overflow-hidden bg-gray-100 min-h-80"
              />
              
              {/* Scanning Overlay */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    {/* Corner brackets */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-blue-500"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-blue-500"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-blue-500"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-blue-500"></div>
                    
                    {/* Scanning line */}
                    <motion.div
                      animate={{ y: [0, 280, 0] }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Instructions */}
            <div className="mt-6 text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Como usar:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Aponte a câmera para o código de barras</li>
                  <li>• Mantenha o código dentro da área de escaneamento</li>
                  <li>• O código será lido automaticamente</li>
                  {cameras.length > 1 && (
                    <li>• Use o botão ↻ para trocar de câmera</li>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
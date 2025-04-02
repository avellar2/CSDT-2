import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (data: string) => void;
  onError: (error: any) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError }) => {
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scannerRef.current) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        scannerRef.current.id,
        {
          fps: 10,
          qrbox: 250,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText, decodedResult) => {
          onScan(decodedText);
          html5QrcodeScanner.clear();
        },
        (errorMessage) => {
          onError(errorMessage);
        }
      );

      return () => {
        html5QrcodeScanner.clear();
      };
    }
  }, [onScan, onError]);

  return <div id="reader" ref={scannerRef} style={{ width: "100%" }} />;
};

export default BarcodeScanner;
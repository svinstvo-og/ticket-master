import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCode = useRef<any>(null);
  const scannerElementId = "qrScanner";

  useEffect(() => {
    if (!window.Html5Qrcode) {
      setError("QR scanner library not loaded");
      return;
    }

    // Initialize scanner
    html5QrCode.current = new window.Html5Qrcode(scannerElementId);
    startScanner();

    // Cleanup on unmount
    return () => {
      if (html5QrCode.current && isScanning) {
        html5QrCode.current.stop()
          .catch((err: any) => console.error("Error stopping QR scanner:", err));
      }
    };
  }, []);

  const startScanner = async () => {
    if (!html5QrCode.current) return;

    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    try {
      await html5QrCode.current.start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText: string) => onQrCodeSuccess(decodedText),
        () => {}  // onQrCodeError - we don't need to handle scanning errors
      );
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error("Error starting QR scanner:", err);
      setError(`Camera access error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const stopScanner = async () => {
    if (html5QrCode.current && isScanning) {
      try {
        await html5QrCode.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping QR scanner:", err);
      }
    }
  };

  const onQrCodeSuccess = (decodedText: string) => {
    // Handle successful scan
    onScan(decodedText);
    stopScanner();
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="p-4 bg-gray-100 border-b border-gray-200">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">QR Code Scanner</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Point your camera at a QR code formatted as "Building A|Facility 1" to autofill the form.
        </p>
        <div 
          id={scannerElementId} 
          className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center text-white"
        >
          {error ? (
            <div className="text-center p-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400">{error}</p>
            </div>
          ) : !isScanning ? (
            <div className="text-center p-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Initializing camera...</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

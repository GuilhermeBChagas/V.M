
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        const startScanner = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                let cameraId = "";

                if (devices && devices.length > 0) {
                    // Look for back camera in labels (handling Portuguese/English)
                    const backCamera = devices.find(device =>
                        device.label.toLowerCase().includes('back') ||
                        device.label.toLowerCase().includes('traseira') ||
                        device.label.toLowerCase().includes('rear') ||
                        device.label.toLowerCase().includes('environment')
                    );

                    // If not found by label, usually the last one in the list is the main back camera
                    cameraId = backCamera ? backCamera.id : devices[devices.length - 1].id;
                }

                await html5QrCode.start(
                    cameraId ? cameraId : { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        onScan(decodedText);
                    },
                    (errorMessage) => {
                        // ignore failures
                    }
                );
            } catch (err) {
                console.error("Unable to start scanning", err);
            }
        };

        const timeout = setTimeout(startScanner, 100); // Small delay to ensure container is ready

        return () => {
            clearTimeout(timeout);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(err => console.error("Failed to stop scanner", err));
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Camera size={18} className="text-blue-500" />
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Escanear QR Code</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div id="qr-reader" className="overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black"></div>

                    <div className="mt-6 flex flex-col items-center text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed max-w-[250px]">
                            Aponte a câmera para o QR Code do cupom fiscal para extração automática dos dados.
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white text-xs font-black uppercase rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Cancelar Leitura
                    </button>
                </div>
            </div>
        </div>
    );
};

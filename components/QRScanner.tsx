
import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize scanner
        scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scannerRef.current.render(
            (decodedText) => {
                // Success case
                if (scannerRef.current) {
                    scannerRef.current.clear().then(() => {
                        onScan(decodedText);
                    }).catch(err => {
                        console.error("Failed to clear scanner", err);
                        onScan(decodedText);
                    });
                }
            },
            (errorMessage) => {
                // error case is too frequent to log
            }
        );

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
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

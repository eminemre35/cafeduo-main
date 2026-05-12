import React, { useEffect, useRef, useState } from 'react';
import { socketService } from '../lib/socket';

interface ConnectionOverlayProps {
  gameId?: string | number | null;
}

export const ConnectionOverlay: React.FC<ConnectionOverlayProps> = () => {
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [showReconnecting, setShowReconnecting] = useState(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const hasConnectedOnceRef = useRef(socketService.isConnected());

  useEffect(() => {
    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const unsubscribe = socketService.onConnectionChange((connected) => {
      clearReconnectTimer();
      setIsConnected(connected);
      if (connected) {
        hasConnectedOnceRef.current = true;
        setShowReconnecting(false);
        return;
      }

      if (hasConnectedOnceRef.current) {
        // Only block gameplay after a real connected -> disconnected transition.
        reconnectTimerRef.current = window.setTimeout(() => {
          setShowReconnecting(true);
          reconnectTimerRef.current = null;
        }, 4500);
      } else {
        setShowReconnecting(false);
      }
    });
    return () => {
      clearReconnectTimer();
      unsubscribe();
    };
  }, []);

  if (isConnected || !showReconnecting) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/70 ">
      <div className="border-2 border-carbon bg-paper riso-shadow-sm p-6 text-center max-w-sm mx-4 border border-carbon-muted shadow-[0_0_40px_rgba(34,211,238,0.2)]">
        <div className="text-4xl mb-3 animate-pulse">📡</div>
        <h3 className="font-riso-display text-lg text-carbon mb-2 uppercase tracking-wider">
          Bağlantı Kesildi
        </h3>
        <p className="text-sm text-carbon-muted mb-4">
          Sunucuyla bağlantı yeniden kuruluyor. Lütfen bekleyin...
        </p>
        <div className="w-full h-1.5 bg-[#0a1f3a] rounded-full overflow-hidden">
          <div
            className="h-full bg-riso-blue animate-[loading-bar_1.5s_ease-in-out_infinite]"
            style={{ width: '60%', animation: 'loading-bar 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  );
};

// Add loading-bar keyframes to index.css if not present
export const connectionStyles = `
@keyframes loading-bar {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(50%); }
  100% { transform: translateX(200%); }
}
`;

import React, { useEffect, useRef } from 'react';
import { useIncidents } from '../../context/IncidentContext';

interface LiveCivicBackgroundProps {
  className?: string;
}

// Ensure TypeScript recognizes window.THREE and window.VANTA
declare global {
  interface Window {
    THREE?: any;
    VANTA?: {
      GLOBE?: (options: Record<string, any>) => {
        destroy: () => void;
        setOptions?: (options: Record<string, any>) => void;
        resize?: () => void;
      };
      [key: string]: any;
    };
  }
}

export const LiveCivicBackground: React.FC<LiveCivicBackgroundProps> = ({ className = '' }) => {
  const vantaRef = useRef<HTMLDivElement | null>(null);
  const vantaEffectRef = useRef<any>(null);
  const { activePushAlert } = useIncidents();
  const isEmergency = Boolean(activePushAlert && activePushAlert.severity === 'emergency');

  useEffect(() => {
    let isMounted = true;

    // Helper to dynamically load external scripts if not present
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const initVanta = async () => {
      try {
        // Ensure Three.js is loaded
        if (!window.THREE) {
          await loadScript('/three.r134.min.js').catch(() =>
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
          );
        }

        // Ensure Vanta Globe is loaded
        if (!window.VANTA?.GLOBE) {
          await loadScript('/vanta.globe.min.js').catch(() =>
            loadScript('https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.globe.min.js')
          );
        }

        if (!isMounted || !vantaRef.current || !window.VANTA?.GLOBE) return;

        // Destroy previous effect if exists
        if (vantaEffectRef.current) {
          vantaEffectRef.current.destroy();
          vantaEffectRef.current = null;
        }

        // Initialize Vanta Globe: keep grid sheet stagnant while only the globe rotates
        vantaEffectRef.current = window.VANTA.GLOBE({
          el: vantaRef.current,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: isEmergency ? 0xf87171 : 0x94a3b8, // Refined alert rose or soft civic slate
          color2: isEmergency ? 0xfca5a5 : 0x60a5fa, // Alert accent or civic blue accent
          backgroundColor: isEmergency ? 0xfef2f2 : 0xf8fafc, // Crisp off-white / light slate canvas
          size: 1.02,
          stagnantGrid: true
        });

        // Defensive guard: Ensure grid sheet points stay motionless while the globe continues rotating
        if (vantaEffectRef.current && typeof vantaEffectRef.current.onUpdate === 'function') {
          const vantaInstance = vantaEffectRef.current;
          const origOnUpdate = vantaInstance.onUpdate.bind(vantaInstance);
          vantaInstance.onUpdate = function () {
            if (this.points) {
              for (let i = 0; i < this.points.length; i++) {
                this.points[i].position.y = 0;
              }
            }
            origOnUpdate();
            if (this.points) {
              for (let i = 0; i < this.points.length; i++) {
                this.points[i].position.y = 0;
              }
            }
          };
        }
      } catch (err) {
        console.warn('Vanta Globe background initialization note:', err);
      }
    };

    initVanta();

    return () => {
      isMounted = false;
      if (vantaEffectRef.current) {
        try {
          vantaEffectRef.current.destroy();
        } catch {
          // ignore cleanup err
        }
        vantaEffectRef.current = null;
      }
    };
  }, [isEmergency]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 overflow-hidden ${className}`}
    >
      {/* 3D Vanta Globe Canvas Container */}
      <div
        ref={vantaRef}
        id="vanta-globe-bg"
        className="w-full h-full absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Subtle translucent civic dot-grid and vignette for contrast */}
      <div
        className={`absolute inset-0 transition-colors duration-700 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] ${
          isEmergency
            ? 'bg-red-50/50'
            : 'bg-slate-50/60'
        }`}
      />
    </div>
  );
};

import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export type BuilderModule = 'window' | 'door' | 'roof' | 'foundation' | 'house' | 'stairs' | 'floor';

interface ElementBuilderModalProps {
  module: BuilderModule | null;
  onClose: () => void;
}

export const ElementBuilderModal = ({ module, onClose }: ElementBuilderModalProps) => {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [tab, setTab] = useState<'ai' | 'manual'>('manual');
  const [stage, setStage] = useState<'idle' | 'processing' | 'done'>('idle');
  const [dragOver, setDragOver] = useState(false);
  
  // Example dimensions
  const [width, setWidth] = useState(1.0);
  const [height, setHeight] = useState(2.0);
  const [thickness, setThickness] = useState(0.1);

  if (!module) return null;

  // Since we haven't updated t.modules yet, we use a fallback mapping
  const moduleNames = {
    window: "Oyna",
    door: "Eshik",
    roof: "Tom",
    foundation: "Stayashka (Beton)",
    house: "Uy",
    stairs: "Zinalar",
    floor: "Pol"
  } as Record<string, string>;

  const handleCreate = () => {
    setStage('processing');
    setTimeout(() => {
      // Dastur faylni qotib qolmasdan yuklashi uchun mock (soxta) DXF fayl yaratish
      const mockDxf = "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nEOF";
      const blob = new Blob([mockDxf], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}_3d_model.dxf`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStage('done');
    }, 1500);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCreate();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{moduleNames[module]} yaratish</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'manual' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('manual')}
          >
            O'lcham kiritish
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'ai' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('ai')}
          >
            AI - Rasm orqali
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {stage === 'processing' ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Obyekt tayyorlanmoqda...</p>
            </div>
          ) : stage === 'done' ? (
             <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <p className="text-sm font-medium">Muvaffaqiyatli yaratildi!</p>
              <Button onClick={onClose} className="mt-4">Yopish</Button>
            </div>
          ) : (
            <>
              {tab === 'manual' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Eni (m)</label>
                      <input type="number" step="0.1" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Bo'yi (m)</label>
                      <input type="number" step="0.1" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Qalinligi / Chuqurligi (m)</label>
                      <input type="number" step="0.05" value={thickness} onChange={e => setThickness(Number(e.target.value))} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <Button className="w-full mt-4" onClick={handleCreate}>Yaratish</Button>
                </div>
              )}

              {tab === 'ai' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleCreate()} />
                    <div className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium">Bosing yoki rasmni tashlang</p>
                    <p className="text-xs text-muted-foreground mt-1">AI rasmdan o'lchamlarni avtomatik taniydi</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

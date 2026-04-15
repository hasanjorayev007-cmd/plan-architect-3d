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
  
  const [params, setParams] = useState<Record<string, string>>({
    length: '10.0', width: '5.0', height: '3.0',
    thickness: '0.2', wallThickness: '0.3', depth: '0.5',
    frameDepth: '0.1', sillHeight: '0.9',
    pitch: '30', overhang: '0.5',
    stepWidth: '1.2', stepRise: '0.15', stepRun: '0.3', stepCount: '10'
  });

  const handleChange = (key: string, val: string) => {
    setParams(prev => ({ ...prev, [key]: val }));
  };

  if (!module) return null;

  const handleCreate = () => {
    setStage('processing');
    setTimeout(() => {
      const w = parseFloat(params.width || params.length || params.stepWidth || '1');
      const d = parseFloat(params.thickness || params.depth || params.wallThickness || params.frameDepth || '1');
      const h = parseFloat(params.height || params.stepRise || '1');

      // Yalango'ch (faqat ENTITIES bo'lgan) DXF. Windows muhiti (AutoCAD) uchun mutlaqo \r\n shart
      let currentDxf = "0\r\nSECTION\r\n2\r\nENTITIES\r\n";
      
      const addLine = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
        currentDxf += `0\r\nLINE\r\n8\r\n0\r\n10\r\n${x1}\r\n20\r\n${y1}\r\n30\r\n${z1}\r\n11\r\n${x2}\r\n21\r\n${y2}\r\n31\r\n${z2}\r\n`;
      };

      // Pastki to'rtburchak
      addLine(0, 0, 0, w, 0, 0);
      addLine(w, 0, 0, w, d, 0);
      addLine(w, d, 0, 0, d, 0);
      addLine(0, d, 0, 0, 0, 0);
      
      // Yuqori to'rtburchak
      addLine(0, 0, h, w, 0, h);
      addLine(w, 0, h, w, d, h);
      addLine(w, d, h, 0, d, h);
      addLine(0, d, h, 0, 0, h);

      // Ustunlar (Vertical)
      addLine(0, 0, 0, 0, 0, h);
      addLine(w, 0, 0, w, 0, h);
      addLine(w, d, 0, w, d, h);
      addLine(0, d, 0, 0, d, h);

      currentDxf += "0\r\nENDSEC\r\n0\r\nEOF\r\n";

      const blob = new Blob([currentDxf], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}_3d_model_${w}x${d}x${h}.dxf`;
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
  }, [params]);

  const renderManualFields = () => {
    const fieldsMap: Record<BuilderModule, string[]> = {
      house: ['length', 'width', 'height', 'wallThickness'],
      foundation: ['length', 'width', 'depth'],
      door: ['width', 'height', 'frameDepth'],
      window: ['width', 'height', 'sillHeight'],
      roof: ['length', 'width', 'pitch', 'overhang'],
      stairs: ['stepWidth', 'stepRise', 'stepRun', 'stepCount'],
      floor: ['length', 'width', 'thickness']
    };

    const activeFields = fieldsMap[module] || [];

    return (
      <div className="grid grid-cols-2 gap-4">
        {activeFields.map((fieldKey) => (
          <div key={fieldKey} className={`space-y-2 ${activeFields.length % 2 !== 0 && fieldKey === activeFields[activeFields.length - 1] ? 'col-span-2' : ''}`}>
            <label className="text-xs font-medium text-muted-foreground">
              {t.modal[fieldKey as keyof typeof t.modal] || fieldKey}
            </label>
            <input 
              type="number" 
              step="0.01" 
              value={params[fieldKey]} 
              onChange={e => handleChange(fieldKey, e.target.value)} 
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
              placeholder="0.0"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{t.modules[module].title} {t.modal.createTitle}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
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
            {t.modal.manual}
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'ai' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('ai')}
          >
            {t.modal.ai}
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {stage === 'processing' ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{t.modal.processing}</p>
            </div>
          ) : stage === 'done' ? (
             <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center animate-in zoom-in">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <p className="text-sm font-medium">{t.modal.success}</p>
              <Button onClick={onClose} className="mt-4 w-32">{t.modal.close}</Button>
            </div>
          ) : (
            <>
              {tab === 'manual' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  {renderManualFields()}
                  <Button className="w-full mt-4" onClick={handleCreate}>{t.modal.submit}</Button>
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
                      dragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleCreate();
                      }
                    }} />
                    <div className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium transition-colors">{t.modal.dropMain}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.modal.dropSub}</p>
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

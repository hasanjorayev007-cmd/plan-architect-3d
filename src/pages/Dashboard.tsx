import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Stage = 'idle' | 'uploading' | 'detecting' | 'generating' | 'exporting' | 'done' | 'error';

const Dashboard = () => {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [dxfBlob, setDxfBlob] = useState<Blob | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [wallHeight, setWallHeight] = useState(2.8);
  const [wallThickness, setWallThickness] = useState(0.2);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      setStage('uploading');
      setErrorMsg('');
      setDxfBlob(null);

      try {
        await new Promise(r => setTimeout(r, 300));
        setStage('detecting');

        const { data, error } = await supabase.functions.invoke('generate-3d', {
          body: {
            image: base64,
            wallHeight,
            wallThickness,
          },
        });

        if (error) throw error;

        setStage('generating');
        await new Promise(r => setTimeout(r, 500));
        setStage('exporting');
        await new Promise(r => setTimeout(r, 300));

        const dxfContent = data.dxf;
        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        setDxfBlob(blob);
        setStage('done');
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || t.dashboard.error);
        setStage('error');
      }
    };
    reader.readAsDataURL(file);
  }, [wallHeight, wallThickness, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDownload = () => {
    if (!dxfBlob) return;
    const url = URL.createObjectURL(dxfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floorplan_3d.dxf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStage('idle');
    setPreview(null);
    setDxfBlob(null);
    setErrorMsg('');
  };

  const stageLabels: Record<string, string> = {
    uploading: t.dashboard.processing,
    detecting: t.dashboard.detecting,
    generating: t.dashboard.generating,
    exporting: t.dashboard.exporting,
  };

  const isProcessing = ['uploading', 'detecting', 'generating', 'exporting'].includes(stage);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5">
              <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">FloorPlan3D</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground text-xs">
            {t.dashboard.logout}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {stage === 'idle' && !preview && (
            <>
              {/* Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t.dashboard.wallHeight}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={wallHeight}
                    onChange={e => setWallHeight(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t.dashboard.wallThickness}</label>
                  <input
                    type="number"
                    step="0.05"
                    value={wallThickness}
                    onChange={e => setWallThickness(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono"
                  />
                </div>
              </div>

              {/* Upload Area */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary bg-primary/5 glow-primary'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.dashboard.dragDrop}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.dashboard.orClick}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.dashboard.uploadHint}</p>
                </div>
              </div>
            </>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="text-center space-y-6">
              {preview && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={preview} alt="Floor plan" className="w-full opacity-60" />
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="h-1 w-full absolute top-0 overflow-hidden">
                      <div className="h-full w-1/3 bg-primary animate-scan-line" />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">{stageLabels[stage]}</span>
              </div>
            </div>
          )}

          {/* Done */}
          {stage === 'done' && (
            <div className="text-center space-y-6">
              {preview && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={preview} alt="Floor plan" className="w-full" />
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span className="text-sm font-medium">{t.dashboard.success}</span>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleDownload} className="flex-1 glow-primary-strong">
                  {t.dashboard.download}
                </Button>
                <Button variant="outline" onClick={reset}>
                  {t.dashboard.newProject}
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-destructive">{errorMsg || t.dashboard.error}</p>
              <Button variant="outline" onClick={reset}>
                {t.dashboard.newProject}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

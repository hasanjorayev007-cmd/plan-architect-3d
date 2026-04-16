import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { CADParser } from '@/lib/CADParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BuilderModule = 'window' | 'door' | 'roof' | 'foundation' | 'house' | 'stairs' | 'floor' | 'wall' | 'path' | 'prompt';

type PathStepType = 'line' | 'turn_left' | 'turn_right' | 'door' | 'window' | 'arc';
interface PathStep {
  id: string;
  type: PathStepType;
  val1: string; // length for line, angle for turn, gapW for door/win, radius for arc
  val2: string; // height of gap for door/win, arcAngle for arc
  val3: string; // sillHeight for window
}

interface ElementBuilderModalProps {
  module: BuilderModule | null;
  onClose: () => void;
}

export const ElementBuilderModal = ({ module, onClose }: ElementBuilderModalProps) => {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [tab, setTab] = useState<'ai' | 'manual'>('manual');
  const [stage, setStage] = useState<'idle' | 'processing' | 'done' | 'aiResults'>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  
  const [wallType, setWallType] = useState<'straight' | 'angled' | 'curved'>('straight');
  const [partsCount, setPartsCount] = useState<'1' | '2'>('1');
  const [hasGap, setHasGap] = useState<'no' | 'yes'>('no');
  const [promptInput, setPromptInput] = useState('START 0 0\nWALL RIGHT 500\nDOOR 200 90\nWALL DOWN 400\nWINDOW 150 120\nWALL LEFT 500\nWALL UP 400');
  
  // Path Builder State - Updated to Centimeters
  const [pathSteps, setPathSteps] = useState<PathStep[]>([
    { id: '1', type: 'line', val1: '700', val2: '', val3: '' }
  ]);
  
  const [params, setParams] = useState<Record<string, string>>({
    length: '1000', width: '500', height: '300',
    thickness: '20', wallThickness: '30', depth: '50',
    frameDepth: '10', sillHeight: '90',
    pitch: '30', overhang: '50',
    stepWidth: '120', stepRise: '15', stepRun: '30', stepCount: '10',
    startHeight: '300', endHeight: '450', radius: '500', arcAngle: '180',
    length1: '600', length2: '800',
    gapStart: '200', gapWidth: '100', gapHeight: '210',
    startX: '0', startY: '0'
  });

  const handleChange = (key: string, val: string) => setParams(prev => ({ ...prev, [key]: val }));

  const updatePathStep = (id: string, key: keyof PathStep, val: string) => {
    setPathSteps(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s));
  };
  const addPathStep = (type: PathStepType) => {
    setPathSteps(prev => [...prev, { id: Math.random().toString(), type, val1: type.startsWith('turn') ? '90' : '200', val2: type==='window' ? '150' : '210', val3: '90' }]);
  };
  const removePathStep = (id: string) => {
    setPathSteps(prev => prev.filter(s => s.id !== id));
  };

  if (!module) return null;

  const performAIAnalysis = async (file: File) => {
    if (!geminiKey) {
      toast.error("Iltimos, avval Gemini API Keyni kiriting!");
      setTab('ai');
      return;
    }

    setStage('processing');
    localStorage.setItem('gemini_api_key', geminiKey);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64Image = await base64Promise;
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

      const prompt = `You are a specialist architectural parser. 
Analyze the provided 2D floor plan image. 
Extract all outer walls, inner walls, doors, and windows.
Dimensions in the image are likely in MM, but output them in CENTIMETERS (e.g. 6000mm -> 600).
Produce a script using ONLY the following commands:
THICK value (set wall thickness, default 30)
START X Y (set start point)
WALL DIRECTION LENGTH (DIRECTION: UP, DOWN, LEFT, RIGHT. LENGTH: number in cm)
DOOR offset width (add door to the last wall)
WINDOW offset width height sill (add window to the last wall)
ARC LEFT/RIGHT angle radius (add an arc)
TURN LEFT/RIGHT angle (turn world orientation)

Guidelines:
1. Start at a logical corner (0 0).
2. Trace the perimeter first.
3. Use START to jump to interior walls.
4. Output ONLY the commands. No extra text, no markdown code blocks.`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanScript = geminiResponse.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

      if (cleanScript) {
        setPromptInput(cleanScript);
        setTab('manual');
        setTimeout(() => {
          setStage('idle');
          toast.success("AI chizmani tahlil qildi!");
        }, 500);
      } else {
        throw new Error("AI dan natija kelmadi.");
      }
    } catch (err: any) {
      console.error('AI Error:', err);
      toast.error("AI tahlilida xatolik: " + err.message);
      setStage('idle');
    }
  };

  const handleCreate = () => {
    setStage('processing');
    setTimeout(() => {
      const p = (k: string, fall: number) => parseFloat(params[k]) || fall;

      let currentDxf = "0\r\nSECTION\r\n2\r\nHEADER\r\n9\r\n$ACADVER\r\n1\r\nAC1009\r\n0\r\nENDSEC\r\n0\r\nSECTION\r\n2\r\nENTITIES\r\n";
      const formatNum = (num: number) => num.toFixed(2);
      const addLine = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
        currentDxf += `0\r\nLINE\r\n8\r\n0\r\n10\r\n${formatNum(x1)}\r\n20\r\n${formatNum(y1)}\r\n30\r\n${formatNum(z1)}\r\n11\r\n${formatNum(x2)}\r\n21\r\n${formatNum(y2)}\r\n31\r\n${formatNum(z2)}\r\n`;
      };

      const drawBox = (px: number, py: number, pz: number, wx: number, wy: number, wz: number) => {
        addLine(px, py, pz, px+wx, py, pz); addLine(px+wx, py, pz, px+wx, py+wy, pz);
        addLine(px+wx, py+wy, pz, px, py+wy, pz); addLine(px, py+wy, pz, px, py, pz);
        addLine(px, py, pz+wz, px+wx, py, pz+wz); addLine(px+wx, py, pz+wz, px+wx, py+wy, pz+wz);
        addLine(px+wx, py+wy, pz+wz, px, py+wy, pz+wz); addLine(px, py+wy, pz+wz, px, py, pz+wz);
        addLine(px, py, pz, px, py, pz+wz); addLine(px+wx, py, pz, px+wx, py, pz+wz);
        addLine(px+wx, py+wy, pz, px+wx, py+wy, pz+wz); addLine(px, py+wy, pz, px, py+wy, pz+wz);
      };

      const drawRotatedBox = (sx: number, sy: number, sz: number, angleDeg: number, len: number, thick: number, h: number) => {
        if (len <= 0 || h <= 0) return;
        const rad = angleDeg * Math.PI / 180;
        const dx = Math.cos(rad), dy = Math.sin(rad);
        const nx = -Math.sin(rad), ny = Math.cos(rad); 
        
        const p1 = [sx, sy];
        const p2 = [sx + len*dx, sy + len*dy];
        const p3 = [p2[0] + thick*nx, p2[1] + thick*ny];
        const p4 = [p1[0] + thick*nx, p1[1] + thick*ny];

        addLine(p1[0], p1[1], sz, p2[0], p2[1], sz); addLine(p2[0], p2[1], sz, p3[0], p3[1], sz);
        addLine(p3[0], p3[1], sz, p4[0], p4[1], sz); addLine(p4[0], p4[1], sz, p1[0], p1[1], sz);
        addLine(p1[0], p1[1], sz+h, p2[0], p2[1], sz+h); addLine(p2[0], p2[1], sz+h, p3[0], p3[1], sz+h);
        addLine(p3[0], p3[1], sz+h, p4[0], p4[1], sz+h); addLine(p4[0], p4[1], sz+h, p1[0], p1[1], sz+h);
        addLine(p1[0], p1[1], sz, p1[0], p1[1], sz+h); addLine(p2[0], p2[1], sz, p2[0], p2[1], sz+h);
        addLine(p3[0], p3[1], sz, p3[0], p3[1], sz+h); addLine(p4[0], p4[1], sz, p4[0], p4[1], sz+h);
      };

      const drawWallY = (py: number, len: number, w: number, h: number) => {
        if (hasGap === 'yes') {
          const gS = p('gapStart', 200), gW = p('gapWidth', 100), gH = p('gapHeight', 210);
          drawBox(0, py, 0, w, gS, h);
          drawBox(0, py + gS + gW, 0, w, len - gS - gW, h);
          drawBox(0, py + gS, gH, w, gW, h - gH);
        } else drawBox(0, py, 0, w, len, h);
      };

      const drawWallX = (px: number, len: number, w: number, h: number) => {
        if (hasGap === 'yes') {
          const gS = p('gapStart', 200), gW = p('gapWidth', 100), gH = p('gapHeight', 210);
          drawBox(px, 0, 0, gS, w, h);
          drawBox(px + gS + gW, 0, 0, len - gS - gW, w, h);
          drawBox(px + gS, 0, gH, gW, w, h - gH);
        } else drawBox(px, 0, 0, len, w, h);
      };

      if (module === 'prompt') {
        const parser = new CADParser();
        const result = parser.parse(promptInput);
        if (result.success) {
          result.walls.forEach(w => {
            // Actually draw a box between two points
            const dx = w.endX - w.startX;
            const dy = w.endY - w.startY;
            const len = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            if (len > 0.1) {
              drawRotatedBox(w.startX, w.startY, 0, angle, len, w.thickness, 300);
            }

            w.openings.forEach(op => {
              const rad = angle * Math.PI / 180;
              const ux = Math.cos(rad);
              const uy = Math.sin(rad);
              const osX = w.startX + ux * op.offset;
              const osY = w.startY + uy * op.offset;
              
              if (op.type === 'door') {
                drawRotatedBox(osX, osY, 210, angle, op.width, w.thickness, 300 - 210);
              } else {
                const wh = op.height || 150;
                const sh = op.sillHeight || 90;
                drawRotatedBox(osX, osY, 0, angle, op.width, w.thickness, sh);
                drawRotatedBox(osX, osY, sh + wh, angle, op.width, w.thickness, 300 - (sh + wh));
              }
            });
          });
        }
      }
      else if (module === 'path') {
        const wt = p('wallThickness', 30), h = p('height', 300);
        let currX = p('startX', 0), currY = p('startY', 0), currAngle = 0; 

        pathSteps.forEach(step => {
           if (step.type === 'line') {
             const dist = parseFloat(step.val1) || 0;
             drawRotatedBox(currX, currY, 0, currAngle, dist, wt, h);
             currX += dist * Math.cos(currAngle * Math.PI / 180);
             currY += dist * Math.sin(currAngle * Math.PI / 180);
           } 
           else if (step.type === 'door') {
             const dist = parseFloat(step.val1) || 0;
             const dHeight = 210; 
             drawRotatedBox(currX, currY, dHeight, currAngle, dist, wt, h - dHeight);
             currX += dist * Math.cos(currAngle * Math.PI / 180);
             currY += dist * Math.sin(currAngle * Math.PI / 180);
           }
           else if (step.type === 'window') {
             const dist = parseFloat(step.val1) || 0;
             const winH = parseFloat(step.val2) || 150;
             const sillH = parseFloat(step.val3) || 90;
             drawRotatedBox(currX, currY, 0, currAngle, dist, wt, sillH);
             drawRotatedBox(currX, currY, sillH + winH, currAngle, dist, wt, h - (sillH + winH));
             currX += dist * Math.cos(currAngle * Math.PI / 180);
             currY += dist * Math.sin(currAngle * Math.PI / 180);
           }
           else if (step.type === 'turn_left') {
             const angleDelta = parseFloat(step.val1) || 0;
             currAngle += angleDelta;
           }
           else if (step.type === 'turn_right') {
             const angleDelta = parseFloat(step.val1) || 0;
             currAngle -= angleDelta; 
           }
           else if (step.type === 'arc') {
             const radius = parseFloat(step.val1) || 200;
             const sweepAngle = parseFloat(step.val2) || 90;
             const segments = 12;
             const dTh = sweepAngle / segments;
             const arcLen = (Math.abs(sweepAngle) * Math.PI / 180) * radius;
             const dl = arcLen / segments;
             
             for(let i=0; i<segments; i++){
               currAngle += dTh;
               drawRotatedBox(currX, currY, 0, currAngle, dl, wt, h);
               currX += dl * Math.cos(currAngle * Math.PI / 180);
               currY += dl * Math.sin(currAngle * Math.PI / 180);
             }
           }
        });
      } 
      else if (module === 'foundation') {
        drawBox(0, 0, -p('depth', 50), p('length', 1000), p('width', 500), p('depth', 50));
      } else if (module === 'floor') {
        drawBox(0, 0, 0, p('length', 1000), p('width', 500), p('thickness', 20));
      } else if (module === 'house') {
        const l = p('length', 1000), w = p('width', 500), h = p('height', 300), wt = p('wallThickness', 30);
        if (hasGap === 'yes') {
           const gS = p('gapStart', 200), gW = p('gapWidth', 100), gH = p('gapHeight', 210);
           drawBox(0, 0, 0, wt, w, h); drawBox(l - wt, 0, 0, wt, w, h); drawBox(wt, w - wt, 0, l - 2*wt, wt, h); 
           drawBox(wt, 0, 0, gS, wt, h); drawBox(wt + gS + gW, 0, 0, l - 2*wt - (gS + gW), wt, h); drawBox(wt + gS, 0, gH, gW, wt, h - gH);
        } else {
          drawBox(0, 0, 0, wt, w, h); drawBox(l - wt, 0, 0, wt, w, h); drawBox(wt, 0, 0, l - 2*wt, wt, h); drawBox(wt, w - wt, 0, l - 2*wt, wt, h);
        }
      } else if (module === 'door') {
        const w = p('width', 100), h = p('height', 200), fd = p('frameDepth', 10), pt = 5;
        drawBox(0, 0, 0, pt, fd, h); drawBox(w - pt, 0, 0, pt, fd, h);
        drawBox(pt, 0, h - pt, w - 2*pt, fd, pt); drawBox(pt, fd/2 - 2, 0, w - 2*pt, 4, h - pt);
      } else if (module === 'window') {
        const w = p('width', 150), h = p('height', 150), sh = p('sillHeight', 90), pt = 5, fd = 10;
        drawBox(0, 0, sh, pt, fd, h); drawBox(w - pt, 0, sh, pt, fd, h);
        drawBox(pt, 0, sh, w - 2*pt, fd, pt); drawBox(pt, 0, sh + h - pt, w - 2*pt, fd, pt);
        drawBox(w/2 - 2, 3, sh + pt, 4, 4, h - 2*pt); drawBox(pt, 3, sh + h/2 - 2, w - 2*pt, 4, 4);
      } else if (module === 'roof') {
        const l = p('length', 1000), w = p('width', 500), pitch = p('pitch', 30), oh = p('overhang', 50);
        const rH = (w/2 + oh) * Math.tan(pitch * Math.PI / 180);
        addLine(-oh, -oh, 0, l+oh, -oh, 0); addLine(l+oh, -oh, 0, l+oh, w+oh, 0);
        addLine(l+oh, w+oh, 0, -oh, w+oh, 0); addLine(-oh, w+oh, 0, -oh, -oh, 0);
        addLine(-oh, w/2, rH, l+oh, w/2, rH);
        addLine(-oh, -oh, 0, -oh, w/2, rH); addLine(-oh, w+oh, 0, -oh, w/2, rH);
        addLine(l+oh, -oh, 0, l+oh, w/2, rH); addLine(l+oh, w+oh, 0, l+oh, w/2, rH);
      } else if (module === 'stairs') {
        const w = p('stepWidth', 120), sR = p('stepRise', 15), sRun = p('stepRun', 30), count = parseInt(params.stepCount) || 10;
        for (let i = 0; i < count; i++) drawBox(i * sRun, 0, 0, sRun, w, i * sR + sR);
      } else if (module === 'wall') {
        const h = p('height', 300), wt = p('wallThickness', 30);
        if (wallType === 'straight') {
           if (partsCount === '1') drawWallX(0, p('length', 500), wt, h);
           else {
             const L1 = p('length1', 500), L2 = p('length2', 400);
             drawWallX(0, L1, wt, h); drawWallY(wt, L2 - wt, wt, h); 
           }
        } else if (wallType === 'angled') {
          const l = p('length', 500), sh = p('startHeight', 200), eh = p('endHeight', 400);
          addLine(0,0,0, l,0,0); addLine(l,0,0, l,wt,0); addLine(l,wt,0, 0,wt,0); addLine(0,wt,0, 0,0,0);
          addLine(0,0,sh, l,0,eh); addLine(l,0,eh, l,wt,eh); addLine(l,wt,eh, 0,wt,sh); addLine(0,wt,sh, 0,0,sh);
          addLine(0,0,0, 0,0,sh); addLine(l,0,0, l,0,eh); addLine(l,wt,0, l,wt,eh); addLine(0,wt,0, 0,wt,sh);
        } else if (wallType === 'curved') {
          const R = p('radius', 500), angle = p('arcAngle', 90), segments = 12;
          const innerR = R - (wt/2), outerR = R + (wt/2);
          for (let i = 0; i < segments; i++) {
            const sA = (i * angle / segments) * Math.PI / 180, eA = ((i+1) * angle / segments) * Math.PI / 180;
            const pI1X = innerR * Math.cos(sA), pI1Y = innerR * Math.sin(sA); const pI2X = innerR * Math.cos(eA), pI2Y = innerR * Math.sin(eA);
            const pO1X = outerR * Math.cos(sA), pO1Y = outerR * Math.sin(sA); const pO2X = outerR * Math.cos(eA), pO2Y = outerR * Math.sin(eA);
            addLine(pI1X, pI1Y, 0, pI2X, pI2Y, 0); addLine(pO1X, pO1Y, 0, pO2X, pO2Y, 0);
            addLine(pI1X, pI1Y, h, pI2X, pI2Y, h); addLine(pO1X, pO1Y, h, pO2X, pO2Y, h);
            addLine(pI1X, pI1Y, 0, pI1X, pI1Y, h); addLine(pO1X, pO1Y, 0, pO1X, pO1Y, h);
            if (i === 0) { addLine(pI1X, pI1Y, 0, pO1X, pO1Y, 0); addLine(pI1X, pI1Y, h, pO1X, pO1Y, h); }
            if (i === segments - 1) {
              addLine(pI2X, pI2Y, 0, pO2X, pO2Y, 0); addLine(pI2X, pI2Y, h, pO2X, pO2Y, h);
              addLine(pI2X, pI2Y, 0, pI2X, pI2Y, h); addLine(pO2X, pO2Y, 0, pO2X, pO2Y, h);
            }
          }
        }
      }

      currentDxf += "0\r\nENDSEC\r\n0\r\nEOF\r\n";
      const blob = new Blob([currentDxf], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}_3d_model_${Date.now()}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStage('done');
    }, 1500);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) performAIAnalysis(e.dataTransfer.files[0]);
  }, []);

  const renderPathBuilderFields = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-border">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{(t.modal as any).startX || "Start X"}</label>
            <input type="number" step="1" value={params.startX} onChange={e => handleChange('startX', e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{(t.modal as any).startY || "Start Y"}</label>
            <input type="number" step="1" value={params.startY} onChange={e => handleChange('startY', e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t.modal.height}</label>
            <input type="number" step="1" value={params.height} onChange={e => handleChange('height', e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t.modal.wallThickness}</label>
            <input type="number" step="1" value={params.wallThickness} onChange={e => handleChange('wallThickness', e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
          </div>
        </div>

        <div className="space-y-4">
          {pathSteps.map((step, index) => (
            <div key={step.id} className="relative flex items-center bg-secondary/50 p-4 rounded-xl border border-secondary gap-4 group">
               <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</div>
               
               <div className="flex-1 space-y-3">
                 <div className="font-medium text-sm text-foreground">
                   {step.type === 'line' ? t.modal.stepTypeLine :
                    step.type === 'door' ? t.modal.stepTypeDoor :
                    step.type === 'window' ? t.modal.stepTypeWindow :
                    step.type === 'turn_left' ? t.modal.stepTypeTurnLeft :
                    step.type === 'turn_right' ? t.modal.stepTypeTurnRight : t.modal.stepTypeArc}
                 </div>
                 
                 <div className="flex gap-3">
                    {step.type === 'line' && (
                      <input type="number" step="1" value={step.val1} onChange={e => updatePathStep(step.id, 'val1', e.target.value)} placeholder={t.modal.length} className="w-full text-xs p-2 rounded-md bg-background border border-border" />
                    )}
                    {step.type === 'door' && (
                      <input type="number" step="1" value={step.val1} onChange={e => updatePathStep(step.id, 'val1', e.target.value)} placeholder="Tashlab o'tish masofasi (cm)" className="w-full text-xs p-2 rounded-md bg-background border border-border" title="Qancha masofa tashlab o'tish (cm)" />
                    )}
                    {step.type === 'window' && (
                      <>
                        <input type="number" step="1" value={step.val1} onChange={e => updatePathStep(step.id, 'val1', e.target.value)} placeholder={(t.modal as any).windowWidth || 'Eni'} className="w-full text-xs p-2 rounded-md bg-background border border-border" title="Eni" />
                        <input type="number" step="1" value={step.val2} onChange={e => updatePathStep(step.id, 'val2', e.target.value)} placeholder={(t.modal as any).windowHeight || 'Bal.'} className="w-full text-xs p-2 rounded-md bg-background border border-border" title="Bal." />
                        <input type="number" step="1" value={step.val3} onChange={e => updatePathStep(step.id, 'val3', e.target.value)} placeholder={(t.modal as any).sillHeight || 'Yerdan bal.'} className="w-full text-xs p-2 rounded-md bg-background border border-border" title="Yerdan bal." />
                      </>
                    )}
                    {(step.type === 'turn_left' || step.type === 'turn_right') && (
                      <input type="number" step="1" value={step.val1} onChange={e => updatePathStep(step.id, 'val1', e.target.value)} placeholder={t.modal.turnAngle} className="w-full text-xs p-2 rounded-md bg-background border border-border" />
                    )}
                    {step.type === 'arc' && (
                      <>
                        <input type="number" step="1" value={step.val1} onChange={e => updatePathStep(step.id, 'val1', e.target.value)} placeholder={t.modal.radius} className="w-full text-xs p-2 rounded-md bg-background border border-border" />
                        <input type="number" step="1" value={step.val2} onChange={e => updatePathStep(step.id, 'val2', e.target.value)} placeholder={t.modal.arcAngle} className="w-full text-xs p-2 rounded-md bg-background border border-border" />
                      </>
                    )}
                 </div>
               </div>

               <button onClick={() => removePathStep(step.id)} className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 X
               </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => addPathStep('line')} className="text-xs">+ Devor chizish</Button>
            <Button variant="outline" size="sm" onClick={() => addPathStep('door')} className="text-xs">+ Ochiq joy tashlash</Button>
            <Button variant="outline" size="sm" onClick={() => addPathStep('window')} className="text-xs">+ Oyna Uzish</Button>
            <Button variant="outline" size="sm" onClick={() => addPathStep('turn_left')} className="text-xs">+ Chapga burilish</Button>
            <Button variant="outline" size="sm" onClick={() => addPathStep('turn_right')} className="text-xs">+ O'ngga burilish</Button>
            <Button variant="outline" size="sm" onClick={() => addPathStep('arc')} className="text-xs">+ Yoy egish</Button>
        </div>
      </div>
    );
  };

  const renderPromptFields = () => {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
          Ushbu maydonga AI (Claude/GPT) tomonidan tayyorlangan buyruqlarni tashlang. Har bir buyruq yangi qatorda bo'lishi kerak.
        </p>
        <textarea 
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          className="w-full h-64 bg-secondary font-monospace text-sm p-4 rounded-xl border border-border focus:ring-1 focus:ring-primary outline-none transition-all"
          placeholder="THICK 30&#10;START 0 0&#10;WALL RIGHT 500..."
        />
      </div>
    );
  };

  const renderManualFields = () => {
    if (module === 'path') return renderPathBuilderFields();
    if (module === 'prompt') return renderPromptFields();

    const fieldsMap: Record<BuilderModule, string[]> = {
      house: ['length', 'width', 'height', 'wallThickness'],
      foundation: ['length', 'width', 'depth'],
      door: ['width', 'height', 'frameDepth'],
      window: ['width', 'height', 'sillHeight'],
      roof: ['length', 'width', 'pitch', 'overhang'],
      stairs: ['stepWidth', 'stepRise', 'stepRun', 'stepCount'],
      floor: ['length', 'width', 'thickness'],
      wall: [], path: []
    };

    let activeFields = fieldsMap[module] || [];
    if (module === 'wall') {
      if (wallType === 'straight') activeFields = partsCount === '1' ? ['length', 'height', 'wallThickness'] : ['length1', 'length2', 'height', 'wallThickness'];
      else if (wallType === 'angled') activeFields = ['length', 'startHeight', 'endHeight', 'wallThickness'];
      else if (wallType === 'curved') activeFields = ['radius', 'arcAngle', 'height', 'wallThickness'];
    }
    if ((module === 'wall' && wallType === 'straight') || module === 'house') {
      if (hasGap === 'yes') activeFields = [...activeFields, 'gapStart', 'gapWidth', 'gapHeight'];
    }

    return (
      <div className="space-y-4">
        {module === 'wall' && (
          <div className="space-y-4 pb-4 border-b border-border">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t.modal.wallType}</label>
              <div className="flex bg-secondary p-1 rounded-lg">
                {(['straight', 'angled', 'curved'] as const).map(type => (
                  <button key={type} onClick={() => setWallType(type)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${wallType === type ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {t.modal[type]}
                  </button>
                ))}
              </div>
            </div>
            {wallType === 'straight' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t.modal.partsCount}</label>
                <div className="flex bg-secondary p-1 rounded-lg">
                  {(['1', '2'] as const).map(pC => (
                    <button key={pC} onClick={() => setPartsCount(pC)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${partsCount === pC ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {pC === '1' ? t.modal.part1 : t.modal.part2}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {((module === 'wall' && wallType === 'straight') || module === 'house') && (
           <div className="space-y-2 pb-2 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground">{t.modal.hasGap}</label>
              <div className="flex bg-secondary p-1 rounded-lg">
                {(['no', 'yes'] as const).map(hG => (
                  <button key={hG} onClick={() => setHasGap(hG)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${hasGap === hG ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {hG === 'no' ? t.modal.gapNo : t.modal.gapYes}
                  </button>
                ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {activeFields.map((fieldKey) => (
            <div key={fieldKey} className={`space-y-2 ${activeFields.length % 2 !== 0 && fieldKey === activeFields[activeFields.length - 1] ? 'col-span-2' : ''}`}>
              <label className="text-xs font-medium text-muted-foreground">
                {(t.modal as unknown as Record<string, string>)[fieldKey] || fieldKey}
              </label>
              <input type="number" step="1" value={params[fieldKey] || ''} onChange={e => handleChange(fieldKey, e.target.value)} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-card w-full ${module === 'path' ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl shadow-xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10 shrink-0">
          <h2 className="text-lg font-semibold">{t.modules[module].title} {t.modal.createTitle}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">X</button>
        </div>

        {/* Tabs */}
        {(
          <div className="flex border-b border-border shrink-0">
            <button className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'manual' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setTab('manual')}>
              {t.modal.manual}
            </button>
            <button className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'ai' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setTab('ai')}>
              {t.modal.ai}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {stage === 'processing' ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{t.modal.processing}</p>
            </div>
          ) : stage === 'aiResults' ? (
            <div className="py-8 flex flex-col items-center space-y-5 animate-in slide-in-from-bottom-2">
               <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
              <p className="text-sm font-medium text-center px-4">{t.modal.aiResultText}</p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={() => { setStage('idle'); setTab('manual'); }}>{t.modal.aiEditBtn}</Button>
                <Button className="flex-1" onClick={handleCreate}>{t.modal.aiDownloadBtn}</Button>
              </div>
            </div>
          ) : stage === 'done' ? (
             <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center animate-in zoom-in">✓</div>
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
                  <div className="space-y-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <label className="text-xs font-bold text-primary uppercase tracking-wider">Google Gemini API Key</label>
                    <input 
                      type="password" 
                      value={geminiKey} 
                      onChange={e => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..." 
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                    <p className="text-[10px] text-muted-foreground">Kalitingiz faqat brauzeringizda saqlanadi.</p>
                  </div>
                  
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()} className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'}`}>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files && e.target.files.length > 0) performAIAnalysis(e.target.files[0]); }} />
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

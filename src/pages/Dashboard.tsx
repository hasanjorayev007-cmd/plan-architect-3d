import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { ElementBuilderModal, BuilderModule } from '@/components/ElementBuilderModal';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { logout } = useAuth();
  const { t } = useLanguage();
  
  const [activeModule, setActiveModule] = useState<BuilderModule | null>(null);

  const modules: { id: BuilderModule; title: string; desc: string; icon: string }[] = [
    { id: 'house', title: t.modules.house.title, desc: t.modules.house.desc, icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    { id: 'wall', title: t.modules.wall.title, desc: t.modules.wall.desc, icon: "M4 6h16M4 12h16M4 18h16M8 6v6M16 12v6M12 18v6" },
    { id: 'foundation', title: t.modules.foundation.title, desc: t.modules.foundation.desc, icon: "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z" },
    { id: 'door', title: t.modules.door.title, desc: t.modules.door.desc, icon: "M14 18V6a2 2 0 0 0-2-2H4v16h16V8h-6" },
    { id: 'window', title: t.modules.window.title, desc: t.modules.window.desc, icon: "M3 3h18v18H3z M12 3v18 M3 12h18" },
    { id: 'roof', title: t.modules.roof.title, desc: t.modules.roof.desc, icon: "M2 10l10-8 10 8v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" },
    { id: 'stairs', title: t.modules.stairs.title, desc: t.modules.stairs.desc, icon: "M14 14v6h4v-10h-4M6 20h4v-6H6M10 14h4V8h-4" },
    { id: 'floor', title: t.modules.floor.title, desc: t.modules.floor.desc, icon: "M2 16h20 M2 20h20 M5 12l7 5 l7-5" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner shadow-primary/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5">
              <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">{t.dashboard.title}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{t.dashboard.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button variant="outline" size="sm" onClick={logout} className="text-muted-foreground text-xs hover:text-destructive transition-colors">
            {t.dashboard.logout}
          </Button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight mb-2">{t.dashboard.title}</h2>
          <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {modules.map(mod => (
            <div 
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className="group relative bg-card border border-border rounded-2xl p-6 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
              
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground">
                  <path d={mod.icon} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{mod.title}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <ElementBuilderModal key={activeModule || 'empty'} module={activeModule} onClose={() => setActiveModule(null)} />
    </div>
  );
};

export default Dashboard;

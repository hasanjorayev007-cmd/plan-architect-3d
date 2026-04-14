import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    await new Promise(r => setTimeout(r, 500));
    const ok = login(username, password, secretCode);
    if (!ok) setError(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background grid-bg">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5">
                <path d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 21v-4h6v4M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground">FloorPlan3D</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.login.title}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t.login.username}</label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-secondary border-border"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t.login.password}</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-secondary border-border"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t.login.secretCode}</label>
              <Input
                type="password"
                value={secretCode}
                onChange={e => setSecretCode(e.target.value)}
                className="bg-secondary border-border font-mono"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{t.login.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : t.login.submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

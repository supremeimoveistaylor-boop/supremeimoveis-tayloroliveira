import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, X, Rocket, UserCheck, LogIn, Plug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Step {
  key: 'signup' | 'login' | 'meta';
  title: string;
  description: string;
  icon: any;
  done: boolean;
  cta?: { label: string; onClick: () => void };
}

export const OnboardingChecklist = () => {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [hasMeta, setHasMeta] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = user?.id ? `onboarding_dismissed_${user.id}` : null;

  useEffect(() => {
    if (storageKey && localStorage.getItem(storageKey) === '1') {
      setDismissed(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!user?.id) return;
    let cancel = false;
    (async () => {
      const { count } = await supabase
        .from('meta_channel_connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!cancel) setHasMeta((count ?? 0) > 0);
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  if (!user || dismissed || hasMeta === null) return null;

  const steps: Step[] = [
    {
      key: 'signup',
      title: 'Conta criada',
      description: `Cadastro confirmado para ${user.email}.`,
      icon: UserCheck,
      done: true,
    },
    {
      key: 'login',
      title: 'Login realizado',
      description: 'Você está autenticado no painel admin.',
      icon: LogIn,
      done: true,
    },
    {
      key: 'meta',
      title: 'Conectar WhatsApp / Meta',
      description: 'Conecte sua conta Meta para receber mensagens e leads.',
      icon: Plug,
      done: !!hasMeta,
      cta: {
        label: hasMeta ? 'Gerenciar conexão' : 'Conectar agora',
        onClick: () => navigate('/super-admin?tab=connections'),
      },
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  if (progress === 100) {
    // Auto-dismiss after completion
    if (storageKey) localStorage.setItem(storageKey, '1');
    return null;
  }

  const handleDismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <Card className="relative mb-6 overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:border-amber-900/40 dark:from-amber-950/30 dark:via-background dark:to-background">
      <button
        onClick={handleDismiss}
        aria-label="Dispensar onboarding"
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">
              Bem-vindo(a) ao painel Supreme
            </h3>
            <p className="text-sm text-muted-foreground">
              Conclua os passos abaixo para ativar sua operação completa.
            </p>
          </div>
          <div className="hidden text-right md:block">
            <div className="text-xs text-muted-foreground">Progresso</div>
            <div className="text-lg font-semibold text-amber-600">{progress}%</div>
          </div>
        </div>

        <Progress value={progress} className="mb-4 h-2" />

        <ol className="space-y-2.5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li
                key={step.key}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 transition hover:border-amber-300/70"
              >
                <div className="shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Passo {idx + 1}
                    </span>
                    <span className={`text-sm font-semibold ${step.done ? 'text-foreground' : 'text-foreground'}`}>
                      {step.title}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{step.description}</p>
                </div>
                {step.cta && !step.done && (
                  <Button
                    size="sm"
                    onClick={step.cta.onClick}
                    className="bg-amber-500 text-slate-900 hover:bg-amber-600"
                  >
                    {step.cta.label}
                  </Button>
                )}
                {step.cta && step.done && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={step.cta.onClick}
                    className="text-muted-foreground"
                  >
                    {step.cta.label}
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
};

export default OnboardingChecklist;

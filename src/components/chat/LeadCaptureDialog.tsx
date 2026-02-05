import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function digitsOnly(value: string) {
  return (value || "").replace(/\D/g, "");
}

function formatBrPhone(digits: string) {
  const d = digitsOnly(digits).slice(0, 11);
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);

  if (!ddd) return "";

  if (rest.length <= 4) return `(${ddd}) ${rest}`.trim();
  if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  if (rest.length < 9) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

export type LeadCaptureData = {
  name: string;
  phoneDigits: string; // only digits
};

type LeadCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LeadCaptureData) => void | Promise<void>;
  isSubmitting?: boolean;
  initialName?: string;
  initialPhoneDigits?: string;
  error?: string | null;
};

export function LeadCaptureDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  initialName = "",
  initialPhoneDigits = "",
  error,
}: LeadCaptureDialogProps) {
  const [name, setName] = useState(initialName);
  const [phoneDigits, setPhoneDigits] = useState(initialPhoneDigits);
  const [touched, setTouched] = useState(false);

  const phoneMasked = useMemo(() => formatBrPhone(phoneDigits), [phoneDigits]);

  const validationError = useMemo(() => {
    if (!touched) return null;
    if (!name.trim() || name.trim().length < 2) return "Informe seu nome";
    const digits = digitsOnly(phoneDigits);
    if (digits.length < 10 || digits.length > 11) return "Telefone inválido (DDD + número)";
    return null;
  }, [name, phoneDigits, touched]);

  // Reset when opening
  // (keeps UX predictable if user closes and opens again)
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setTouched(false);
      setName((prev) => prev || initialName);
      setPhoneDigits((prev) => prev || initialPhoneDigits);
    }
  };

  const handleSubmit = async () => {
    setTouched(true);
    const digits = digitsOnly(phoneDigits);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (digits.length < 10 || digits.length > 11) return;
    await onSubmit({ name: trimmed, phoneDigits: digits });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Antes de começar</DialogTitle>
          <DialogDescription>
            Preencha seu nome e telefone para iniciarmos o atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              disabled={isSubmitting}
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Telefone</label>
            <Input
              value={phoneMasked}
              onChange={(e) => setPhoneDigits(digitsOnly(e.target.value))}
              placeholder="(00) 00000-0000"
              disabled={isSubmitting}
              inputMode="tel"
              maxLength={15}
            />
          </div>

          {(validationError || error) && (
            <p className="text-sm text-destructive">{error || validationError}</p>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Agora não
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Iniciar conversa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

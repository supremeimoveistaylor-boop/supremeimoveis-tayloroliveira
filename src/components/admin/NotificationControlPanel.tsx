import { useState } from "react";
import { Bell, BellOff, Volume2, VolumeX, Settings2, Check, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { NotificationPrefs, LeadSoundKey, MessageSoundKey } from "@/hooks/useAdminNotifications";

interface NotificationControlPanelProps {
  prefs: NotificationPrefs;
  setPrefs: (updater: Partial<NotificationPrefs>) => void;
  unseenCount: number;
  connected: boolean;
  acknowledge: () => void;
  previewLead: () => void;
  previewMessage: () => void;
}

const LEAD_SOUNDS: { value: LeadSoundKey; label: string }[] = [
  { value: "new-lead", label: "Alerta forte (recomendado)" },
  { value: "chime", label: "Sino suave" },
  { value: "notification", label: "Padrão" },
];

const MESSAGE_SOUNDS: { value: MessageSoundKey; label: string }[] = [
  { value: "new-message", label: "Pop estilo WhatsApp" },
  { value: "chime", label: "Sino suave" },
  { value: "notification", label: "Padrão" },
];

/**
 * Painel flutuante (canto inferior direito) com controle do som,
 * volume, tipo de som por evento, repetição, vibração e push.
 */
export function NotificationControlPanel({
  prefs,
  setPrefs,
  unseenCount,
  connected,
  acknowledge,
  previewLead,
  previewMessage,
}: NotificationControlPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            variant={prefs.enabled ? "default" : "secondary"}
            className="relative h-14 w-14 rounded-full shadow-lg"
            aria-label="Notificações"
          >
            {prefs.enabled ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
            {unseenCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                {unseenCount > 99 ? "99+" : unseenCount}
              </span>
            )}
            <span
              className={`absolute -bottom-1 -right-1 flex h-3 w-3 rounded-full ring-2 ring-background ${
                connected ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
              aria-label={connected ? "conectado" : "desconectado"}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" side="top" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Notificações</span>
            </div>
            <Badge variant={connected ? "default" : "secondary"} className="gap-1">
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? "Ao vivo" : "Reconectando"}
            </Badge>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-enabled" className="flex items-center gap-2 text-sm">
                {prefs.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Som ativado
              </Label>
              <Switch
                id="notif-enabled"
                checked={prefs.enabled}
                onCheckedChange={(v) => setPrefs({ enabled: v })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Volume — {Math.round(prefs.volume * 100)}%
              </Label>
              <Slider
                value={[prefs.volume * 100]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setPrefs({ volume: v[0] / 100 })}
                disabled={!prefs.enabled}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Som — Novo lead</Label>
              <div className="flex gap-2">
                <Select
                  value={prefs.leadSound}
                  onValueChange={(v) => setPrefs({ leadSound: v as LeadSoundKey })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOUNDS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={previewLead}>
                  Testar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Som — Nova mensagem</Label>
              <div className="flex gap-2">
                <Select
                  value={prefs.messageSound}
                  onValueChange={(v) => setPrefs({ messageSound: v as MessageSoundKey })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_SOUNDS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={previewMessage}>
                  Testar
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-repeat" className="text-sm">
                Repetir até visualizar
              </Label>
              <Switch
                id="notif-repeat"
                checked={prefs.repeatUntilSeen}
                onCheckedChange={(v) => setPrefs({ repeatUntilSeen: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-vibrate" className="text-sm">
                Vibrar (mobile)
              </Label>
              <Switch
                id="notif-vibrate"
                checked={prefs.vibrate}
                onCheckedChange={(v) => setPrefs({ vibrate: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-desktop" className="text-sm">
                Notificações do sistema
              </Label>
              <Switch
                id="notif-desktop"
                checked={prefs.desktopNotifications}
                onCheckedChange={(v) => {
                  setPrefs({ desktopNotifications: v });
                  if (v && typeof Notification !== "undefined" && Notification.permission === "default") {
                    Notification.requestPermission().catch(() => {});
                  }
                }}
              />
            </div>

            {unseenCount > 0 && (
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={() => {
                  acknowledge();
                  setOpen(false);
                }}
              >
                <Check className="h-4 w-4" />
                Marcar {unseenCount} como visto
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

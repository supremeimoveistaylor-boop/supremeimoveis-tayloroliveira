import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Share2, CheckCircle, LinkIcon, FileText, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ShareTarget = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [sharedData, setSharedData] = useState({ title: "", text: "", url: "" });
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const title = searchParams.get("title") || "";
    const text = searchParams.get("text") || "";
    const url = searchParams.get("url") || "";

    if (!title && !text && !url) {
      setShowManual(true);
      setStatus("success");
      return;
    }

    setSharedData({ title, text, url });
    handleSharedData({ title, text, url });
  }, [searchParams]);

  const handleSharedData = async (data: { title: string; text: string; url: string }) => {
    try {
      const content = [data.title, data.text, data.url].filter(Boolean).join(" | ");

      // Extract URL from text if url param is empty
      const urlPattern = /https?:\/\/[^\s]+/g;
      const extractedUrl = data.url || (data.text?.match(urlPattern)?.[0]) || "";

      // Extract phone from text
      const phonePattern = /(\+55)?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/;
      const extractedPhone = data.text?.match(phonePattern)?.[0]?.replace(/\D/g, "") || null;

      // Save as lead
      const leadData: Record<string, unknown> = {
        name: data.title || "Compartilhamento iOS",
        origin: "share_target",
        page_url: extractedUrl || null,
        status: "novo",
        intent: data.text || null,
      };

      if (extractedPhone) {
        leadData.phone = extractedPhone;
      }

      const { error } = await supabase.from("leads").insert(leadData);

      if (error) {
        console.error("Error saving shared data:", error);
        setStatus("error");
        toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
        return;
      }

      setStatus("success");
      toast({ title: "Conteúdo recebido!", description: "Salvo no sistema com sucesso." });

      // Redirect after 2s
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      console.error("Share target error:", err);
      setStatus("error");
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    const urlMatch = manualInput.match(/https?:\/\/[^\s]+/);
    handleSharedData({
      title: "",
      text: manualInput,
      url: urlMatch?.[0] || "",
    });
    setShowManual(false);
    setStatus("processing");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setManualInput(text);
    } catch {
      toast({ title: "Erro", description: "Permita acesso à área de transferência.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Share2 className="w-8 h-8 text-primary" />
        </div>

        {status === "processing" && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Processando conteúdo...</h1>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </>
        )}

        {status === "success" && !showManual && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <h1 className="text-xl font-semibold text-foreground">Conteúdo salvo!</h1>
            <p className="text-muted-foreground text-sm">
              {sharedData.url && (
                <span className="flex items-center justify-center gap-1">
                  <LinkIcon className="w-4 h-4" /> {sharedData.url}
                </span>
              )}
              {sharedData.text && !sharedData.url && (
                <span className="flex items-center justify-center gap-1">
                  <FileText className="w-4 h-4" /> {sharedData.text.slice(0, 100)}...
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Redirecionando...</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-destructive">Erro ao processar</h1>
            <Button onClick={() => navigate("/")} variant="outline">Voltar ao início</Button>
          </>
        )}

        {showManual && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Importar conteúdo</h1>
            <p className="text-sm text-muted-foreground">Cole um link ou texto abaixo</p>
            <div className="space-y-3">
              <Textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Cole aqui o link ou texto..."
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={handlePaste} variant="outline" className="flex-1">
                  <ClipboardPaste className="w-4 h-4 mr-1" /> Colar
                </Button>
                <Button onClick={handleManualSubmit} className="flex-1" disabled={!manualInput.trim()}>
                  Salvar
                </Button>
              </div>
            </div>
          </>
        )}

        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          Voltar ao início
        </Button>
      </div>
    </div>
  );
};

export default ShareTarget;


-- Tabela de subscriptions push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Garantir extensão pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função genérica que chama a edge function send-push-notification
CREATE OR REPLACE FUNCTION public.notify_push_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'type','new_lead',
      'title','Novo Lead 🚀',
      'body', COALESCE('Cliente: ' || NEW.name, 'Cliente entrou pelo WhatsApp'),
      'url','/leads',
      'lead_id', NEW.id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_push_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv RECORD;
BEGIN
  -- Só notifica mensagens recebidas do contato (não as enviadas pelo agente/bot)
  IF NEW.sender_type IS DISTINCT FROM 'contact' AND NEW.sender_type IS DISTINCT FROM 'user' THEN
    RETURN NEW;
  END IF;

  SELECT contact_name, contact_phone, channel INTO v_conv
  FROM public.omnichat_conversations
  WHERE id = NEW.conversation_id;

  PERFORM extensions.http_post(
    url := 'https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'type','new_message',
      'title', COALESCE('💬 ' || v_conv.contact_name, '💬 Nova mensagem'),
      'body', COALESCE(LEFT(NEW.content, 120), 'Nova mensagem recebida'),
      'url','/conversas',
      'conversation_id', NEW.conversation_id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_new_lead ON public.leads;
CREATE TRIGGER trg_push_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_push_new_lead();

DROP TRIGGER IF EXISTS trg_push_new_message ON public.omnichat_messages;
CREATE TRIGGER trg_push_new_message
AFTER INSERT ON public.omnichat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_push_new_message();

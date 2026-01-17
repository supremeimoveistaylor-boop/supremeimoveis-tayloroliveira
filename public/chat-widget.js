/* Supreme Chat Widget - Vanilla JS (independente do React)
   Injete via <head>:
   <script>
     window.chatConfig = { origin: 'Site' };
   </script>
   <script async src="/chat-widget.js"></script>
*/

(function () {
  var CONFIG = (window.chatConfig && typeof window.chatConfig === 'object') ? window.chatConfig : {};

  var CHAT_URL = "https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/real-estate-chat";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc";

  var LEAD_STORAGE_KEY = "supreme_chat_lead_id";

  var state = {
    isOpen: false,
    leadId: null,
    hasStarted: false,
    messages: [], // { role: 'user'|'assistant', content: string }
    isLoading: false,
  };

  function safeText(str) {
    return String(str || "");
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style') {
          node.setAttribute('style', attrs[k]);
        } else if (k === 'class') {
          node.className = attrs[k];
        } else if (k === 'text') {
          node.textContent = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (!child) continue;
      if (Array.isArray(child)) {
        child.forEach(function (c) { c && node.appendChild(c); });
      } else {
        node.appendChild(child);
      }
    }
    return node;
  }

  function inject() {
    // Avoid double-inject
    if (document.getElementById('supreme-chat-widget-root')) return;

    // Load leadId from storage
    try {
      state.leadId = localStorage.getItem(LEAD_STORAGE_KEY);
    } catch (_) {}

    var root = el('div', { id: 'supreme-chat-widget-root' });
    var shadow = root.attachShadow ? root.attachShadow({ mode: 'open' }) : null;
    var mount = shadow || root;

    var primary = CONFIG.primaryColor || '#d4af37';
    var bg = CONFIG.backgroundColor || '#0b0b0c';
    var panelBg = CONFIG.panelColor || '#111114';
    var text = CONFIG.textColor || '#f5f5f5';
    var muted = CONFIG.mutedColor || 'rgba(255,255,255,0.65)';

    var styles = el('style', { text: "" +
      ":host{all:initial}\n" +
      "*{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}\n" +
      ".btn{border:0;cursor:pointer}\n" +
      ".fab{position:fixed;right:24px;bottom:24px;z-index:2147483646;width:56px;height:56px;border-radius:999px;background:" + primary + ";color:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 40px rgba(0,0,0,0.35)}\n" +
      ".fab:focus{outline:2px solid rgba(212,175,55,0.5);outline-offset:2px}\n" +
      ".panel{position:fixed;right:24px;bottom:92px;z-index:2147483646;width:min(92vw,380px);height:min(70vh,560px);border-radius:16px;background:" + panelBg + ";color:" + text + ";box-shadow:0 24px 80px rgba(0,0,0,0.55);overflow:hidden;border:1px solid rgba(255,255,255,0.08);display:none}\n" +
      ".panel.open{display:flex;flex-direction:column}\n" +
      ".hdr{padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;background:linear-gradient(180deg,rgba(255,255,255,0.04),transparent)}\n" +
      ".ttl{display:flex;flex-direction:column;gap:2px}\n" +
      ".ttl strong{font-size:14px;letter-spacing:0.2px}\n" +
      ".ttl span{font-size:12px;color:" + muted + "}\n" +
      ".iconBtn{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.06);color:" + text + ";display:flex;align-items:center;justify-content:center}\n" +
      ".iconBtn:hover{background:rgba(255,255,255,0.10)}\n" +
      ".msgs{flex:1;overflow:auto;padding:12px;background:" + bg + "}\n" +
      ".msg{max-width:86%;padding:10px 10px;border-radius:14px;margin:8px 0;line-height:1.35;font-size:13px;white-space:pre-wrap;word-wrap:break-word}\n" +
      ".msg.user{margin-left:auto;background:" + primary + ";color:#111;border-bottom-right-radius:6px}\n" +
      ".msg.ai{margin-right:auto;background:rgba(255,255,255,0.08);color:" + text + ";border-bottom-left-radius:6px}\n" +
      ".foot{padding:10px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;background:rgba(255,255,255,0.02)}\n" +
      ".in{flex:1;border-radius:12px;border:1px solid rgba(255,255,255,0.10);background:rgba(0,0,0,0.20);color:" + text + ";padding:10px 12px;font-size:13px}\n" +
      ".send{border-radius:12px;padding:0 14px;background:" + primary + ";color:#111;font-weight:700}\n" +
      ".send[disabled]{opacity:0.6;cursor:not-allowed}\n" +
      ".note{padding:10px 12px;font-size:12px;color:" + muted + "}\n" +
      "" });

    var msgList = el('div', { class: 'msgs', role: 'log', 'aria-live': 'polite' });
    var input = el('input', { class: 'in', placeholder: 'Digite sua mensagem...', type: 'text', maxlength: '1000' });
    var sendBtn = el('button', { class: 'btn send', type: 'button' }, el('span', { text: 'Enviar' }));
    var closeBtn = el('button', { class: 'btn iconBtn', type: 'button', title: 'Fechar', 'aria-label': 'Fechar chat' },
      el('span', { text: '×', style: 'font-size:18px;line-height:1' })
    );

    var header = el('div', { class: 'hdr' },
      el('div', { class: 'ttl' },
        el('strong', { text: CONFIG.title || 'Atendimento Remoto' }),
        el('span', { text: CONFIG.subtitle || 'Supreme Empreendimentos' })
      ),
      closeBtn
    );

    var panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'Chat de atendimento' },
      header,
      msgList,
      el('div', { class: 'foot' }, input, sendBtn),
      el('div', { class: 'note', text: 'Ao enviar, você concorda em ser contatado por um especialista.' })
    );

    var fab = el('button', { class: 'btn fab', type: 'button', 'aria-label': 'Abrir chat' },
      el('span', { text: '💬', style: 'font-size:22px' })
    );

    function renderMessages() {
      msgList.innerHTML = '';
      state.messages.forEach(function (m) {
        var cls = m.role === 'user' ? 'msg user' : 'msg ai';
        msgList.appendChild(el('div', { class: cls, text: safeText(m.content) }));
      });
      // scroll
      msgList.scrollTop = msgList.scrollHeight;
    }

    function setLoading(loading) {
      state.isLoading = !!loading;
      sendBtn.disabled = state.isLoading;
      sendBtn.textContent = state.isLoading ? 'Enviando…' : 'Enviar';
    }

    function open() {
      state.isOpen = true;
      panel.classList.add('open');
      fab.setAttribute('aria-label', 'Chat aberto');
      input.focus();
      if (!state.hasStarted) {
        startConversation();
      }
    }

    function close() {
      state.isOpen = false;
      panel.classList.remove('open');
      fab.setAttribute('aria-label', 'Abrir chat');
    }

    async function startConversation() {
      state.hasStarted = true;
      setLoading(true);

      try {
        var resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ANON_KEY,
          },
          body: JSON.stringify({
            messages: [],
            leadId: state.leadId || undefined,
            pageUrl: window.location.href,
            origin: CONFIG.origin || 'Site',
            propertyId: CONFIG.propertyId,
            propertyName: CONFIG.propertyName,
          }),
        });

        if (!resp.ok) throw new Error('Falha ao iniciar chat');

        var responseLeadId = resp.headers.get('X-Lead-Id');
        if (responseLeadId) {
          state.leadId = responseLeadId;
          try { localStorage.setItem(LEAD_STORAGE_KEY, responseLeadId); } catch (_) {}
        }

        await processStream(resp);
      } catch (e) {
        // fallback
        state.messages.push({
          role: 'assistant',
          content: 'Olá! Seja bem-vindo(a) 😊\nMe conta: você está procurando um imóvel para morar ou investir?',
        });
        renderMessages();
      } finally {
        setLoading(false);
      }
    }

    async function processStream(resp) {
      var reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
      if (!reader) return;

      var decoder = new TextDecoder();
      var buffer = '';
      var assistantContent = '';

      // add placeholder assistant message
      state.messages.push({ role: 'assistant', content: '' });
      var idx = state.messages.length - 1;
      renderMessages();

      while (true) {
        var r = await reader.read();
        if (r.done) break;
        buffer += decoder.decode(r.value, { stream: true });

        var nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          var line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line || line[0] === ':' || line.trim() === '') continue;
          if (line.indexOf('data: ') !== 0) continue;

          var jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            var parsed = JSON.parse(jsonStr);
            var delta = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
            var c = delta && delta.content;
            if (c) {
              assistantContent += c;
              state.messages[idx].content = assistantContent;
              renderMessages();
            }
          } catch (e) {
            // put back and wait for more
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    }

    async function sendMessage() {
      var content = input.value.trim();
      if (!content || state.isLoading) return;

      // push user msg
      state.messages.push({ role: 'user', content: content });
      input.value = '';
      renderMessages();
      setLoading(true);

      try {
        var payloadMessages = state.messages
          .slice(-20)
          .map(function (m) { return ({ role: m.role, content: m.content }); });

        var resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ANON_KEY,
          },
          body: JSON.stringify({
            messages: payloadMessages,
            leadId: state.leadId || undefined,
            pageUrl: window.location.href,
            origin: CONFIG.origin || 'Site',
            propertyId: CONFIG.propertyId,
            propertyName: CONFIG.propertyName,
          }),
        });

        if (!resp.ok) {
          if (resp.status === 429) throw new Error('Muitas requisições. Aguarde um momento.');
          throw new Error('Erro ao enviar mensagem');
        }

        var responseLeadId = resp.headers.get('X-Lead-Id');
        if (responseLeadId && responseLeadId !== state.leadId) {
          state.leadId = responseLeadId;
          try { localStorage.setItem(LEAD_STORAGE_KEY, responseLeadId); } catch (_) {}
        }

        await processStream(resp);
      } catch (e) {
        state.messages.push({ role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' });
        renderMessages();
      } finally {
        setLoading(false);
      }
    }

    fab.addEventListener('click', function () {
      state.isOpen ? close() : open();
    });
    closeBtn.addEventListener('click', close);
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        sendMessage();
      }
    });

    // Mount
    mount.appendChild(styles);
    mount.appendChild(panel);
    mount.appendChild(fab);
    document.documentElement.appendChild(root);

    // Auto open after 3 seconds (configurable)
    var autoOpenMs = typeof CONFIG.autoOpenMs === 'number' ? CONFIG.autoOpenMs : 3000;
    if (autoOpenMs > 0) {
      setTimeout(function () {
        if (!state.isOpen) open();
      }, autoOpenMs);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

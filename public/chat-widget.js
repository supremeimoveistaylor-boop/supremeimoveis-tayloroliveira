/* Supreme Chat Widget - Vanilla JS (independente do React)
   Versão: 2.0 - Fluxo conversacional sem persistência
   
   Injete via <head>:
   <script>
     window.chatConfig = { origin: 'Site' };
   </script>
   <script async src="/chat-widget.js"></script>
*/

(function () {
  var CONFIG = (window.chatConfig && typeof window.chatConfig === 'object') ? window.chatConfig : {};

  var SUPABASE_URL = "https://ypkmorgcpooygsvhcpvo.supabase.co";
  var LEADS_URL = SUPABASE_URL + "/functions/v1/real_estate_leads";
  var CHAT_URL = SUPABASE_URL + "/functions/v1/real-estate-chat";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc";

  var SESSION_LEAD_KEY = "supreme_chat_lead_saved";

  // Estados do fluxo conversacional
  var FLOW_STATE = {
    GREETING: 'greeting',
    ASK_NAME: 'ask_name',
    ASK_PHONE: 'ask_phone',
    SAVING_LEAD: 'saving_lead',
    CHAT_ACTIVE: 'chat_active'
  };

  // Estado em memória (não persiste)
  var state = {
    isOpen: false,
    messages: [],
    isLoading: false,
    flowState: FLOW_STATE.GREETING,
    clientName: null,
    clientPhone: null,
    leadSaved: false
  };

  // Verifica se já salvou lead nesta sessão do navegador
  function checkLeadSavedInSession() {
    try {
      return sessionStorage.getItem(SESSION_LEAD_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function markLeadSavedInSession() {
    try {
      sessionStorage.setItem(SESSION_LEAD_KEY, 'true');
    } catch (_) {}
    state.leadSaved = true;
  }

  function safeText(str) {
    return String(str || "").replace(/[<>]/g, '');
  }

  // Validar telefone brasileiro: mínimo 10 dígitos
  function validatePhone(phone) {
    var digits = phone.replace(/\D/g, "");
    return digits.length >= 10;
  }

  // Formatar telefone
  function formatPhone(value) {
    var digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? "(" + digits : "";
    if (digits.length <= 7) return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
  }

  function playNotificationSound() {
    try {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var oscillator = audioCtx.createOscillator();
      var gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (_) {}
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style') node.setAttribute('style', attrs[k]);
        else if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
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
    if (document.getElementById('supreme-chat-widget-root')) return;

    // Verificar se lead já foi salvo nesta sessão
    state.leadSaved = checkLeadSavedInSession();

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
      "@keyframes bounce{0%,20%,50%,80%,100%{transform:translateY(0)}40%{transform:translateY(-12px)}60%{transform:translateY(-6px)}}\n" +
      "@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.7)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}}\n" +
      "@keyframes typing{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}\n" +
      ".fab{position:fixed;right:24px;bottom:24px;z-index:2147483646;width:56px;height:56px;border-radius:999px;background:" + primary + ";color:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 40px rgba(0,0,0,0.35);animation:bounce 2s ease-in-out infinite}\n" +
      ".fab.no-bounce{animation:none}\n" +
      ".fab:focus{outline:2px solid rgba(212,175,55,0.5);outline-offset:2px}\n" +
      ".panel{position:fixed;right:24px;bottom:92px;z-index:2147483646;width:min(92vw,380px);height:min(70vh,560px);border-radius:16px;background:" + panelBg + ";color:" + text + ";box-shadow:0 24px 80px rgba(0,0,0,0.55);overflow:hidden;border:1px solid rgba(255,255,255,0.08);display:none}\n" +
      ".panel.open{display:flex;flex-direction:column}\n" +
      ".hdr{padding:12px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;background:linear-gradient(180deg,rgba(255,255,255,0.04),transparent)}\n" +
      ".ttl{display:flex;flex-direction:column;gap:2px}\n" +
      ".ttl strong{font-size:14px;letter-spacing:0.2px}\n" +
      ".ttl span{font-size:12px;color:" + muted + "}\n" +
      ".iconBtn{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.06);color:" + text + ";display:flex;align-items:center;justify-content:center}\n" +
      ".iconBtn:hover{background:rgba(255,255,255,0.10)}\n" +
      ".msgs{flex:1;overflow:auto;padding:12px;background:" + bg + "}\n" +
      ".msg{max-width:86%;padding:10px;border-radius:14px;margin:8px 0;line-height:1.35;font-size:13px;white-space:pre-wrap;word-wrap:break-word}\n" +
      ".msg.user{margin-left:auto;background:" + primary + ";color:#111;border-bottom-right-radius:6px}\n" +
      ".msg.ai{margin-right:auto;background:rgba(255,255,255,0.08);color:" + text + ";border-bottom-left-radius:6px}\n" +
      ".typing{display:flex;gap:4px;padding:10px;margin:8px 0;margin-right:auto;background:rgba(255,255,255,0.08);border-radius:14px;border-bottom-left-radius:6px}\n" +
      ".typing span{width:8px;height:8px;background:" + muted + ";border-radius:50%;animation:typing 1s infinite}\n" +
      ".typing span:nth-child(2){animation-delay:0.2s}\n" +
      ".typing span:nth-child(3){animation-delay:0.4s}\n" +
      ".foot{padding:10px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;background:rgba(255,255,255,0.02)}\n" +
      ".in{flex:1;border-radius:12px;border:1px solid rgba(255,255,255,0.10);background:rgba(0,0,0,0.20);color:" + text + ";padding:10px 12px;font-size:13px}\n" +
      ".in:focus{outline:none;border-color:" + primary + "}\n" +
      ".send{border-radius:12px;padding:0 14px;background:" + primary + ";color:#111;font-weight:700}\n" +
      ".send[disabled]{opacity:0.6;cursor:not-allowed}\n" +
      ".online-dot{width:8px;height:8px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite}\n" +
      "" });

    var msgList = el('div', { class: 'msgs', role: 'log', 'aria-live': 'polite' });
    var input = el('input', { class: 'in', placeholder: 'Digite sua mensagem...', type: 'text', maxlength: '500' });
    var sendBtn = el('button', { class: 'btn send', type: 'button' }, el('span', { text: 'Enviar' }));
    var closeBtn = el('button', { class: 'btn iconBtn', type: 'button', title: 'Fechar', 'aria-label': 'Fechar chat' },
      el('span', { text: '×', style: 'font-size:18px;line-height:1' })
    );

    var header = el('div', { class: 'hdr' },
      el('div', { class: 'ttl' },
        el('div', { style: 'display:flex;align-items:center;gap:8px' },
          el('div', { style: 'position:relative;width:32px;height:32px;background:#0f172a;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center' },
            el('img', { src: '/images/chat-avatar.png', alt: 'Supreme', style: 'width:100%;height:100%;object-fit:contain' }),
            el('span', { style: 'position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid ' + primary })
          ),
          el('div', {},
            el('strong', { text: CONFIG.title || 'Assistente Supreme' }),
            el('div', { style: 'display:flex;align-items:center;gap:4px;font-size:11px;opacity:0.8' },
              el('span', { class: 'online-dot' }),
              el('span', { text: 'Online agora' })
            )
          )
        )
      ),
      closeBtn
    );

    var panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'Chat de atendimento' },
      header,
      msgList,
      el('div', { class: 'foot' }, input, sendBtn)
    );

    var fab = el('button', { class: 'btn fab', type: 'button', 'aria-label': 'Assistente Online' },
      el('span', { text: '💬', style: 'font-size:22px' })
    );

    function addMessage(role, content) {
      state.messages.push({ role: role, content: content });
      renderMessages();
      if (role === 'assistant') playNotificationSound();
    }

    function renderMessages() {
      msgList.innerHTML = '';
      state.messages.forEach(function (m) {
        var cls = m.role === 'user' ? 'msg user' : 'msg ai';
        msgList.appendChild(el('div', { class: cls, text: safeText(m.content) }));
      });
      if (state.isLoading) {
        var typing = el('div', { class: 'typing' },
          el('span'), el('span'), el('span')
        );
        msgList.appendChild(typing);
      }
      msgList.scrollTop = msgList.scrollHeight;
    }

    function setLoading(loading) {
      state.isLoading = !!loading;
      sendBtn.disabled = state.isLoading;
      sendBtn.textContent = state.isLoading ? '...' : 'Enviar';
      renderMessages();
    }

    // ============================================
    // SALVAR LEAD - UMA ÚNICA VEZ
    // ============================================
    async function saveLeadOnce() {
      if (state.leadSaved) {
        console.log('[Chat] Lead já foi salvo nesta sessão');
        return true;
      }

      console.log('[Chat] Salvando lead:', { name: state.clientName, phone: state.clientPhone });

      try {
        var response = await fetch(LEADS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: state.clientName,
            clientPhone: state.clientPhone,
            origin: "Chat"
          })
        });

        if (response.ok) {
          var data = await response.json();
          console.log('[Chat] ✅ Lead salvo com sucesso:', data);
          markLeadSavedInSession();
          return true;
        } else {
          console.error('[Chat] Erro ao salvar lead:', await response.text());
          return false;
        }
      } catch (e) {
        console.error('[Chat] Erro de rede ao salvar lead:', e);
        return false;
      }
    }

    // ============================================
    // CHAMAR IA PARA RESPOSTA (sem persistência)
    // ============================================
    async function getAIResponse(userMessage) {
      try {
        var response = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ANON_KEY
          },
          body: JSON.stringify({
            messages: state.messages.slice(-10), // Apenas últimas 10 mensagens em memória
            clientName: state.clientName,
            clientPhone: state.clientPhone,
            origin: CONFIG.origin || 'Chat',
            pageUrl: window.location.href,
            skipLeadCreation: true // Não criar lead via chat
          })
        });

        if (response.ok) {
          var data = await response.json();
          return data.reply || 'Como posso ajudar você?';
        }
      } catch (e) {
        console.error('[Chat] Erro ao obter resposta IA:', e);
      }
      return 'Desculpe, tive um problema. Pode repetir?';
    }

    // ============================================
    // PROCESSAR MENSAGEM DO USUÁRIO
    // ============================================
    async function processUserMessage(text) {
      addMessage('user', text);
      setLoading(true);

      try {
        switch (state.flowState) {
          case FLOW_STATE.GREETING:
          case FLOW_STATE.ASK_NAME:
            // Capturar nome
            var name = text.trim();
            if (name.length >= 2) {
              state.clientName = name;
              state.flowState = FLOW_STATE.ASK_PHONE;
              setTimeout(function() {
                setLoading(false);
                addMessage('assistant', 'Prazer, ' + name + '! 📱 Qual seu WhatsApp para contato? (com DDD)');
              }, 500);
            } else {
              setTimeout(function() {
                setLoading(false);
                addMessage('assistant', 'Por favor, me diga seu nome completo para eu te atender melhor.');
              }, 500);
            }
            break;

          case FLOW_STATE.ASK_PHONE:
            // Capturar telefone
            var phone = text.replace(/\D/g, '');
            if (validatePhone(phone)) {
              state.clientPhone = phone;
              state.flowState = FLOW_STATE.SAVING_LEAD;
              
              // Salvar lead UMA ÚNICA VEZ
              var saved = await saveLeadOnce();
              
              state.flowState = FLOW_STATE.CHAT_ACTIVE;
              setLoading(false);
              
              if (saved) {
                addMessage('assistant', 'Perfeito, ' + state.clientName + '! ✅ Seus dados foram registrados.\n\nComo posso ajudar você hoje? Está procurando imóvel para comprar, alugar, ou quer vender/anunciar?');
              } else {
                addMessage('assistant', 'Ótimo, ' + state.clientName + '! Como posso ajudar você hoje?');
              }
            } else {
              setLoading(false);
              addMessage('assistant', 'Por favor, informe um número válido com DDD (mínimo 10 dígitos).\n\nExemplo: 62 99999-9999');
            }
            break;

          case FLOW_STATE.CHAT_ACTIVE:
            // Chat ativo - responder via IA
            var aiReply = await getAIResponse(text);
            setLoading(false);
            addMessage('assistant', aiReply);
            break;

          default:
            setLoading(false);
            addMessage('assistant', 'Como posso ajudar?');
        }
      } catch (e) {
        console.error('[Chat] Erro:', e);
        setLoading(false);
        addMessage('assistant', 'Desculpe, ocorreu um erro. Tente novamente.');
      }
    }

    function sendMessage() {
      var text = input.value.trim();
      if (!text || state.isLoading) return;
      input.value = '';
      processUserMessage(text);
    }

    function open() {
      state.isOpen = true;
      panel.classList.add('open');
      fab.classList.add('no-bounce');

      // Iniciar conversa se ainda não iniciou
      if (state.messages.length === 0) {
        if (state.leadSaved) {
          // Lead já salvo - ir direto para chat
          state.flowState = FLOW_STATE.CHAT_ACTIVE;
          addMessage('assistant', 'Olá! 👋 Bem-vindo de volta à Supreme Empreendimentos.\n\nComo posso ajudar você hoje?');
        } else {
          // Iniciar fluxo conversacional
          state.flowState = FLOW_STATE.ASK_NAME;
          addMessage('assistant', 'Olá! 👋 Sou o assistente da Supreme Empreendimentos.\n\nPara começar, qual é o seu nome?');
        }
      }

      input.focus();
    }

    function close() {
      state.isOpen = false;
      panel.classList.remove('open');
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        sendMessage();
      }
    });

    fab.addEventListener('click', function () {
      if (state.isOpen) close();
      else open();
    });

    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && state.isOpen) close();
    });

    // Montar widget
    mount.appendChild(styles);
    mount.appendChild(fab);
    mount.appendChild(panel);
    document.body.appendChild(root);

    // Auto-open após delay (se configurado)
    var autoOpenMs = CONFIG.autoOpenMs;
    if (autoOpenMs && typeof autoOpenMs === 'number') {
      setTimeout(function () {
        if (!state.isOpen) open();
      }, autoOpenMs);
    }
  }

  // Inject when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

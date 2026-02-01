/* Supreme Chat Widget - Vanilla JS (independente do React)
   Injete via <head>:
   <script>
     window.chatConfig = { origin: 'Site' };
   </script>
   <script async src="/chat-widget.js"></script>
*/

(function () {
  var CONFIG = (window.chatConfig && typeof window.chatConfig === 'object') ? window.chatConfig : {};

  var SUPABASE_URL = "https://ypkmorgcpooygsvhcpvo.supabase.co";
  var CHAT_URL = SUPABASE_URL + "/functions/v1/real-estate-chat";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc";

  var LEAD_STORAGE_KEY = "supreme_chat_lead_id";
  var AUTO_OPEN_STORAGE_KEY = "supreme_chat_auto_opened";
  var USER_DATA_STORAGE_KEY = "supreme_chat_user_data";
  var SESSION_STORAGE_KEY = "supreme_chat_session_id";

  var state = {
    isOpen: false,
    leadId: null,
    sessionId: null,
    hasStarted: false,
    messages: [],
    isLoading: false,
    clientName: null,
    clientPhone: null,
    showPreChat: false,
    preChatCompleted: false,
  };

  function safeText(str) {
    return String(str || "");
  }

  // Máscara de telefone brasileiro
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
    } catch (e) {}
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
    if (document.getElementById('supreme-chat-widget-root')) return;

    // Load stored data
    try {
      state.leadId = localStorage.getItem(LEAD_STORAGE_KEY);
      state.sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      var userData = localStorage.getItem(USER_DATA_STORAGE_KEY);
      if (userData) {
        var parsed = JSON.parse(userData);
        state.clientName = parsed.name;
        state.clientPhone = parsed.phone;
        state.preChatCompleted = true;
      }
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
      "@keyframes bounce{0%,20%,50%,80%,100%{transform:translateY(0)}40%{transform:translateY(-12px)}60%{transform:translateY(-6px)}}\n" +
      "@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.7)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}}\n" +
      ".fab{position:fixed;right:24px;bottom:24px;z-index:2147483646;width:56px;height:56px;border-radius:999px;background:" + primary + ";color:#111;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 40px rgba(0,0,0,0.35);animation:bounce 2s ease-in-out infinite}\n" +
      ".fab.no-bounce{animation:none}\n" +
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
      // Pre-chat form styles
      ".prechat{padding:24px;display:flex;flex-direction:column;gap:16px;background:" + bg + ";flex:1}\n" +
      ".prechat-title{font-size:18px;font-weight:700;text-align:center;color:" + text + "}\n" +
      ".prechat-desc{font-size:13px;text-align:center;color:" + muted + ";margin-bottom:8px}\n" +
      ".prechat-field{display:flex;flex-direction:column;gap:6px}\n" +
      ".prechat-label{font-size:12px;font-weight:600;color:" + text + "}\n" +
      ".prechat-input{border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.30);color:" + text + ";padding:12px 14px;font-size:14px}\n" +
      ".prechat-input:focus{outline:none;border-color:" + primary + "}\n" +
      ".prechat-input::placeholder{color:" + muted + "}\n" +
      ".prechat-btn{border-radius:12px;padding:14px;background:" + primary + ";color:#111;font-weight:700;font-size:14px;margin-top:8px}\n" +
      ".prechat-btn:disabled{opacity:0.6;cursor:not-allowed}\n" +
      ".prechat-error{color:#f87171;font-size:12px;text-align:center}\n" +
      ".online-dot{width:8px;height:8px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite}\n" +
      "" });

    var msgList = el('div', { class: 'msgs', role: 'log', 'aria-live': 'polite' });
    var input = el('input', { class: 'in', placeholder: 'Digite sua mensagem...', type: 'text', maxlength: '1000' });
    var sendBtn = el('button', { class: 'btn send', type: 'button' }, el('span', { text: 'Enviar' }));
    var closeBtn = el('button', { class: 'btn iconBtn', type: 'button', title: 'Fechar', 'aria-label': 'Fechar chat' },
      el('span', { text: '×', style: 'font-size:18px;line-height:1' })
    );

    // Pre-chat form elements
    var preChatNameInput = el('input', { class: 'prechat-input', placeholder: 'Seu nome', type: 'text', maxlength: '100' });
    var preChatPhoneInput = el('input', { class: 'prechat-input', placeholder: '(00) 00000-0000', type: 'tel', inputmode: 'numeric', maxlength: '16' });
    var preChatError = el('div', { class: 'prechat-error', style: 'display:none' });
    var preChatSubmitBtn = el('button', { class: 'btn prechat-btn', type: 'button', text: 'Iniciar Conversa' });

    var preChatForm = el('div', { class: 'prechat', style: 'display:none' },
      el('div', { class: 'prechat-title', text: '👋 Olá! Como posso ajudar?' }),
      el('div', { class: 'prechat-desc', text: 'Para iniciar a conversa, informe seus dados abaixo.' }),
      el('div', { class: 'prechat-field' },
        el('label', { class: 'prechat-label', text: 'Nome *' }),
        preChatNameInput
      ),
      el('div', { class: 'prechat-field' },
        el('label', { class: 'prechat-label', text: 'WhatsApp *' }),
        preChatPhoneInput
      ),
      preChatError,
      preChatSubmitBtn
    );

    // Phone mask on pre-chat input
    preChatPhoneInput.addEventListener('input', function () {
      preChatPhoneInput.value = formatPhone(preChatPhoneInput.value);
    });

    var header = el('div', { class: 'hdr' },
      el('div', { class: 'ttl' },
        el('div', { style: 'display:flex;align-items:center;gap:8px' },
          el('div', { style: 'position:relative;width:32px;height:32px;background:#0f172a;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center' },
            el('img', { src: '/images/chat-avatar.png', alt: 'Supreme', style: 'width:100%;height:100%;object-fit:contain' }),
            el('span', { style: 'position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid ' + primary })
          ),
          el('div', {},
            el('strong', { text: CONFIG.title || 'Assistente Online' }),
            el('div', { style: 'display:flex;align-items:center;gap:4px;font-size:11px;opacity:0.8' },
              el('span', { class: 'online-dot' }),
              el('span', { text: 'Online agora' })
            )
          )
        )
      ),
      closeBtn
    );

    var chatContent = el('div', { style: 'display:flex;flex-direction:column;flex:1;overflow:hidden' },
      msgList,
      el('div', { class: 'foot' }, input, sendBtn),
      el('div', { class: 'note', text: 'Ao enviar, você concorda em ser contatado por um especialista.' })
    );

    var panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'Chat de atendimento' },
      header,
      preChatForm,
      chatContent
    );

    var fab = el('button', { class: 'btn fab', type: 'button', 'aria-label': 'Assistente Online' },
      el('span', { text: '💬', style: 'font-size:22px' })
    );

    function showPreChatForm() {
      preChatForm.style.display = 'flex';
      chatContent.style.display = 'none';
      preChatNameInput.focus();
    }

    function showChatContent() {
      preChatForm.style.display = 'none';
      chatContent.style.display = 'flex';
      input.focus();
    }

    function renderMessages() {
      msgList.innerHTML = '';
      state.messages.forEach(function (m) {
        var cls = m.role === 'user' ? 'msg user' : 'msg ai';
        msgList.appendChild(el('div', { class: cls, text: safeText(m.content) }));
      });
      msgList.scrollTop = msgList.scrollHeight;
    }

    function setLoading(loading) {
      state.isLoading = !!loading;
      sendBtn.disabled = state.isLoading;
      sendBtn.textContent = state.isLoading ? 'Enviando…' : 'Enviar';
    }

    function setPreChatLoading(loading) {
      preChatSubmitBtn.disabled = !!loading;
      preChatSubmitBtn.textContent = loading ? 'Aguarde...' : 'Iniciar Conversa';
    }

    function open() {
      state.isOpen = true;
      panel.classList.add('open');
      fab.setAttribute('aria-label', 'Assistente Online aberto');

      // Check if pre-chat is needed
      if (!state.preChatCompleted) {
        showPreChatForm();
      } else {
        showChatContent();
        if (!state.hasStarted) {
          startConversation();
        }
      }
    }

    function close() {
      state.isOpen = false;
      panel.classList.remove('open');
      fab.setAttribute('aria-label', 'Assistente Online');
    }

    // Submit pre-chat form - create/update lead and session
    async function submitPreChat() {
      var name = preChatNameInput.value.trim();
      var phone = preChatPhoneInput.value.replace(/\D/g, '');

      preChatError.style.display = 'none';

      if (!name) {
        preChatError.textContent = 'Por favor, informe seu nome.';
        preChatError.style.display = 'block';
        return;
      }

      if (phone.length < 10) {
        preChatError.textContent = 'Por favor, informe um WhatsApp válido com DDD.';
        preChatError.style.display = 'block';
        return;
      }

      setPreChatLoading(true);

      try {
        // Create or update lead via Supabase REST API
        var leadPayload = {
          name: name,
          phone: preChatPhoneInput.value,
          origin: CONFIG.origin || 'Site',
          page_url: window.location.href,
          status: 'new'
        };

        // If we have an existing leadId, update it
        var leadResponse;
        if (state.leadId) {
          leadResponse = await fetch(SUPABASE_URL + '/rest/v1/leads?id=eq.' + state.leadId, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + ANON_KEY,
              'apikey': ANON_KEY,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ name: name, phone: preChatPhoneInput.value })
          });
        } else {
          leadResponse = await fetch(SUPABASE_URL + '/rest/v1/leads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + ANON_KEY,
              'apikey': ANON_KEY,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(leadPayload)
          });
        }

        if (leadResponse.ok) {
          var leadData = await leadResponse.json();
          if (leadData && leadData.length > 0) {
            state.leadId = leadData[0].id;
            try { localStorage.setItem(LEAD_STORAGE_KEY, state.leadId); } catch (_) {}
          }
        }

        // Create chat session linked to lead
        if (state.leadId) {
          var sessionResponse = await fetch(SUPABASE_URL + '/rest/v1/chat_sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + ANON_KEY,
              'apikey': ANON_KEY,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              lead_id: state.leadId,
              status: 'active',
              started_at: new Date().toISOString()
            })
          });

          if (sessionResponse.ok) {
            var sessionData = await sessionResponse.json();
            if (sessionData && sessionData.length > 0) {
              state.sessionId = sessionData[0].id;
              try { localStorage.setItem(SESSION_STORAGE_KEY, state.sessionId); } catch (_) {}
            }
          }
        }

        // Save user data to localStorage
        state.clientName = name;
        state.clientPhone = preChatPhoneInput.value;
        state.preChatCompleted = true;
        try {
          localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify({
            name: name,
            phone: preChatPhoneInput.value
          }));
        } catch (_) {}

        // Show chat and start conversation
        showChatContent();
        startConversation();

      } catch (e) {
        console.error('Pre-chat error:', e);
        // Still allow chat to proceed on error (fallback)
        state.clientName = name;
        state.preChatCompleted = true;
        try {
          localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify({
            name: name,
            phone: preChatPhoneInput.value
          }));
        } catch (_) {}
        showChatContent();
        startConversation();
      } finally {
        setPreChatLoading(false);
      }
    }

    preChatSubmitBtn.addEventListener('click', submitPreChat);
    preChatPhoneInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        submitPreChat();
      }
    });
    preChatNameInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        preChatPhoneInput.focus();
      }
    });

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
            sessionId: state.sessionId || undefined,
            pageUrl: window.location.href,
            origin: CONFIG.origin || 'Site',
            propertyId: CONFIG.propertyId,
            propertyName: CONFIG.propertyName,
            clientName: state.clientName,
            clientPhone: state.clientPhone,
          }),
        });

        if (!resp.ok) throw new Error('Falha ao iniciar chat');

        var responseLeadId = resp.headers.get('X-Lead-Id');
        if (responseLeadId) {
          state.leadId = responseLeadId;
          try { localStorage.setItem(LEAD_STORAGE_KEY, responseLeadId); } catch (_) {}
        }

        await processStream(resp, false);
      } catch (e) {
        var greeting = state.clientName 
          ? 'Olá, ' + state.clientName + '! 😊\nMe conta: você está procurando um imóvel para morar ou investir?'
          : 'Olá! Seja bem-vindo(a) 😊\nMe conta: você está procurando um imóvel para morar ou investir?';
        state.messages.push({ role: 'assistant', content: greeting });
        renderMessages();
      } finally {
        setLoading(false);
      }
    }

    async function processStream(resp, shouldPlaySound) {
      var reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
      if (!reader) return;

      var decoder = new TextDecoder();
      var buffer = '';
      var assistantContent = '';
      var soundPlayed = false;

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
              if (!soundPlayed && shouldPlaySound) {
                playNotificationSound();
                soundPlayed = true;
              }
              assistantContent += c;
              state.messages[idx].content = assistantContent;
              renderMessages();
            }
          } catch (e) {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    }

    async function sendMessage() {
      var content = input.value.trim();
      if (!content || state.isLoading) return;

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
            sessionId: state.sessionId || undefined,
            pageUrl: window.location.href,
            origin: CONFIG.origin || 'Site',
            propertyId: CONFIG.propertyId,
            propertyName: CONFIG.propertyName,
            clientName: state.clientName,
            clientPhone: state.clientPhone,
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

        await processStream(resp, true);
      } catch (e) {
        state.messages.push({ role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' });
        renderMessages();
      } finally {
        setLoading(false);
      }
    }

    fab.addEventListener('click', function () {
      fab.classList.add('no-bounce');
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

    // Auto open (only once per user)
    var autoOpenMs = typeof CONFIG.autoOpenMs === 'number' ? CONFIG.autoOpenMs : 7000;
    var hasAutoOpened = false;
    try {
      hasAutoOpened = localStorage.getItem(AUTO_OPEN_STORAGE_KEY) === 'true';
    } catch (_) {}

    if (autoOpenMs > 0 && !hasAutoOpened) {
      setTimeout(function () {
        if (!state.isOpen) {
          open();
          try {
            localStorage.setItem(AUTO_OPEN_STORAGE_KEY, 'true');
          } catch (_) {}
        }
      }, autoOpenMs);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

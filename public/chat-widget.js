/* Supreme Chat Widget v4.0 - PRÉ-CAPTURA + IA
   Formulário de captura ANTES do chat.
   Após captura, chat funciona normalmente.
   Template do chat 100% preservado.
*/
(function () {
  var CONFIG = (window.chatConfig && typeof window.chatConfig === 'object') ? window.chatConfig : {};
  var SUPABASE_URL = "https://ypkmorgcpooygsvhcpvo.supabase.co";
  var LEADS_URL = SUPABASE_URL + "/functions/v1/real_estate_leads";
  var CHAT_URL = SUPABASE_URL + "/functions/v1/real-estate-chat";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc";
  var SESSION_LEAD_KEY = "supreme_chat_lead_saved";
  var SESSION_NAME_KEY = "supreme_chat_name";
  var SESSION_PHONE_KEY = "supreme_chat_phone";

  // Fluxo: CAPTURE -> CHAT
  var FLOW = { CAPTURE: 'capture', CHAT: 'chat' };

  // Estado em memória
  var state = {
    isOpen: false,
    messages: [],
    isLoading: false,
    clientName: null,
    clientPhone: null,
    leadSaved: false,
    pendingLeadSave: false,
    flowState: FLOW.CAPTURE // Começa no formulário
  };

  // ============================================
  // SESSÃO: Recuperar dados salvos
  // ============================================
  function loadSessionData() {
    try {
      state.leadSaved = sessionStorage.getItem(SESSION_LEAD_KEY) === 'true';
      state.clientName = sessionStorage.getItem(SESSION_NAME_KEY) || null;
      state.clientPhone = sessionStorage.getItem(SESSION_PHONE_KEY) || null;
      // Se já salvou lead, pular para o chat
      if (state.leadSaved && state.clientName) {
        state.flowState = FLOW.CHAT;
      }
    } catch (_) {}
  }

  function saveSessionData() {
    try {
      if (state.clientName) sessionStorage.setItem(SESSION_NAME_KEY, state.clientName);
      if (state.clientPhone) sessionStorage.setItem(SESSION_PHONE_KEY, state.clientPhone);
      if (state.leadSaved) sessionStorage.setItem(SESSION_LEAD_KEY, 'true');
    } catch (_) {}
  }

  // ============================================
  // UTILIDADES
  // ============================================
  function safeText(str) {
    return String(str || "").replace(/[<>]/g, '');
  }

  function validatePhone(phone) {
    var digits = (phone || "").replace(/\D/g, "");
    return digits.length >= 10;
  }

  function extractName(text) {
    // Detectar "meu nome é X" ou "sou X" ou "me chamo X"
    var patterns = [
      /(?:meu nome [eé]|me chamo|sou o?a?)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/i,
      /^([A-Za-zÀ-ÿ]{2,}(?:\s+[A-Za-zÀ-ÿ]+)?)$/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var match = text.match(patterns[i]);
      if (match && match[1] && match[1].length >= 2) {
        return match[1].trim();
      }
    }
    return null;
  }

  function extractPhone(text) {
    var digits = text.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 11) {
      return digits;
    }
    return null;
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

  // ============================================
  // SALVAR LEAD - ASSÍNCRONO E NÃO BLOQUEANTE
  // ============================================
  function saveLeadAsync() {
    if (state.leadSaved || state.pendingLeadSave) {
      console.log('[Chat] Lead já salvo ou em progresso');
      return;
    }
    if (!state.clientName || !state.clientPhone) {
      console.log('[Chat] Dados incompletos para salvar lead');
      return;
    }
    if (!validatePhone(state.clientPhone)) {
      console.log('[Chat] Telefone inválido');
      return;
    }

    state.pendingLeadSave = true;
    console.log('[Chat] Salvando lead de forma assíncrona:', { name: state.clientName, phone: state.clientPhone });

    fetch(LEADS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: state.clientName,
        clientPhone: state.clientPhone,
        origin: "Chat"
      })
    })
    .then(function(response) {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Falha ao salvar');
    })
    .then(function(data) {
      console.log('[Chat] ✅ Lead salvo:', data);
      state.leadSaved = true;
      state.pendingLeadSave = false;
      saveSessionData();
    })
    .catch(function(e) {
      console.error('[Chat] Erro ao salvar lead:', e);
      state.pendingLeadSave = false;
    });
  }

  // ============================================
  // CHAMAR IA - RESPOSTA NÃO BLOQUEANTE
  // ============================================
  async function getAIResponse(userMessage) {
    try {
      // Preparar mensagens para a IA
      var messagesForAI = state.messages.slice(-10).map(function(m) {
        return { role: m.role, content: m.content };
      });

      var response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY
        },
        body: JSON.stringify({
          messages: messagesForAI,
          clientName: state.clientName || 'Visitante',
          clientPhone: state.clientPhone || null,
          origin: 'Chat',
          pageUrl: window.location.href,
          pageContext: 'Site Supreme Empreendimentos',
          skipLeadCreation: true
        })
      });

      if (!response.ok) {
        console.error('[Chat] Erro HTTP:', response.status);
        return 'Desculpe, tive um problema. Pode repetir?';
      }

      // Verificar se é streaming SSE
      var contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/event-stream')) {
        // Processar SSE streaming
        return await parseSSEStream(response);
      } else {
        // Resposta JSON normal
        var data = await response.json();
        return data.reply || data.message || 'Como posso ajudar você?';
      }
    } catch (e) {
      console.error('[Chat] Erro ao obter resposta IA:', e);
      return 'Desculpe, tive um problema de conexão. Pode repetir?';
    }
  }

  // ============================================
  // PARSER SSE STREAMING
  // ============================================
  async function parseSSEStream(response) {
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var fullText = '';
    var buffer = '';

    try {
      while (true) {
        var result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || line.startsWith(':')) continue;
          if (line === 'data: [DONE]') continue;
          if (!line.startsWith('data: ')) continue;

          var jsonStr = line.slice(6);
          try {
            var parsed = JSON.parse(jsonStr);
            var content = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
            if (content) {
              fullText += content;
            }
            // Check for non-streaming reply format
            if (parsed.reply) {
              fullText = parsed.reply;
            }
          } catch (parseErr) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        var remaining = buffer.trim();
        if (remaining.startsWith('data: ') && remaining !== 'data: [DONE]') {
          try {
            var parsed = JSON.parse(remaining.slice(6));
            if (parsed.reply) fullText = parsed.reply;
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              fullText += parsed.choices[0].delta.content;
            }
          } catch (_) {}
        }
      }
    } catch (streamErr) {
      console.error('[Chat] Erro no stream:', streamErr);
    }

    return fullText || 'Como posso ajudar você?';
  }

  function inject() {
    if (document.getElementById('supreme-chat-widget-root')) return;

    loadSessionData();

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
      // Estilos para o formulário de captura
      ".capture-view{flex:1;display:flex;flex-direction:column;padding:20px;background:" + bg + "}\n" +
      ".capture-greeting{background:rgba(255,255,255,0.08);border-radius:14px;border-bottom-left-radius:6px;padding:12px;margin-bottom:20px;font-size:13px;line-height:1.4}\n" +
      ".capture-form{display:flex;flex-direction:column;gap:12px}\n" +
      ".capture-label{font-size:12px;color:" + muted + ";margin-bottom:4px}\n" +
      ".capture-input{width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.10);background:rgba(0,0,0,0.20);color:" + text + ";padding:12px;font-size:14px}\n" +
      ".capture-input:focus{outline:none;border-color:" + primary + "}\n" +
      ".capture-input::placeholder{color:rgba(255,255,255,0.4)}\n" +
      ".capture-btn{width:100%;border-radius:12px;padding:14px;background:" + primary + ";color:#111;font-weight:700;font-size:14px;margin-top:8px;transition:opacity 0.2s}\n" +
      ".capture-btn:hover{opacity:0.9}\n" +
      ".capture-btn[disabled]{opacity:0.6;cursor:not-allowed}\n" +
      ".capture-error{color:#ef4444;font-size:12px;margin-top:-8px}\n" +
      ".chat-view{display:flex;flex-direction:column;flex:1;overflow:hidden}\n" +
      ".hidden{display:none!important}\n" +
      "" });

    // ============================================
    // ELEMENTOS DO FORMULÁRIO DE CAPTURA
    // ============================================
    var nameInput = el('input', { class: 'capture-input', placeholder: 'Seu nome', type: 'text', maxlength: '100' });
    var phoneInput = el('input', { class: 'capture-input', placeholder: '(00) 00000-0000', type: 'tel', maxlength: '15' });
    var captureError = el('div', { class: 'capture-error hidden', text: '' });
    var captureBtn = el('button', { class: 'btn capture-btn', type: 'button', text: 'Iniciar Conversa' });

    var captureView = el('div', { class: 'capture-view' },
      el('div', { class: 'capture-greeting', text: 'Olá! 👋 Sou o assistente da Supreme Empreendimentos.\n\nPara começar, preencha seus dados abaixo:' }),
      el('div', { class: 'capture-form' },
        el('div', {},
          el('div', { class: 'capture-label', text: 'Nome' }),
          nameInput
        ),
        el('div', {},
          el('div', { class: 'capture-label', text: 'Telefone' }),
          phoneInput,
          captureError
        ),
        captureBtn
      )
    );

    // ============================================
    // ELEMENTOS DO CHAT (TEMPLATE ORIGINAL)
    // ============================================
    var msgList = el('div', { class: 'msgs', role: 'log', 'aria-live': 'polite' });
    var input = el('input', { class: 'in', placeholder: 'Digite sua mensagem...', type: 'text', maxlength: '500' });
    var sendBtn = el('button', { class: 'btn send', type: 'button' }, el('span', { text: 'Enviar' }));
    var closeBtn = el('button', { class: 'btn iconBtn', type: 'button', title: 'Fechar', 'aria-label': 'Fechar chat' },
      el('span', { text: '×', style: 'font-size:18px;line-height:1' })
    );

    var chatView = el('div', { class: 'chat-view' },
      msgList,
      el('div', { class: 'foot' }, input, sendBtn)
    );

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

    var panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'Chat de atendimento' },
      header,
      captureView,
      chatView
    );

    var fab = el('button', { class: 'btn fab', type: 'button', 'aria-label': 'Assistente Online' },
      el('span', { text: '💬', style: 'font-size:22px' })
    );

    // ============================================
    // MÁSCARA DE TELEFONE
    // ============================================
    function formatPhone(value) {
      var digits = value.replace(/\D/g, '');
      if (digits.length <= 2) return digits;
      if (digits.length <= 7) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
      if (digits.length <= 11) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7, 11);
    }

    phoneInput.addEventListener('input', function() {
      phoneInput.value = formatPhone(phoneInput.value);
    });

    // ============================================
    // RENDERIZAR VISÃO ATUAL
    // ============================================
    function renderCurrentView() {
      if (state.flowState === FLOW.CAPTURE) {
        captureView.classList.remove('hidden');
        chatView.classList.add('hidden');
      } else {
        captureView.classList.add('hidden');
        chatView.classList.remove('hidden');
      }
    }

    // ============================================
    // SALVAR LEAD E TRANSICIONAR PARA CHAT
    // ============================================
    async function submitCapture() {
      var name = nameInput.value.trim();
      var phone = phoneInput.value.replace(/\D/g, '');

      // Validação
      if (!name || name.length < 2) {
        captureError.textContent = 'Por favor, informe seu nome';
        captureError.classList.remove('hidden');
        nameInput.focus();
        return;
      }
      if (phone.length < 10 || phone.length > 11) {
        captureError.textContent = 'Telefone inválido (min 10 dígitos)';
        captureError.classList.remove('hidden');
        phoneInput.focus();
        return;
      }

      captureError.classList.add('hidden');
      captureBtn.disabled = true;
      captureBtn.textContent = 'Salvando...';

      try {
        var response = await fetch(LEADS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: name,
            clientPhone: phone,
            origin: 'Chat'
          })
        });

        if (!response.ok) throw new Error('Falha ao salvar');

        console.log('[Chat] ✅ Lead salvo com sucesso');
        
        // Atualizar estado
        state.clientName = name;
        state.clientPhone = phone;
        state.leadSaved = true;
        state.flowState = FLOW.CHAT;
        saveSessionData();

        // Transicionar para o chat
        renderCurrentView();
        
        // Mensagem de boas vindas personalizada
        addMessage('assistant', 'Obrigado, ' + name + '! 😊\n\nComo posso ajudar você hoje?');
        input.focus();

      } catch (e) {
        console.error('[Chat] Erro ao salvar lead:', e);
        captureError.textContent = 'Erro ao salvar. Tente novamente.';
        captureError.classList.remove('hidden');
      } finally {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Iniciar Conversa';
      }
    }

    // Event listeners do formulário
    captureBtn.addEventListener('click', submitCapture);
    nameInput.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        phoneInput.focus();
      }
    });
    phoneInput.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        submitCapture();
      }
    });

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
    // PROCESSAR MENSAGEM - IA SEMPRE RESPONDE PRIMEIRO
    // ============================================
    async function processUserMessage(text) {
      addMessage('user', text);
      setLoading(true);

      // CAPTURA DE DADOS EM PARALELO (NÃO BLOQUEANTE)
      if (!state.clientName) {
        var extractedName = extractName(text);
        if (extractedName) {
          state.clientName = extractedName;
          saveSessionData();
          console.log('[Chat] Nome capturado:', extractedName);
        }
      }

      if (!state.clientPhone) {
        var extractedPhone = extractPhone(text);
        if (extractedPhone) {
          state.clientPhone = extractedPhone;
          saveSessionData();
          console.log('[Chat] Telefone capturado:', extractedPhone);
        }
      }

      // TENTAR SALVAR LEAD ASSÍNCRONO (se tiver dados completos)
      if (state.clientName && state.clientPhone && !state.leadSaved) {
        saveLeadAsync(); // Não bloqueia!
      }

      // CHAMAR IA IMEDIATAMENTE - NUNCA BLOQUEADO
      try {
        var aiReply = await getAIResponse(text);
        setLoading(false);
        addMessage('assistant', aiReply);
      } catch (e) {
        console.error('[Chat] Erro ao processar:', e);
        setLoading(false);
        addMessage('assistant', 'Desculpe, tive um problema. Pode repetir?');
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

      // Renderizar visão correta (captura ou chat)
      renderCurrentView();

      // Se já passou pela captura e é a primeira abertura do chat
      if (state.flowState === FLOW.CHAT && state.messages.length === 0) {
        var greeting = 'Olá, ' + (state.clientName || 'Visitante') + '! 👋 Bem-vindo de volta à Supreme Empreendimentos.\n\nComo posso ajudar você hoje?';
        addMessage('assistant', greeting);
        input.focus();
      } else if (state.flowState === FLOW.CAPTURE) {
        nameInput.focus();
      } else {
        input.focus();
      }
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

    // Renderizar visão inicial
    renderCurrentView();

    // Auto-open após delay
    var autoOpenMs = CONFIG.autoOpenMs;
    if (autoOpenMs && typeof autoOpenMs === 'number') {
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

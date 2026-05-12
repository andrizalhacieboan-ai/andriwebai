document.addEventListener('DOMContentLoaded', () => {
      
  // ========================================
  // SMOOTH SCROLL REVEAL ANIMATION
  // ========================================
  const revealElements = document.querySelectorAll('.scroll-reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.1 });
  revealElements.forEach(el => observer.observe(el));

  // Share URL Logic
  const urlParams = new URLSearchParams(window.location.search);
  const shareData = urlParams.get('s');
  if (shareData) {
    try {
      const chat = JSON.parse(decodeURIComponent(escape(atob(shareData))));
      document.body.innerHTML = `
        <div class="shared-container">
          <div class="shared-header">ASM AI - Shared Chat</div>
          <h2 class="shared-title">${chat.title || 'Obrolan Baru'}</h2>
          <div class="shared-messages" id="sharedMessages"></div>
          <a href="/" class="shared-footer">Gunakan ASM AI</a>
        </div>
      `;
      const container = document.getElementById('sharedMessages');
      chat.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `shared-bubble ${msg.role}`;
        const role = msg.role === 'user' ? 'Kamu' : 'AI';
        const escapedText = document.createElement('div');
        escapedText.textContent = msg.content;
        div.innerHTML = `<strong>${role}:</strong><br>${escapedText.innerHTML.replace(/\n/g, '<br>')}`;
        container.appendChild(div);
      });
      return; // Hentikan eksekusi script lain jika ini adalah halaman share
    } catch(e) { console.error("Format URL share tidak valid", e); }
  }

  // Core Elements
  const menuBtn = document.getElementById('menuBtn');
  const sideClose = document.getElementById('sideClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sideHistory = document.getElementById('sideHistory');
  const searchHistory = document.getElementById('searchHistory');
  const sendBtn = document.getElementById('actionBtn');
  const chatInput = document.getElementById('chatInput');
  const heroSection = document.getElementById('hero');
  const chatArea = document.getElementById('chatArea');
  const chatWrap = document.getElementById('chatWrap');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  const headerChatInfo = document.getElementById('headerChatInfo');
  const headerChatTitle = document.getElementById('headerChatTitle');
  const headerChatModel = document.getElementById('headerChatModel');
  const newChatBtn = document.getElementById('newChatBtn');
  const newChatTopBtn = document.getElementById('newChatTopBtn');
  const modelSelect = document.getElementById('modelSelect');
  const fileInput = document.getElementById('fileInput');
  const attachBtn = document.getElementById('attachBtn');
  const filePreview = document.getElementById('filePreview');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const contentPrefSelect = document.getElementById('contentPrefSelect');

  let activeChatId = null;
  let isSending = false;
  let attachedFileData = null;
  let chats = JSON.parse(localStorage.getItem('asm_chats') || '[]');
  let settings = JSON.parse(localStorage.getItem('asm_settings') || '{"notifications":false, "darkMode": false, "contentPref": "general"}');

  const apiMap = {
    'glm-5': '/api/chat/gpt',
    'gemini': '/api/chat/gemini',
    'deepseek': '/api/chat/deepseek',
    'gpt': '/api/chat/chatgpt', 
    'dolphinai': '/api/chat/dolphin', 
    'aibanana': '/api/image/banana' 
  };

  const modelNames = {
    'glm-5': 'GLM-5', 'gemini': 'Gemini', 'deepseek': 'Deepseek', 'gpt': 'GPT', 'dolphinai': 'Dolphin AI', 'aibanana': 'AI Banana'
  };

  // Init Settings
  document.getElementById('notifToggle').checked = settings.notifications;
  darkModeToggle.checked = settings.darkMode;
  contentPrefSelect.value = settings.contentPref;
  applyTheme(settings.darkMode);

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
  document.getElementById('toastClose').addEventListener('click', () => toast.classList.remove('show'));

  function openModal(id) { 
    document.getElementById(id).classList.add('active'); 
    if(id === 'analyticsBackdrop') loadDashboard(); // Load data saat modal dibuka
  }
  function closeModal(id) { document.getElementById(id).classList.remove('active'); }

  document.getElementById('settingsBtn').addEventListener('click', () => openModal('settingsBackdrop'));
  document.getElementById('aboutBtn').addEventListener('click', () => openModal('aboutBackdrop'));
  document.getElementById('privacyBtn').addEventListener('click', () => openModal('privacyBackdrop'));
  document.getElementById('analyticsBtn').addEventListener('click', () => openModal('analyticsBackdrop'));
  document.getElementById('closeSettings').addEventListener('click', () => closeModal('settingsBackdrop'));
  document.getElementById('closeAbout').addEventListener('click', () => closeModal('aboutBackdrop'));
  document.getElementById('closePrivacy').addEventListener('click', () => closeModal('privacyBackdrop'));
  document.getElementById('closeAnalytics').addEventListener('click', () => closeModal('analyticsBackdrop'));
  document.getElementById('closeHistory').addEventListener('click', () => closeModal('historyBackdrop'));
  
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) el.classList.remove('active'); });
  });

  // ========================================
  // PERSONALISASI LOGIC
  // ========================================
  function applyTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]').content = isDark ? '#1a1a1a' : '#FFA500';
  }

  darkModeToggle.addEventListener('change', (e) => {
    settings.darkMode = e.target.checked;
    applyTheme(settings.darkMode);
    saveSettings();
    savePreferencesToServer();
  });

  contentPrefSelect.addEventListener('change', (e) => {
    settings.contentPref = e.target.value;
    saveSettings();
    savePreferencesToServer();
    showToast('Preferensi konten disimpan! AI akan menyesuaikan rekomendasi.');
  });

  document.getElementById('notifToggle').addEventListener('change', (e) => {
    settings.notifications = e.target.checked;
    saveSettings();
    if (e.target.checked && Notification.permission !== 'granted') Notification.requestPermission();
    showToast('Pengaturan notifikasi disimpan');
  });

  function saveSettings() { localStorage.setItem('asm_settings', JSON.stringify(settings)); }

  // ========================================
  // SUPABASE INTEGRATION (ANALYTICS & LEARNING)
  // ========================================
  let visitorId = localStorage.getItem('asm_visitor_id');
  if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem('asm_visitor_id', visitorId);
  }

  const totalUsersEl = document.getElementById('totalUsers');

  async function savePreferencesToServer() {
    try {
      await fetch('/api/stats/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, preferences: settings })
      });
    } catch(e) { console.error('Pref save error:', e); }
  }

  async function recordVisit() {
    try {
      const res = await fetch('/api/stats/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId })
      });
      const data = await res.json();
      if (data.success && data.totalUsers !== undefined) totalUsersEl.textContent = data.totalUsers.toLocaleString('id-ID');
    } catch (e) { console.error('Visit record error:', e); }
  }

  async function loadRecommendations() {
    try {
      const res = await fetch(`/api/recommendations?visitorId=${visitorId}`);
      const data = await res.json();
      if (data.success && data.recommendedModel) modelSelect.value = data.recommendedModel;
    } catch(e) { console.error('Recom load error:', e); }
  }

  async function logInteraction(model, category) {
    try {
      await fetch('/api/stats/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, model, category })
      });
    } catch(e) { console.error('Interact log error:', e); }
  }

  function triggerNotify(title, body) {
    if (settings.notifications && Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: '⚡' });
    }
  }

  // PENCARIAN CERDAS
  searchHistory.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    renderHistory(query);
  });

  // ========================================
  // DASHBOARD & REPORTING LOGIC (BARU)
  // ========================================
  let dashboardData = null;

  async function loadDashboard() {
    try {
      const res = await fetch('/api/stats/dashboard');
      dashboardData = await res.json();
      if (dashboardData.success) {
        document.getElementById('dashTotalUsers').textContent = dashboardData.totalUsers.toLocaleString('id-ID');
        document.getElementById('dashTotalInteractions').textContent = dashboardData.totalInteractions.toLocaleString('id-ID');
        renderChart('modelChart', dashboardData.modelStats);
        renderChart('categoryChart', dashboardData.categoryStats);
      }
    } catch(e) { console.error('Dashboard load error:', e); }
  }

  function renderChart(containerId, dataObj) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length > 0 ? entries[0][1] : 1;

    entries.forEach(([key, val]) => {
      const percentage = (val / maxVal) * 100;
      const label = modelNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
      const row = document.createElement('div');
      row.className = 'chart-row';
      row.innerHTML = `
        <div class="chart-label">${label}</div>
        <div class="chart-bar-bg">
          <div class="chart-bar-fill" style="width: ${percentage}%">${val}</div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  document.getElementById('downloadReportBtn').addEventListener('click', () => {
    if (!dashboardData) return showToast('Data belum dimuat');
    let csv = 'Tipe,Metric,Jumlah\n';
    csv += `Global,Total Pengunjung,${dashboardData.totalUsers}\n`;
    csv += `Global,Total Interaksi,${dashboardData.totalInteractions}\n`;
    
    Object.entries(dashboardData.modelStats).forEach(([k, v]) => {
      csv += `Model_AI,${modelNames[k] || k},${v}\n`;
    });
    Object.entries(dashboardData.categoryStats).forEach(([k, v]) => {
      csv += `Kategori,${k},${v}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `ASM_AI_Laporan_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Laporan berhasil diunduh!');
  });

  // ========================================
  // CORE CHAT LOGIC
  // ========================================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatAIText(rawText) {
    const codeBlocks = [];
    let text = rawText.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'plaintext';
      const index = codeBlocks.length;
      codeBlocks.push({lang: language, code: escapeHtml(code.trim())});
      return `%%CODEBLOCK_${index}%%`;
    });

    let safeText = escapeHtml(text);
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/\n/g, '<br>');

    codeBlocks.forEach((block, index) => {
      const codeHtml = `<div class="code-block-wrapper"><div class="code-block-header"><span>${block.lang}</span><button class="copy-code-btn" onclick="copyCodeBlock(this)">Copy</button></div><pre><code class="language-${block.lang}">${block.code}</code></pre></div>`;
      safeText = safeText.replace(`%%CODEBLOCK_${index}%%`, codeHtml);
    });

    return safeText;
  }

  function copyBubbleText(button, text) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.innerHTML;
      button.innerHTML = '✓';
      setTimeout(() => { button.innerHTML = originalText; }, 1500);
      showToast('Teks berhasil disalin');
    });
  }

  window.copyCodeBlock = function(button) {
    const codeBlock = button.closest('.code-block-wrapper').querySelector('code');
    navigator.clipboard.writeText(codeBlock.textContent).then(() => {
      button.textContent = 'Copied!';
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    });
  };

  function scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function autoResize() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
  }

  chatInput.addEventListener('input', autoResize);

  function saveChats() {
    localStorage.setItem('asm_chats', JSON.stringify(chats));
  }

  function renderHistory(searchQuery = '') {
    sideHistory.innerHTML = '';
    const reversed = [...chats].reverse();
    
    reversed.forEach(chat => {
      if (searchQuery) {
        const inTitle = chat.title.toLowerCase().includes(searchQuery);
        const inMessages = chat.messages.some(m => m.content.toLowerCase().includes(searchQuery));
        if (!inTitle && !inMessages) return;
      }

      const item = document.createElement('div');
      item.className = `history-item ${chat.id === activeChatId ? 'active' : ''}`;
      
      const text = document.createElement('span');
      text.className = 'history-text';
      text.textContent = chat.title || 'Obrolan Baru';
      text.addEventListener('click', () => loadChat(chat.id));

      const actions = document.createElement('div');
      actions.className = 'history-actions';

      const shareBtn = document.createElement('button');
      shareBtn.className = 'hist-act-btn';
      shareBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
      shareBtn.addEventListener('click', (e) => { e.stopPropagation(); shareChat(chat.id); });

      const delBtn = document.createElement('button');
      delBtn.className = 'hist-act-btn del';
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteChat(chat.id); });

      actions.appendChild(shareBtn);
      actions.appendChild(delBtn);
      item.appendChild(text);
      item.appendChild(actions);
      sideHistory.appendChild(item);
    });
  }

  function loadChat(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    
    activeChatId = id;
    modelSelect.value = chat.model;
    headerChatInfo.style.display = 'flex';
    headerChatTitle.textContent = chat.title;
    headerChatModel.textContent = modelNames[chat.model];

    heroSection.style.display = 'none';
    chatArea.style.display = 'block';
    chatWrap.innerHTML = '';

    chat.messages.forEach(msg => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-bubble-wrapper';
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${msg.role}`;
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-bubble-btn';
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      copyBtn.onclick = () => copyBubbleText(copyBtn, msg.content);

      if (msg.role === 'user') bubble.textContent = msg.content;
      else if (msg.isImage) bubble.innerHTML = msg.content;
      else {
        bubble.innerHTML = formatAIText(msg.content);
        if(window.Prism) Prism.highlightAllUnder(bubble);
      }

      wrapper.appendChild(bubble);
      wrapper.appendChild(copyBtn);
      chatWrap.appendChild(wrapper);
    });
    
    scrollToBottom();
    toggleSidebar();
    renderHistory(searchHistory.value);
  }

  function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    saveChats();
    if (activeChatId === id) newChat();
    renderHistory(searchHistory.value);
    showToast('Riwayat dihapus');
  }

  function generateShareURL(data) {
    try {
      const jsonStr = JSON.stringify(data);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      return window.location.origin + window.location.pathname + "?s=" + base64;
    } catch(e) { return null; }
  }

  function shareChat(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    const url = generateShareURL(chat);
    if (url && url.length < 2000) {
      navigator.clipboard.writeText(url).then(() => showToast('URL Berhasil disalin!'));
    } else {
      showToast('Obrolan terlalu panjang untuk jadi URL, disalin sebagai teks.');
      let text = `ASM AI - ${chat.title}\n\n`;
      chat.messages.forEach(msg => { text += `[${msg.role === 'user' ? 'Kamu' : 'AI'}]:\n${msg.content}\n\n`; });
      navigator.clipboard.writeText(text);
    }
  }

  document.getElementById('shareHistoryBtn').addEventListener('click', () => {
    const url = generateShareURL(chats);
    if (url && url.length < 2000) {
      navigator.clipboard.writeText(url).then(() => { showToast('URL Semua Riwayat disalin!'); closeModal('historyBackdrop'); });
    } else { showToast('Riwayat terlalu panjang untuk jadi URL.'); }
  });

  document.getElementById('deleteHistoryBtn').addEventListener('click', () => {
    if(confirm('Yakin ingin menghapus semua riwayat?')) {
      chats = [];
      saveChats();
      newChat();
      renderHistory();
      closeModal('historyBackdrop');
      showToast('Semua riwayat terhapus');
    }
  });

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    filePreview.style.display = 'flex';
    if (file.type.startsWith('image/')) {
      reader.onload = (ev) => {
        attachedFileData = { name: file.name, type: 'image', content: ev.target.result };
        filePreview.innerHTML = `<span>📷 ${file.name}</span><button class="remove-file" id="removeFile">✕</button>`;
        document.getElementById('removeFile').addEventListener('click', removeFile);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (ev) => {
        attachedFileData = { name: file.name, type: 'text', content: ev.target.result };
        filePreview.innerHTML = `<span>📄 ${file.name}</span><button class="remove-file" id="removeFile">✕</button>`;
        document.getElementById('removeFile').addEventListener('click', removeFile);
      };
      reader.readAsText(file);
    }
  });

  function removeFile() {
    attachedFileData = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
    filePreview.innerHTML = '';
  }

  function newChat() {
    heroSection.style.display = 'flex';
    chatArea.style.display = 'none';
    chatWrap.innerHTML = '';
    activeChatId = null;
    headerChatInfo.style.display = 'none';
    chatInput.value = '';
    chatInput.style.height = 'auto';
    removeFile();
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('active');
  }

  newChatBtn.addEventListener('click', newChat);
  newChatTopBtn.addEventListener('click', newChat);

  const toggleSidebar = () => {
    sidebar.classList.toggle('open');
    sidebarBackdrop.classList.toggle('active');
  };
  menuBtn.addEventListener('click', toggleSidebar);
  sideClose.addEventListener('click', toggleSidebar);
  sidebarBackdrop.addEventListener('click', toggleSidebar);

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text && !attachedFileData) return;
    if (isSending) return;

    isSending = true;
    sendBtn.disabled = true;

    let finalText = text;
    let interactionCategory = 'general';

    if (attachedFileData) {
      if (attachedFileData.type === 'image') {
        finalText = `[Gambar terlampir: ${attachedFileData.name}]\n\n${text}`;
        interactionCategory = 'image';
      } else {
        finalText = `[File terlampir: ${attachedFileData.name}]\n\`\`\`\n${attachedFileData.content.substring(0, 2000)}\n\`\`\`\n\n${text}`;
        interactionCategory = 'coding';
      }
      removeFile();
    }

    if (text.toLowerCase().includes('kode') || text.toLowerCase().includes('script')) interactionCategory = 'coding';
    else if (text.toLowerCase().includes('gambar') || text.toLowerCase().includes('buat visual')) interactionCategory = 'image';
    else if (text.toLowerCase().includes('rencana') || text.toLowerCase().includes('jadwal')) interactionCategory = 'planning';

    heroSection.style.display = 'none';
    chatArea.style.display = 'block';

    if (!activeChatId) {
      activeChatId = generateUUID();
      const title = finalText.substring(0, 40) + (finalText.length > 40 ? '...' : '');
      chats.push({ id: activeChatId, title: title, model: modelSelect.value, messages: [], timestamp: Date.now() });
      headerChatInfo.style.display = 'flex';
      headerChatTitle.textContent = title;
      headerChatModel.textContent = modelNames[modelSelect.value];
      renderHistory(searchHistory.value);
    }

    const currentChat = chats.find(c => c.id === activeChatId);
    currentChat.messages.push({ role: 'user', content: finalText });
    saveChats();

    const userWrapper = document.createElement('div');
    userWrapper.className = 'chat-bubble-wrapper';
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.textContent = text || 'Mengirim file...';
    const userCopyBtn = document.createElement('button');
    userCopyBtn.className = 'copy-bubble-btn';
    userCopyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    userCopyBtn.onclick = () => copyBubbleText(userCopyBtn, finalText);
    
    userWrapper.appendChild(userBubble);
    userWrapper.appendChild(userCopyBtn);
    chatWrap.appendChild(userWrapper);
    
    chatInput.value = '';
    chatInput.style.height = 'auto';
    scrollToBottom();

    const aiWrapper = document.createElement('div');
    aiWrapper.className = 'chat-bubble-wrapper';
    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai';
    const loadingDots = document.createElement('span');
    loadingDots.className = 'loading-dots';
    loadingDots.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    aiBubble.appendChild(loadingDots);
    aiWrapper.appendChild(aiBubble);
    chatWrap.appendChild(aiWrapper);
    scrollToBottom();

    const startTime = Date.now();
    const selectedModel = modelSelect.value;
    const endpoint = apiMap[selectedModel];

    try {
      const body = { message: finalText };
      if (selectedModel === 'gemini') body.sessionId = activeChatId;
      if (selectedModel === 'chatgpt' || selectedModel === 'dolphinai') {
        body.history = currentChat.messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
        if (selectedModel === 'chatgpt' && attachedFileData && attachedFileData.type === 'image') body.imageBase64 = attachedFileData.content;
      }

      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      
      if(response.status === 429) {
         const errData = await response.json();
         aiBubble.textContent = errData.error || '🚫 Terlalu banyak permintaan. Coba lagi nanti.';
         currentChat.messages.push({ role: 'ai', content: 'Rate limited.' });
         throw new Error('Rate limited');
      }

      const data = await response.json();
      
      if (data.success) {
        if (selectedModel === 'aibanana') {
          let imageHtml = "";
          let imgUrl = null;
          if (data.data) {
            const resData = data.data;
            if (typeof resData === 'string') imgUrl = resData;
            else if (resData.images && resData.images[0]) imgUrl = resData.images[0].url || resData.images[0];
            else if (resData.data && resData.data[0]) imgUrl = resData.data[0].url || resData.data[0].b64_json || resData.data[0];
            else if (resData.url) imgUrl = resData.url;
            else if (resData.image) imgUrl = resData.image;
            else if (resData.output) imgUrl = resData.output;
            else if (resData.result) imgUrl = typeof resData.result === 'string' ? resData.result : resData.result.url || resData.result.image;
          }
          if (imgUrl) {
            if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) imgUrl = 'data:image/png;base64,' + imgUrl;
            imageHtml = `<img src="${imgUrl}" alt="AI Generated Image" style="max-width:100%; border-radius:8px; border: 3px solid var(--black); box-shadow: 4px 4px 0 var(--black);">`;
          } else {
            imageHtml = "<strong>⚠️ Gambar berhasil dibuat, tapi format API tidak dikenali.</strong><br>Raw Response:<br><pre style='max-height:200px; overflow:auto; text-align:left; font-size:10px;'>" + escapeHtml(JSON.stringify(data.data, null, 2)) + "</pre>";
          }
          aiBubble.innerHTML = imageHtml;
          currentChat.messages.push({ role: 'ai', content: imageHtml, isImage: true });
        } else {
          let aiText = data.text || '';
          let cleaned = aiText.replace(/<think[\s\S]*?<\/think>/gi, '').trim();
          let formatted = formatAIText(cleaned);
          if (formatted) {
            aiBubble.innerHTML = formatted;
            if(window.Prism) Prism.highlightAllUnder(aiBubble);
            currentChat.messages.push({ role: 'ai', content: cleaned });
          } else {
            aiBubble.textContent = 'Tidak ada respons.';
            currentChat.messages.push({ role: 'ai', content: 'Tidak ada respons.' });
          }
        }
        logInteraction(selectedModel, interactionCategory);
      } else {
        aiBubble.textContent = 'Error: ' + (data.error || 'Terjadi kesalahan');
        currentChat.messages.push({ role: 'ai', content: 'Error: ' + data.error });
      }
    } catch (err) {
      if(err.message !== 'Rate limited') {
         aiBubble.textContent = 'Gagal terhubung ke server.';
         currentChat.messages.push({ role: 'ai', content: 'Gagal terhubung ke server.' });
      }
    }

    saveChats();
    renderHistory(searchHistory.value);
    
    const duration = Date.now() - startTime;
    if (duration > 10000) triggerNotify('ASM AI', 'AI telah selesai menjawab.');

    isSending = false;
    sendBtn.disabled = false;
    scrollToBottom();
  }

  sendBtn.addEventListener('click', sendMessage);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      const len = chatInput.value.length;
      const pos = chatInput.selectionStart;
      if (pos === len && len > 0) { e.preventDefault(); sendMessage(); }
    }
  });

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  window.fillInput = function(text) {
    chatInput.value = text;
    chatInput.focus();
    autoResize();
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW Registered:', reg.scope)).catch(err => console.error('SW Registration failed:', err));
    });
  }
  
  // Init APIs
  recordVisit();
  loadRecommendations();
  renderHistory();
});

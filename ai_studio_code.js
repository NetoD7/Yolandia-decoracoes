// ============ SISTEMA DE SINCRONIZAÇÃO DEFINITIVO ============
let isSyncing = false;
let isAppLoaded = false;

// 1. CARREGAR (Lê a nuvem)
async function loadFromSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?id=eq.yolandia_main&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) return false;
    
    const rows = await response.json();
    if (rows && rows.length > 0) {
      DB = rows[0].payload;
      console.log('✅ Nuvem carregada');
      return true;
    }
  } catch (e) {
    console.error('Erro ao carregar:', e);
  }
  return false;
}

// 2. GUARDAR (Atualiza Main e cria Histórico)
async function saveToSupabase() {
  if (!isAppLoaded || !DB || isSyncing) return;
  isSyncing = true;

  const timestamp = new Date().toISOString();
  const histId = `hist_${timestamp.replace(/[:.]/g, '-')}`;

  try {
    // Grava o estado principal
    await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: 'yolandia_main', payload: DB, updated_at: timestamp })
    });

    // Grava uma cópia de segurança (Histórico)
    await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: histId, payload: DB, updated_at: timestamp })
    });

    console.log('☁️ Sincronizado:', histId);
  } catch (e) {
    console.error('Falha na rede ao salvar:', e);
  } finally {
    isSyncing = false;
  }
}

// 3. INICIALIZAÇÃO SEGURA
async function loadDB() {
  // Tenta carregar da nuvem primeiro
  const cloudOk = await loadFromSupabase();
  const localRaw = localStorage.getItem(STORAGE_KEY);

  if (cloudOk) {
    isAppLoaded = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  } else if (localRaw) {
    // Se a nuvem falhar, usa o local mas avisa
    DB = JSON.parse(localRaw);
    isAppLoaded = true;
    toast('A carregar dados locais (Nuvem inacessível)', 'warn');
  } else {
    // Sistema novo
    DB = seedData();
    isAppLoaded = true;
    saveDB();
  }
  migrateDB();
}

// 4. GRAVAR (Local + Disparar Nuvem)
function saveDB() {
  if (!isAppLoaded || !DB) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  saveToSupabase(); 
}

// 5. BOTÃO SINCRONIZAR (🔄) 
async function forceSync() {
  const btn = document.getElementById('syncBtn');
  if (btn) btn.style.animation = 'spin 1s linear infinite';
  
  toast('A atualizar dados...', 'info');
  
  // Força o carregamento da nuvem para o browser
  const ok = await loadFromSupabase();
  if (ok) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    // Recarrega a página ou a vista atual para mostrar os novos dados
    if (typeof currentView !== 'undefined') navigate(currentView);
    toast('Sincronização concluída!', 'ok');
  } else {
    toast('Erro de ligação. Verifique a internet.', 'err');
  }
  
  if (btn) btn.style.animation = '';
}
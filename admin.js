/**
 * Admin Panel — Vanilla JS
 * - LocalStorage-based auth
 * - Read/Write tools via localStorage override
 * - Instant reflection on frontend using storage events
 */
(function () {
  const LS_AUTH = 'admin_auth';
  const LS_CREDS = 'admin_creds';
  const LS_TOOLS = 'tools_override';

  function initCreds() {
    const c = JSON.parse(localStorage.getItem(LS_CREDS) || '{}');
    if (!c.username || !c.password) {
      localStorage.setItem(LS_CREDS, JSON.stringify({ username: 'admin', password: 'admin123' }));
    }
  }
  initCreds();

  function login(username, password) {
    const creds = JSON.parse(localStorage.getItem(LS_CREDS) || '{}');
    if (username === creds.username && password === creds.password) {
      localStorage.setItem(LS_AUTH, JSON.stringify({ token: 'ok', at: Date.now() }));
      location.href = 'dashboard.html';
    } else {
      alert('Invalid credentials');
    }
  }

  function protect() {
    const auth = JSON.parse(localStorage.getItem(LS_AUTH) || '{}');
    if (!auth.token) {
      location.href = 'login.html';
    }
  }

  async function getBaseTools() {
    try {
      const res = await fetch('../tools.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch {
      return [];
    }
  }

  async function getTools() {
    const override = JSON.parse(localStorage.getItem(LS_TOOLS) || '[]');
    if (override.length) return override;
    return await getBaseTools();
  }

  async function setTools(tools) {
    localStorage.setItem(LS_TOOLS, JSON.stringify(tools));
    window.dispatchEvent(new StorageEvent('storage', { key: LS_TOOLS }));
    alert('Saved. Frontend will reflect changes immediately.');
  }

  function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  async function mount() {
    // Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem(LS_AUTH);
        location.href = 'login.html';
      });
    }

    const fileInput = document.getElementById('jsonFile');
    const fileName = document.getElementById('fileName');
    const importError = document.getElementById('importError');
    const previewBody = document.getElementById('previewBody');
    const previewCount = document.getElementById('previewCount');
    const startImport = document.getElementById('startImport');
    const importProgress = document.getElementById('importProgress');
    let parsedData = [];
    const sanitizeFileText = (s) => (s || '').replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const normalizeUrlFile = (u) => {
      try { const url = new URL(u); url.hash=''; url.pathname=url.pathname.replace(/\/+$/, ''); return url.toString(); } catch { return ''; }
    };
    const domainFromUrlFile = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
    const faviconForFile = (u) => { const host = domainFromUrlFile(u); return host ? `https://www.google.com/s2/favicons?domain=${host}` : ''; };
    const isBoolFile = (v) => typeof v === 'boolean';
    const isStrFile = (v) => typeof v === 'string' && v.trim().length > 0;
    function validateItemFile(item) {
      const name = item.name;
      const rawUrl = item.url || item.website;
      const url = normalizeUrlFile(rawUrl || '');
      const category = item.category;
      if (!isStrFile(name) || !isStrFile(url) || !isStrFile(category)) return null;
      return {
        id: item.id || generateId(),
        name: String(name).trim(),
        category: String(category).trim(),
        description: isStrFile(item.description) ? String(item.description).trim() : '',
        website: url,
        pricing_text: isStrFile(item.pricing) ? String(item.pricing).trim() : '',
        verified: isBoolFile(item.verified) ? item.verified : false,
        featured: isBoolFile(item.featured) ? item.featured : false,
        logo: isStrFile(item.logo) ? item.logo : faviconForFile(url)
      };
    }
    function renderPreviewTable(arr) {
      if (!previewBody) return;
      previewBody.innerHTML = '';
      arr.slice(0, 1000).forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${t.name}</td><td>${t.category}</td><td>${t.pricing_text || ''}</td><td>${t.verified ? 'Yes' : 'No'}</td>`;
        previewBody.appendChild(tr);
      });
      if (previewCount) previewCount.textContent = `${arr.length} tools`;
    }
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        if (importError) importError.textContent = '';
        if (previewBody) previewBody.innerHTML = '';
        if (previewCount) previewCount.textContent = '0 tools';
        if (startImport) startImport.disabled = true;
        if (importProgress) importProgress.textContent = '';
        const f = fileInput.files[0];
        if (!f) return;
        if (fileName) fileName.textContent = f.name;
        if (!/\.json$/i.test(f.name)) {
          if (importError) importError.textContent = 'Invalid file type. Please select a .json file.';
          return;
        }
        try {
          const text = await f.text();
          const cleaned = sanitizeFileText(text);
          const data = JSON.parse(cleaned);
          if (!Array.isArray(data)) {
            if (importError) importError.textContent = 'JSON must be an array of tools.';
            return;
          }
          const valid = [];
          const skipped = [];
          data.forEach(item => {
            const t = validateItemFile(item);
            if (t) valid.push(t); else skipped.push(item);
          });
          parsedData = valid;
          renderPreviewTable(valid);
          if (startImport) startImport.disabled = valid.length === 0;
          if (skipped.length && importError) {
            importError.textContent = `Skipped ${skipped.length} items missing required fields.`;
          }
        } catch {
          if (importError) importError.textContent = 'Invalid JSON file. Please upload valid JSON.';
        }
      });
    }
    if (startImport) {
      startImport.addEventListener('click', async () => {
        if (!parsedData.length) return;
        startImport.disabled = true;
        if (importProgress) importProgress.textContent = 'Importing…';
        const existing = await getTools();
        const nameSet = new Set(existing.map(t => (t.name || '').toLowerCase()));
        const urlSet = new Set(existing.map(t => normalizeUrlFile(t.website || t.url)).filter(Boolean));
        const added = [];
        const duplicates = [];
        const batchSize = 500;
        for (let i = 0; i < parsedData.length; i += batchSize) {
          const batch = parsedData.slice(i, i + batchSize);
          batch.forEach(t => {
            const n = (t.name || '').toLowerCase();
            const u = normalizeUrlFile(t.website || t.url);
            if (nameSet.has(n) || urlSet.has(u)) {
              duplicates.push(t);
            } else {
              added.push(t);
              nameSet.add(n);
              urlSet.add(u);
            }
          });
          if (importProgress) importProgress.textContent = `Importing… ${Math.min(i + batchSize, parsedData.length)}/${parsedData.length}`;
          await new Promise(r => setTimeout(r, 0));
        }
        const merged = [...added, ...existing];
        await setTools(merged);
        if (importProgress) importProgress.textContent = `✅ ${added.length} AI tools imported successfully • Skipped ${duplicates.length} duplicates`;
        alert(`✅ ${added.length} AI tools imported successfully\nSkipped duplicates: ${duplicates.length}`);
        renderManage();
        renderDashboard();
      });
    }
    // Credentials update
    const credForm = document.getElementById('credForm');
    if (credForm) {
      const c = JSON.parse(localStorage.getItem(LS_CREDS) || '{}');
      document.getElementById('cred-username').value = c.username || '';
      document.getElementById('cred-password').value = c.password || '';
      credForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('cred-username').value.trim();
        const p = document.getElementById('cred-password').value;
        localStorage.setItem(LS_CREDS, JSON.stringify({ username: u, password: p }));
        alert('Credentials saved.');
      });
    }

    // Export/Import
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const data = await getTools();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tools-export.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    if (importBtn) {
      importBtn.addEventListener('click', async () => {
        const raw = prompt('Paste JSON array of tools:');
        if (!raw) return;
        const sanitize = (s) => (s || '')
          .replace(/^\uFEFF/, '')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim();
        const domainFromUrl = (u) => {
          try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
        };
        const normalizeUrl = (u) => {
          try {
            const url = new URL(u);
            url.hash = '';
            let p = url.pathname.replace(/\/+$/, '');
            if (!p) p = '';
            url.pathname = p;
            return url.toString();
          } catch { return ''; }
        };
        const faviconFor = (u) => {
          const host = domainFromUrl(u);
          return host ? `https://www.google.com/s2/favicons?domain=${host}` : '';
        };
        const isBool = (v) => typeof v === 'boolean';
        const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
        const showStatus = (() => {
          let el = document.getElementById('importStatus');
          if (!el) {
            el = document.createElement('div');
            el.id = 'importStatus';
            el.style.position = 'fixed';
            el.style.right = '16px';
            el.style.bottom = '16px';
            el.style.zIndex = '1000';
            el.style.padding = '12px 14px';
            el.style.border = '1px solid #e7ebf0';
            el.style.borderRadius = '12px';
            el.style.background = '#ffffff';
            el.style.boxShadow = '0 10px 28px rgba(0,0,0,0.12)';
            el.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
            el.style.fontSize = '13px';
            document.body.appendChild(el);
          }
          return (msg) => { el.textContent = msg; };
        })();
        let text = sanitize(raw);
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          alert('Invalid JSON format');
          return;
        }
        if (!Array.isArray(parsed)) {
          alert('JSON must be an array of tools');
          return;
        }
        const existing = await getTools();
        const urlSet = new Set(
          existing
            .map(t => t.website || t.url || '')
            .map(normalizeUrl)
            .filter(Boolean)
        );
        const batchSize = 500;
        const incoming = parsed.slice();
        const added = [];
        const duplicates = [];
        const skippedMissing = [];
        let processed = 0;
        const processBatch = async (batch) => {
          for (const item of batch) {
            const name = item.name;
            const rawUrl = item.website || item.url;
            const url = normalizeUrl(rawUrl || '');
            const category = item.category;
            if (!isStr(name) || !isStr(url) || !isStr(category)) {
              skippedMissing.push(item);
              continue;
            }
            if (urlSet.has(url)) {
              duplicates.push(item);
              continue;
            }
            const tool = {
              id: item.id || generateId(),
              name: String(name).trim(),
              description: isStr(item.description) ? String(item.description).trim() : '',
              category: String(category).trim(),
              website: url,
              featured: isBool(item.featured) ? item.featured : false,
              logo: isStr(item.logo) ? item.logo : faviconFor(url)
            };
            const extras = Object.keys(item).reduce((acc, k) => {
              if (!(k in tool)) acc[k] = item[k];
              return acc;
            }, {});
            added.push({ ...tool, ...extras });
            urlSet.add(url);
          }
          processed += batch.length;
          showStatus(`Importing… ${processed}/${incoming.length}`);
          await new Promise(r => setTimeout(r, 0));
        };
        for (let i = 0; i < incoming.length; i += batchSize) {
          const batch = incoming.slice(i, i + batchSize);
          await processBatch(batch);
        }
        const merged = [...added, ...existing];
        await setTools(merged);
        showStatus(`Import complete: +${added.length} added, ${duplicates.length} duplicates, ${skippedMissing.length} skipped`);
        alert(`Import complete\nAdded: ${added.length}\nDuplicates: ${duplicates.length}\nSkipped (missing fields): ${skippedMissing.length}`);
        renderManage();
        renderDashboard();
      });
    }

    // Add Tool
    const addForm = document.getElementById('addForm');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tools = await getTools();
        const tool = {
          id: generateId(),
          name: document.getElementById('add-name').value.trim(),
          description: document.getElementById('add-description').value.trim(),
          category: document.getElementById('add-category').value.trim(),
          section: document.getElementById('add-section').value.trim(),
          website: document.getElementById('add-website').value.trim(),
          pricing_text: document.getElementById('add-pricing').value.trim(),
          featured: document.getElementById('add-featured').checked,
          top: document.getElementById('add-top').checked,
          verified: document.getElementById('add-verified').checked,
          logo: '', upvotes: 0
        };
        tools.unshift(tool);
        await setTools(tools);
        addForm.reset();
        renderManage();
        renderDashboard();
      });
    }

    // Filters and table actions
    const qEl = document.getElementById('filter-q');
    const cEl = document.getElementById('filter-category');
    const sEl = document.getElementById('filter-section');
    [qEl, cEl, sEl].forEach(el => el && el.addEventListener('input', renderManage));

    renderManage();
    renderDashboard();
  }

  async function renderDashboard() {
    const tools = await getTools();
    document.getElementById('stat-total').textContent = String(tools.length);
    document.getElementById('stat-featured').textContent = String(tools.filter(t => t.featured).length);
    document.getElementById('stat-categories').textContent = String(new Set(tools.map(t => t.category)).size);
    const latestList = document.getElementById('stat-latest');
    latestList.innerHTML = '';
    tools.slice(0, 5).forEach(t => {
      const li = document.createElement('li');
      li.textContent = t.name;
      latestList.appendChild(li);
    });
  }

  async function renderManage() {
    const tools = await getTools();
    const q = (document.getElementById('filter-q')?.value || '').toLowerCase();
    const cat = (document.getElementById('filter-category')?.value || '').toLowerCase();
    const sec = (document.getElementById('filter-section')?.value || '').toLowerCase();
    const rows = document.getElementById('toolsRows');
    rows.innerHTML = '';
    tools
      .filter(t => (!q || t.name.toLowerCase().includes(q)))
      .filter(t => (!cat || (t.category || '').toLowerCase().includes(cat)))
      .filter(t => (!sec || (t.section || '').toLowerCase().includes(sec)))
      .slice(0, 1000)
      .forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${t.name}</td>
          <td>${t.category || ''}</td>
          <td>${t.section || ''}</td>
          <td><a href="${t.website}" target="_blank" rel="noopener">${t.website}</a></td>
          <td>${t.featured ? 'Featured ' : ''}${t.top ? 'Top ' : ''}${t.verified ? 'Verified' : ''}</td>
          <td class="tbl-actions">
            <button data-action="edit">Edit</button>
            <button data-action="delete">Delete</button>
          </td>
        `;
        tr.querySelector('[data-action="edit"]').addEventListener('click', async () => {
          const name = prompt('Name', t.name); if (name === null) return;
          const desc = prompt('Description', t.description); if (desc === null) return;
          const category = prompt('Category', t.category); if (category === null) return;
          const section = prompt('Section', t.section || ''); if (section === null) return;
          const website = prompt('Website', t.website); if (website === null) return;
          const pricing = prompt('Pricing Text', t.pricing_text || ''); if (pricing === null) return;
          const featured = confirm('Set Featured? OK=yes, Cancel=no');
          const top = confirm('Set Top? OK=yes, Cancel=no');
          const verified = confirm('Set Verified? OK=yes, Cancel=no');
          const arr = await getTools();
          const idx = arr.findIndex(x => x.id === t.id);
          if (idx >= 0) {
            arr[idx] = { ...arr[idx], name, description: desc, category, section, website, pricing_text: pricing, featured, top, verified };
            await setTools(arr);
            renderManage();
            renderDashboard();
          }
        });
        tr.querySelector('[data-action="delete"]').addEventListener('click', async () => {
          if (!confirm('Delete this tool?')) return;
          const arr = await getTools();
          const idx = arr.findIndex(x => x.id === t.id);
          if (idx >= 0) {
            arr.splice(idx, 1);
            await setTools(arr);
            renderManage();
            renderDashboard();
          }
        });
        rows.appendChild(tr);
      });
  }

  window.Admin = {
    login, protect, mount,
  };
})();

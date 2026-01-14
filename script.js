/**
 * AI Tools Directory — Vanilla JS
 * Features:
 *  - Live search
 *  - Filter by category
 *  - Fast client-side rendering
 *  - Smooth hover and fade-in animations
 *  - Beginner-friendly comments
 */

// ---------- Utility: DOM helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Data: categories and tools ----------
// Base categories displayed as chips. New categories in data will auto-merge.
const baseCategories = ["All", "AI Writing", "Image", "Video", "Coding", "Marketing"];

// Example tools data. Add new tools using the same object shape.
// Tip: logo uses Clearbit or a placeholder; all images are lazy-loaded.
let toolsData = [
  {
    name: "ChatGPT",
    description: "AI chatbot for writing, coding, and problem solving.",
    category: "AI Writing",
    url: "https://chat.openai.com",
    logo: "https://via.placeholder.com/80"
  },
  {
    name: "Claude",
    description: "Helpful, honest AI assistant for writing and research.",
    category: "AI Writing",
    url: "https://claude.ai/",
    logo: "https://logo.clearbit.com/anthropic.com"
  },
  {
    name: "Midjourney",
    description: "AI image generation tool using text prompts.",
    category: "Image",
    url: "https://www.midjourney.com",
    logo: "https://via.placeholder.com/80"
  },
  {
    name: "Stable Diffusion",
    description: "Open-source image generation for creative workflows.",
    category: "Image",
    url: "https://stability.ai/",
    logo: "https://logo.clearbit.com/stability.ai"
  },
  {
    name: "Runway",
    description: "AI video editing and generation platform.",
    category: "Video",
    url: "https://runwayml.com",
    logo: "https://via.placeholder.com/80"
  },
  {
    name: "Descript",
    description: "Edit video like a doc with AI-powered features.",
    category: "Video",
    url: "https://www.descript.com/",
    logo: "https://logo.clearbit.com/descript.com"
  },
  {
    name: "GitHub Copilot",
    description: "AI pair programmer that helps you write code faster.",
    category: "Coding",
    url: "https://github.com/features/copilot",
    logo: "https://logo.clearbit.com/github.com"
  },
  {
    name: "Tabnine",
    description: "AI code completions for multiple languages and IDEs.",
    category: "Coding",
    url: "https://www.tabnine.com/",
    logo: "https://logo.clearbit.com/tabnine.com"
  },
  {
    name: "Jasper",
    description: "AI content platform for marketing and copywriting.",
    category: "Marketing",
    url: "https://www.jasper.ai/",
    logo: "https://logo.clearbit.com/jasper.ai"
  },
  {
    name: "Notion AI",
    description: "AI-powered writing and organization inside Notion.",
    category: "AI Writing",
    url: "https://www.notion.so/product/ai",
    logo: "https://logo.clearbit.com/notion.so"
  },
  {
    name: "Canva Magic Write",
    description: "Generate text and design with AI in Canva.",
    category: "Marketing",
    url: "https://www.canva.com/features/ai/",
    logo: "https://logo.clearbit.com/canva.com"
  },
  {
    name: "Cursor",
    description: "AI code editor with chat and inline assistance.",
    category: "Coding",
    url: "https://cursor.com/",
    logo: "https://logo.clearbit.com/cursor.com"
  }
];

// ---------- State ----------
let selectedCategory = "All";
let searchQuery = "";
let verifiedOnly = false;
let selectedPricing = "";

// ---------- Normalization helpers ----------
const clean = (v) => typeof v === "string" ? v.replace(/`/g, "").trim() : v;
const domainFromUrl = (u) => {
  try { return new URL(u).hostname; } catch { return ""; }
};
const nameFromUrl = (u) => {
  try {
    const a = new URL(u);
    const host = a.hostname.replace(/^www\./, '');
    const sld = host.replace(/\.[^.]+$/, '');
    const parts = a.pathname.split('/').filter(Boolean);
    const last = parts.length ? parts[parts.length - 1] : '';
    const base = last && last.length > 1 ? `${sld}/${last}` : sld;
    return base;
  } catch {
    return "";
  }
};
const deriveLogo = (website, providedLogo) => {
  const pl = clean(providedLogo);
  if (pl && /^https?:\/\//.test(pl)) return pl;
  const host = domainFromUrl(clean(website));
  return host ? `https://logo.clearbit.com/${host}` : "https://placehold.co/56x56/eeeeee/666666?text=AI";
};
const normalizeCategory = (cat) => {
  const c = clean(cat);
  return c || "Other";
};
const normalizeTool = (t) => ({
  id: t.id,
  name: clean(t.name) || nameFromUrl(clean(t.website || t.url)),
  description: clean(t.description) || `Professional ${normalizeCategory(t.category)} tool for enhanced productivity.`,
  category: normalizeCategory(t.category),
  url: clean(t.website || t.url),
  logo: deriveLogo(t.website || t.url, t.logo),
  upvotes: Number(t.upvotes || 0),
  featured: Boolean(t.featured),
  top: Boolean(t.top),
  verified: Boolean(t.verified),
  pricing_text: clean(t.pricing_text || ""),
  section: clean(t.section || ""),
  order_index: Number(t.order_index ?? 0),
  status: clean(t.status || "Active")
});

// ---------- Loading from tools.json ----------
async function loadToolsFromJson() {
  try {
    const override = localStorage.getItem('tools_override');
    if (override) {
      const arr = JSON.parse(override);
      if (Array.isArray(arr) && arr.length) {
        const normalized = arr.map(normalizeTool);
        if (normalized.length) {
          toolsData = normalized;
          return;
        }
      }
    }
    const res = await fetch("tools.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const normalized = Array.isArray(raw) ? raw.map(normalizeTool) : [];
    if (normalized.length) toolsData = normalized;
  } catch {
    // Fallback to built-in toolsData
  }
}

// ---------- Rendering: categories ----------
function renderCategories() {
  const chipsWrap = $("#category-chips");
  if (!chipsWrap) return;
  chipsWrap.innerHTML = "";

  // Merge base categories with any found in toolsData
  const dynamicCats = Array.from(new Set(toolsData.map(t => t.category)));
  const categories = Array.from(new Set([...baseCategories, ...dynamicCats]));

  categories.forEach(cat => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("role", "tab");
    chip.dataset.category = cat;
    chip.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span>${cat}</span>
    `;
    if (cat === selectedCategory) chip.classList.add("active");
    chip.addEventListener("click", () => {
      selectedCategory = cat;
      // Update active styling
      $$(".chip", chipsWrap).forEach(c => c.classList.toggle("active", c.dataset.category === selectedCategory));
      // Re-render tools
      renderTools();
      // Update URL (non-breaking)
      const url = new URL(location);
      url.searchParams.set("category", selectedCategory);
      history.replaceState(null, "", url);
    });
    chipsWrap.appendChild(chip);
  });
}

// ---------- Rendering: tools ----------
function renderTools() {
  const grid = $("#tools-grid");
  const empty = $("#empty-state");
  grid.setAttribute("aria-busy", "true");

  const filtered = applyFilters(toolsData);

  // Render cards
  grid.innerHTML = "";
  if (filtered.length === 0) {
    empty.hidden = false;
  } else {
    empty.hidden = true;
    filtered.forEach(tool => {
      const card = document.createElement("article");
      card.className = "card fade-in";
      card.setAttribute("data-tool", tool.name);
      card.setAttribute("aria-label", `${tool.name} — ${tool.category}`);
      const ribbon = tool.top ? `<span class="ribbon">TOP</span>` : "";
      const featuredBadge = tool.featured ? `<span class="badge-featured">Featured</span>` : "";
      const verified = tool.verified ? `<span class="verified" aria-label="Verified">✔</span>` : "";
      const pricing = tool.pricing_text ? `<div class="pricing">${tool.pricing_text}</div>` : "";
      card.innerHTML = `
        ${ribbon}
        <div class="card-top">
          <div class="upvote" aria-label="Upvotes">↑ ${tool.upvotes}</div>
          <div class="top-right">${featuredBadge}</div>
        </div>
        <div class="identity">
          <div class="avatar-wrap">
            <img 
              class="avatar"
              src="${tool.logo}" 
              alt="${tool.name} logo" 
              loading="lazy"
              onerror="this.src='https://placehold.co/72x72/eeeeee/666666?text=AI';this.onerror=null;"
            />
          </div>
          <h3 class="name">${tool.name}${verified}</h3>
        </div>
        <p class="desc quoted">"${tool.description}"</p>
        <div class="meta-line">
          <span class="tag" data-category="${tool.category}">
            <span class="dot" aria-hidden="true"></span>
            <span>${tool.category}</span>
          </span>
          <span class="status">Active</span>
        </div>
        ${pricing}
        <div class="actions">
          <a class="btn-visit" href="${tool.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${tool.name}">
            VISIT
            <svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  grid.setAttribute("aria-busy", "false");
}

function pricingTypeOf(t) {
  const p = (t.pricing_type || t.pricing_text || "").toLowerCase();
  if (!p) return "";
  if (p.includes("freemium")) return "Freemium";
  if (p.includes("trial")) return "Trial";
  if (p.includes("free")) return "Free";
  if (p.includes("$") || p.includes("paid") || p.includes("from")) return "Paid";
  return "";
}

function applyFilters(arr) {
  const q = searchQuery.trim().toLowerCase();
  return arr.filter(tool => {
    const matchCategory = selectedCategory === "All" || !selectedCategory || tool.category === selectedCategory;
    const matchQuery =
      q.length === 0 ||
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q);
    const matchVerified = !verifiedOnly || tool.verified === true;
    const type = pricingTypeOf(tool);
    const matchPricing = !selectedPricing || type === selectedPricing;
    return matchCategory && matchQuery && matchVerified && matchPricing;
  });
}

// ---------- Search ----------
function bindSearch() {
  const input = $("#search-input");
  input.addEventListener("input", () => {
    searchQuery = input.value;
    renderTools();
    const url = new URL(location);
    if (searchQuery.trim()) url.searchParams.set("q", searchQuery.trim());
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  });
}

// ---------- Initialization ----------
function initFromURL() {
  const params = new URL(location).searchParams;
  const c = params.get("category");
  const q = params.get("q");
  if (c) selectedCategory = c;
  if (q) {
    searchQuery = q;
    $("#search-input").value = q;
  }
}

function setYear() {
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// Kick off
document.addEventListener("DOMContentLoaded", () => {
  setYear();
  initFromURL();
  loadToolsFromJson().then(() => {
  renderCategories();
  renderFeatured();
  renderTools();
  renderListSections();
  bindSearch();
  initFilterBar();
  bindToggles();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'tools_override') {
      loadToolsFromJson().then(() => {
        renderCategories();
        renderFeatured();
        renderTools();
        renderListSections();
      });
    }
  });
});

function bindToggles() {
  const buttons = $$(".toggle-group .toggle-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-target");
      if (target && /^#/.test(target)) {
        history.pushState({ route: target }, '', target);
        showRoute(target);
      }
    });
  });
}

function markRouteSections() {
  const sels = [".hero", "#categories", "#tool-lists", "#tools"];
  sels.forEach(s => {
    const el = document.querySelector(s);
    if (el) el.classList.add("section-route");
  });
}

function setActiveNav(hash) {
  const target = hash || "#home";
  const links = Array.from(document.querySelectorAll(".nav .nav-link, .footer-nav a"));
  links.forEach(a => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === target);
  });
}

function showRoute(hash) {
  const route = (!hash || hash === "#home") ? "home" : hash.replace("#", "");
  const hero = document.querySelector(".hero");
  const cats = document.querySelector("#categories");
  const lists = document.querySelector("#tool-lists");
  const tools = document.querySelector("#tools");
  const show = (el, vis) => {
    if (!el) return;
    el.classList.add("section-route");
    el.classList.toggle("visible", vis);
    el.classList.toggle("hidden", !vis);
    el.setAttribute("aria-hidden", String(!vis));
  };
  if (route === "home") {
    show(hero, true);
    show(lists, true);
    show(cats, false);
    show(tools, false);
  } else if (route === "categories") {
    show(hero, false);
    show(lists, false);
    show(cats, true);
    show(tools, false);
  } else if (route === "tools") {
    show(hero, false);
    show(lists, false);
    show(cats, false);
    show(tools, true);
  }
  setActiveNav("#" + route);
}

function initSPA() {
  markRouteSections();
  showRoute(location.hash);
  const links = Array.from(document.querySelectorAll(".nav .nav-link, .footer-nav a"));
  links.forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        history.pushState({ route: href }, "", href);
        showRoute(href);
      }
    });
  });
  window.addEventListener("popstate", () => {
    showRoute(location.hash);
  });
  window.addEventListener("hashchange", () => {
    showRoute(location.hash);
  });
}

function renderFeatured() {
  const grid = $("#featured-grid");
  if (!grid) return;
  grid.setAttribute("aria-busy", "true");
  const featured = applyFilters(toolsData.filter(t => t.featured));
  grid.innerHTML = "";
  featured.slice(0, 24).forEach(tool => {
    const card = document.createElement("article");
    card.className = "card featured fade-in";
    card.setAttribute("data-tool", tool.name);
    card.setAttribute("aria-label", `${tool.name} — ${tool.category}`);
    const ribbon = tool.top ? `<span class="ribbon">TOP</span>` : "";
    const featuredBadge = `<span class="badge-featured">Featured</span>`;
    const verified = tool.verified ? `<span class="verified" aria-label="Verified">✔</span>` : "";
    const pricing = tool.pricing_text ? `<div class="pricing">${tool.pricing_text}</div>` : "";
    card.innerHTML = `
      ${ribbon}
      <div class="card-top">
        <div class="upvote" aria-label="Upvotes">↑ ${tool.upvotes}</div>
        <div class="top-right">${featuredBadge}</div>
      </div>
      <div class="identity">
        <div class="avatar-wrap">
          <img class="avatar" src="${tool.logo}" alt="${tool.name} logo" loading="lazy" onerror="this.src='https://placehold.co/72x72/eeeeee/666666?text=AI';this.onerror=null;" />
        </div>
        <h3 class="name">${tool.name}${verified}</h3>
      </div>
      <p class="desc quoted">"${tool.description}"</p>
      <div class="meta-line">
        <span class="tag" data-category="${tool.category}">
          <span class="dot" aria-hidden="true"></span>
          <span>${tool.category}</span>
        </span>
        <span class="status">Active</span>
      </div>
      ${pricing}
      <div class="actions">
        <a class="btn-visit" href="${tool.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${tool.name}">
          VISIT
          <svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    `;
    grid.appendChild(card);
  });
  grid.setAttribute("aria-busy", "false");
}

function initFilterBar() {
  const search = $("#filter-search");
  if (search) {
    search.addEventListener("input", () => {
      searchQuery = search.value;
      const headerSearch = $("#search-input");
      if (headerSearch) headerSearch.value = searchQuery;
      renderFeatured();
      renderTools();
      const url = new URL(location);
      if (searchQuery.trim()) url.searchParams.set("q", searchQuery.trim());
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
    });
  }
  const sel = $("#filter-category-select");
  if (sel) {
    const dynamicCats = Array.from(new Set(toolsData.map(t => t.category)));
    const categories = Array.from(new Set([...baseCategories, ...dynamicCats]));
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat === "All" ? "" : cat;
      opt.textContent = cat;
      if (cat === selectedCategory) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      selectedCategory = sel.value || "All";
      renderCategories();
      renderFeatured();
      renderTools();
      const url = new URL(location);
      url.searchParams.set("category", selectedCategory);
      history.replaceState(null, "", url);
    });
  }
  const ver = $("#filter-verified");
  if (ver) {
    ver.addEventListener("click", () => {
      verifiedOnly = !verifiedOnly;
      ver.classList.toggle("active", verifiedOnly);
      ver.setAttribute("aria-pressed", String(verifiedOnly));
      renderFeatured();
      renderTools();
    });
  }
  const pills = $$(".pills .pill");
  if (pills.length) {
    pills.forEach(p => {
      p.addEventListener("click", () => {
        pills.forEach(x => x.classList.remove("active"));
        if (selectedPricing === p.dataset.pricing) {
          selectedPricing = "";
        } else {
          p.classList.add("active");
          selectedPricing = p.dataset.pricing;
        }
        renderFeatured();
        renderTools();
      });
    });
  }
}
// ---------- List Sections (reusable) ----------
/**
 * Render multi-column category cards showing ALL tools per category.
 * Fixed-height list-body with vertical scroll. Lazy-populates for performance.
 */
function renderListSections() {
  const grid = $("#lists-grid");
  if (!grid) return;
  grid.setAttribute("aria-busy", "true");

  const iconSvg = (name) => {
    if (name === "sparkle") return `<svg class="list-icon" viewBox="0 0 24 24" fill="none"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    if (name === "star") return `<svg class="list-icon" viewBox="0 0 24 24" fill="none"><path d="M12 3l3.09 6.26L22 10.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 15.14l-5-4.87 6.91-1.01L12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    if (name === "bolt") return `<svg class="list-icon" viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    return `<svg class="list-icon" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v10H4zM8 19h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };

  const categoryIcon = (cat) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("writing") || c.includes("chat")) return "star";
    if (c.includes("image") || c.includes("design")) return "sparkle";
    if (c.includes("video") || c.includes("audio")) return "bolt";
    if (c.includes("coding") || c.includes("dev")) return "bolt";
    if (c.includes("marketing") || c.includes("seo")) return "star";
    if (c.includes("productivity")) return "sparkle";
    return "star";
  };

  const categories = Array.from(new Set(toolsData.map(t => t.category))).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const byCategory = categories.reduce((acc, cat) => {
    acc[cat] = toolsData.filter(t => t.category === cat).slice().sort((a, b) => a.name.localeCompare(b.name));
    return acc;
  }, {});

  grid.innerHTML = "";

  const frag = document.createDocumentFragment();
  categories.forEach(cat => {
    const items = byCategory[cat] || [];
    if (!items.length) return;
    const card = document.createElement("section");
    card.className = "list-card fade-in";
    card.dataset.category = cat;
    const count = items.length;
    card.innerHTML = `
      <header class="list-header">
        ${iconSvg(categoryIcon(cat))}
        <h3 class="list-title">${cat}</h3>
      </header>
      <div class="list-body" role="list" aria-busy="true"></div>
      <div class="list-footer">
        <a href="#tools" aria-label="View ${cat} tools" onclick="(function(){window.selectedCategory='${cat}'; const u=new URL(location);u.searchParams.set('category','${cat}');history.replaceState(null,'',u); if (window.renderTools) window.renderTools(); const btn=document.querySelector('.toggle-btn[data-target=\\'#tools\\']'); btn && btn.click();})();">View Category Page (${count})</a>
      </div>
    `;
    frag.appendChild(card);
  });
  grid.appendChild(frag);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const cat = el.dataset.category;
      const container = el.querySelector(".list-body");
      const items = byCategory[cat] || [];
      container.innerHTML = items.map(it => `
        <div class="list-item" role="listitem">
          <span class="item-logo">
            <img src="${it.logo}" alt="${it.name} logo" loading="lazy" onerror="this.src='https://placehold.co/28x28/eeeeee/666666?text=AI';this.onerror=null;">
          </span>
          <span class="item-name">${it.name}</span>
          <a class="item-external" href="${it.url}" target="_blank" rel="noopener noreferrer" aria-label="Open ${it.name}">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M14 3h7v7M21 3l-9 9M10 21H5a2 2 0 0 1-2-2v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      `).join("");
      container.setAttribute("aria-busy", "false");
      observer.unobserve(el);
    });
  }, { rootMargin: "150px" });

  $$(".list-card", grid).forEach(card => observer.observe(card));

  grid.setAttribute("aria-busy", "false");
}

function navigateToCategory(cat) {
  selectedCategory = cat || "All";
  const url = new URL(location);
  if (selectedCategory && selectedCategory !== "All") url.searchParams.set("category", selectedCategory);
  else url.searchParams.delete("category");
  history.replaceState(null, "", url);
  renderFeatured();
  renderTools();
  const btn = document.querySelector(".toggle-btn[data-target='#tools']");
  if (btn) btn.click();
}

/**
 * How to add a new AI tool (manual steps):
 * 1) Open script.js and find `toolsData`.
 * 2) Add a new object: 
 *    {
 *      name: "Tool Name",
 *      description: "Short description of what it does.",
 *      category: "AI Writing" | "Image" | "Video" | "Coding" | "Marketing" | "YourCategory",
 *      url: "https://example.com",
 *      logo: "https://logo.clearbit.com/example.com" // or any image URL
 *    }
 * 3) If you introduce a new category, it will appear automatically in the chips.
 * 4) Save the file and refresh your browser — the tool will render instantly.
 */

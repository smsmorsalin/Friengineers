/* ============================================================
   Friengineers — Main script
   Renders site content from the API with a resilient fallback,
   and powers all animations & interactions.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------
     Icons (inline SVG)
  ------------------------------------------------------------ */
  const ICONS = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19"/><circle cx="12" cy="12" r="3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.5-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.5 11c-2.5 4.6-9.5 9-9.5 9Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
    brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a3 3 0 0 0-3 3 3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 8 20a3 3 0 0 0 4 1V4Z"/><path d="M12 4a3 3 0 0 1 3 3 3 3 0 0 1 3 3 3 3 0 0 1 1 5.5A3 3 0 0 1 16 20a3 3 0 0 1-4 1V4Z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 18a4.5 4.5 0 0 0 .4-9A6 6 0 0 0 6.3 8.3 4.5 4.5 0 0 0 7 17h10.5Z"/></svg>',
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8-.8-.7-2.2-.7-3 .8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2Z"/><path d="M9 12H4s.6-3.3 2-4.5c1.6-1.3 3.6-1.4 4-1.5"/><path d="M12 15v5s3.3-.6 4.5-2c1.3-1.6 1.5-3.6 1.5-4"/></svg>'
  };

  /* ------------------------------------------------------------
     Fallback content — used if the API is unreachable, so the
     site always renders something meaningful.
  ------------------------------------------------------------ */
  const FALLBACK = {
    brand: { name: "Friengineers", logo_text: "F" },
    hero: {
      badge: "Building the future, together",
      headline: "We build <span class='grad'>reliable, modern, fast &amp; secure</span> systems.",
      subheadline: "Friengineers is a collective of friends and engineers crafting dependable software that moves businesses forward — engineered with care, delivered with trust.",
      primary_cta: "Start a Project",
      secondary_cta: "See What We Do",
      stats: [
        { value: 12, suffix: "+", label: "Projects Delivered" },
        { value: 8, suffix: "+", label: "Team Members" },
        { value: 98, suffix: "%", label: "Client Satisfaction" },
        { value: 5, suffix: "+", label: "Years Combined Exp." }
      ]
    },
    about: {
      heading: "Who We Are",
      subheading: "A trusted crew of friends turned engineers, building software the right way.",
      story: "Friengineers was born from a simple idea: when friends with real engineering discipline come together, they can build systems people rely on. We started as a small group of builders who cared deeply about quality — and grew into a team that designs, engineers, and ships dependable products.",
      mission: "To build reliable, modern, fast, and secure software that our clients can trust with their most important work — and to grow into something big, the honest way.",
      vision: "To become a trusted engineering partner across Bangladesh and beyond, known for craftsmanship, transparency, and long-term relationships.",
      values: [
        { icon: "shield", title: "Reliable", text: "We ship systems that hold up under real load — no fragile shortcuts, no excuses." },
        { icon: "bolt", title: "Fast", text: "Performance is a feature. We engineer for speed in both our products and our process." },
        { icon: "lock", title: "Secure", text: "Security is built in from day one — every layer, every line of code." },
        { icon: "spark", title: "Modern", text: "We adopt modern, proven technology so our clients are never left behind." },
        { icon: "heart", title: "Trustworthy", text: "Transparent pricing, honest timelines, and communication you can count on." },
        { icon: "users", title: "Collaborative", text: "We work as partners, not vendors — your goals become our goals." }
      ],
      timeline: [
        { year: "2024", title: "The Idea", text: "A group of friends start building side projects together, sharing one standard: do it right." },
        { year: "2025", title: "Going Formal", text: "Friengineers is formalized as a collective — first clients trust us with production systems." },
        { year: "2026", title: "Growing", text: "We expand into mobile, cloud, and AI. We're just getting started." },
        { year: "Future", title: "Something Big", text: "Our goal: a dependable engineering brand the whole region knows and trusts." }
      ]
    },
    services: {
      heading: "What We Do",
      subheading: "Full-stack engineering services, delivered with discipline.",
      items: [
        { icon: "code", title: "Web Development", text: "Modern, responsive, and lightning-fast web applications built with proven frameworks." },
        { icon: "layers", title: "Software Engineering", text: "Custom software, APIs, and integrations designed around real business needs." },
        { icon: "phone", title: "Mobile Apps", text: "Native and cross-platform mobile experiences your users will love to open." },
        { icon: "brain", title: "AI & Machine Learning", text: "Practical AI solutions — from automation and chatbots to data-driven insights." },
        { icon: "cloud", title: "Cloud & DevOps", text: "Scalable cloud architecture, CI/CD pipelines, and infrastructure that just works." },
        { icon: "shield", title: "Security & Audits", text: "Security reviews, hardening, and audits that keep your systems safe." }
      ]
    },
    projects: {
      heading: "What We're Building",
      subheading: "Projects we're proud of — and the ones coming next.",
      items: [
        { title: "School ERP System", category: "Software Engineering", text: "A complete enterprise resource planning system for schools — admissions, attendance, grades, and finance in one place.", status: "Live", tags: ["Python", "Django", "PostgreSQL"] },
        { title: "Warranty Parts Platform", category: "Automation", text: "An automated warranty claim processing platform with LLM-assisted review and tracking.", status: "Live", tags: ["Python", "FastAPI", "AI"] },
        { title: "Friengineers Site", category: "Web Development", text: "This very website — a modern, animated presence backed by a content management API.", status: "Live", tags: ["HTML", "CSS", "Python"] },
        { title: "Next Big Thing", category: "Coming Soon", text: "We're working on something big. A reliable, modern platform built for the future.", status: "In Progress", tags: ["R&D"] }
      ]
    },
    team: {
      heading: "The People",
      subheading: "Friends first, engineers always — the crew behind Friengineers.",
      items: [{ name: "Founding Crew", role: "Founders & Engineers", text: "A tight-knit team of friends who met through a shared obsession with building things well." }]
    },
    contact: {
      heading: "Let's Build Together",
      subheading: "Tell us about your project. We'll respond within one business day.",
      address: "Bashundhara R/A, Dhaka, Bangladesh",
      email: "the.friengineers.org@gmail.com",
      phone: "+880 1XXX-XXXXXX",
      hours: "Sun – Fri, 9:00 AM – 7:00 PM",
      form_title: "Send us a message",
      cta: "Send Message",
      success: "Thanks! Your message has been received. We'll get back to you soon."
    },
    footer: {
      about: "Friengineers is a collective of friends and engineers building reliable, modern, fast, and secure software.",
      services_title: "Services"
    }
  };

  /* ------------------------------------------------------------
     Content loading & rendering
  ------------------------------------------------------------ */
  async function loadContent() {
    let data = FALLBACK;
    try {
      const res = await fetch("/api/content", { headers: { Accept: "application/json" } });
      if (res.ok) {
        const api = await res.json();
        data = deepMerge(FALLBACK, api);
      }
    } catch (_) {
      /* offline / API down — fallback keeps the site alive */
    }
    render(data);
    return data;
  }

  function deepMerge(base, override) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const key of Object.keys(override || {})) {
      if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key]) &&
          out[key] && typeof out[key] === "object" && !Array.isArray(out[key])) {
        out[key] = deepMerge(out[key], override[key]);
      } else {
        out[key] = override[key];
      }
    }
    return out;
  }

  function text(id, value) {
    const el = $(id);
    if (el && value != null) el.innerHTML = value;
  }

  function render(data) {
    // Brand
    const brand = data.brand || FALLBACK.brand;
    $("#brandMark").textContent = brand.logo_text || "F";
    $("#brandName").textContent = brand.name || "Friengineers";
    document.title = brand.name ? brand.name + " — Engineered by Friends, Built on Trust" : document.title;

    // Hero
    const hero = data.hero || FALLBACK.hero;
    text("#heroBadge", hero.badge);
    $("#heroTitle").innerHTML = hero.headline;
    text("#heroSub", hero.subheadline);
    text("#heroPrimary", hero.primary_cta);
    text("#heroSecondary", hero.secondary_cta);
    renderStats(hero.stats || []);

    // About
    const about = data.about || FALLBACK.about;
    text("#aboutHeading", about.heading);
    text("#aboutSub", about.subheading);
    text("#aboutStory", about.story);
    text("#aboutMission", about.mission);
    text("#aboutVision", about.vision);
    renderValues(about.values || []);
    renderTimeline(about.timeline || []);

    // Services
    const services = data.services || FALLBACK.services;
    text("#servicesHeading", services.heading);
    text("#servicesSub", services.subheading);
    renderServices(services.items || []);

    // Projects
    const projects = data.projects || FALLBACK.projects;
    text("#projectsHeading", projects.heading);
    text("#projectsSub", projects.subheading);
    renderProjects(projects.items || []);

    // Team
    const team = data.team || FALLBACK.team;
    text("#teamHeading", team.heading);
    text("#teamSub", team.subheading);
    renderTeam(team.items || []);

    // Contact
    const contact = data.contact || FALLBACK.contact;
    text("#contactHeading", contact.heading);
    text("#contactSub", contact.subheading);
    text("#contactAddress", contact.address);
    $("#contactEmail").textContent = contact.email;
    $("#contactEmail").href = "mailto:" + contact.email;
    text("#contactPhone", contact.phone);
    text("#contactHours", contact.hours);
    text("#contactFormTitle", contact.form_title);
    text("#contactSubmit .btn-label", contact.cta);
    window.__contactSuccess = contact.success;

    // Footer
    const footer = data.footer || FALLBACK.footer;
    text("#footerAbout", footer.about);
    text("#footerLinksTitle", footer.links_title);
    text("#footerServicesTitle", footer.services_title);
    text("#footerContactTitle", footer.contact_title);
    text("#footerAddress", contact.address);
    $("#footerEmail").textContent = contact.email;
    $("#footerEmail").href = "mailto:" + contact.email;
    text("#footerHours", contact.hours);
    renderFooterServices(services.items || []);
    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  function renderStats(stats) {
    const grid = $("#heroStats");
    if (!grid) return;
    grid.innerHTML = "";
    stats.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "stat";
      el.style.setProperty("--d", (0.25 + i * 0.1) + "s");
      el.innerHTML = '<div class="stat-value" data-count="' + (s.value || 0) + '" data-suffix="' + (s.suffix || "") + '">0' + (s.suffix || "") + '</div>' +
                     '<div class="stat-label">' + escapeHtml(s.label || "") + '</div>';
      grid.appendChild(el);
    });
  }

  function renderValues(values) {
    const grid = $("#valuesGrid");
    if (!grid) return;
    grid.innerHTML = "";
    values.forEach((v, i) => {
      const el = document.createElement("div");
      el.className = "value-card reveal";
      el.style.setProperty("--d", (i % 2) * 0.12 + "s");
      el.innerHTML =
        '<div class="value-icon">' + (ICONS[v.icon] || ICONS.spark) + '</div>' +
        '<h4>' + escapeHtml(v.title || "") + '</h4>' +
        '<p>' + escapeHtml(v.text || "") + '</p>';
      grid.appendChild(el);
    });
    observeReveals();
  }

  function renderTimeline(timeline) {
    const wrap = $("#timeline");
    if (!wrap) return;
    wrap.innerHTML = "";
    timeline.forEach((t, i) => {
      const el = document.createElement("div");
      el.className = "tl-item reveal";
      el.style.setProperty("--d", i * 0.12 + "s");
      el.innerHTML =
        '<div class="tl-year">' + escapeHtml(t.year || "") + '</div>' +
        '<div class="tl-title">' + escapeHtml(t.title || "") + '</div>' +
        '<div class="tl-text">' + escapeHtml(t.text || "") + '</div>';
      wrap.appendChild(el);
    });
    observeReveals();
  }

  function renderServices(items) {
    const grid = $("#servicesGrid");
    if (!grid) return;
    grid.innerHTML = "";
    items.forEach((s, i) => {
      const el = document.createElement("article");
      el.className = "service-card reveal";
      el.style.setProperty("--d", (i % 3) * 0.12 + "s");
      el.innerHTML =
        '<div class="service-icon">' + (ICONS[s.icon] || ICONS.code) + '</div>' +
        '<h3>' + escapeHtml(s.title || "") + '</h3>' +
        '<p>' + escapeHtml(s.text || "") + '</p>';
      grid.appendChild(el);
    });
    observeReveals();
  }

  function renderProjects(items) {
    const grid = $("#projectsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    items.forEach((p, i) => {
      const el = document.createElement("article");
      el.className = "project-card reveal";
      el.style.setProperty("--d", (i % 2) * 0.14 + "s");
      const tags = (p.tags || []).map((t) => "<span>" + escapeHtml(t) + "</span>").join("");
      el.innerHTML =
        '<div class="project-top">' +
          '<span class="project-cat">' + escapeHtml(p.category || "") + '</span>' +
          '<span class="project-status">' + escapeHtml(p.status || "Active") + '</span>' +
        '</div>' +
        '<h3>' + escapeHtml(p.title || "") + '</h3>' +
        '<p>' + escapeHtml(p.text || "") + '</p>' +
        '<div class="project-tags">' + tags + '</div>';
      grid.appendChild(el);
    });
    observeReveals();
  }

  function renderTeam(items) {
    const grid = $("#teamGrid");
    if (!grid) return;
    grid.innerHTML = "";
    items.forEach((m, i) => {
      const el = document.createElement("div");
      el.className = "team-card reveal";
      el.style.setProperty("--d", (i % 4) * 0.1 + "s");
      const initials = initialsOf(m.name || "FE");
      el.innerHTML =
        '<div class="team-avatar">' + initials + '</div>' +
        '<h3>' + escapeHtml(m.name || "") + '</h3>' +
        '<div class="team-role">' + escapeHtml(m.role || "") + '</div>' +
        '<p>' + escapeHtml(m.text || "") + '</p>';
      grid.appendChild(el);
    });
    observeReveals();
  }

  function renderFooterServices(items) {
    const ul = $("#footerServices");
    if (!ul) return;
    ul.innerHTML = "";
    (items || []).forEach((s) => {
      const li = document.createElement("li");
      li.innerHTML = '<a href="#services">' + escapeHtml(s.title || "") + '</a>';
      ul.appendChild(li);
    });
  }

  function initialsOf(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "FE";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------
     Scroll reveal (IntersectionObserver)
  ------------------------------------------------------------ */
  let revealObserver = null;
  function observeReveals() {
    if (reducedMotion) return;
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    }
    $$(".reveal:not(.in)").forEach((el) => revealObserver.observe(el));
  }

  // Safety net: never leave content invisible. Reveal anything already in the
  // viewport if the observer was throttled (e.g. tab loaded while hidden),
  // and re-check whenever the tab becomes visible again.
  function ensureVisible() {
    $$(".reveal:not(.in)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 40 && r.bottom > -40) el.classList.add("in");
    });
  }
  window.addEventListener("load", function () { setTimeout(ensureVisible, 1200); });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { ensureVisible(); observeReveals(); }
  });

  /* ------------------------------------------------------------
     Particle network canvas (hero)
  ------------------------------------------------------------ */
  function initParticles() {
    const canvas = $("#particles");
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    let w, h, particles = [];
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * DPR; canvas.height = h * DPR;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(80, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.6 + 0.6,
        c: Math.random() > 0.5 ? "34,211,238" : "139,92,246"
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.c + ",0.55)";
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(59,130,246," + (0.16 * (1 - dist / 130)) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(draw);
  }

  /* ------------------------------------------------------------
     Counter animation for stats
  ------------------------------------------------------------ */
  function initCounters() {
    if (reducedMotion) {
      $$(".stat-value").forEach((el) => {
        el.textContent = (el.dataset.count || "0") + (el.dataset.suffix || "");
      });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        const target = parseFloat(el.dataset.count || "0");
        const suffix = el.dataset.suffix || "";
        const dur = 1600;
        const start = performance.now();
        function tick(now) {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    $$(".stat-value").forEach((el) => observer.observe(el));

    // Safety net: if the observer never fires (throttled tab), snap counters to
    // their final value once they enter the viewport.
    setTimeout(function () {
      $$(".stat-value").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.textContent = (el.dataset.count || "0") + (el.dataset.suffix || "");
        }
      });
    }, 2000);
  }

  /* ------------------------------------------------------------
     Nav: scroll state, active links, mobile menu, progress
  ------------------------------------------------------------ */
  function initNav() {
    const nav = $("#nav");
    const toggle = $("#navToggle");
    const linksWrap = $("#navLinks");
    const progress = $("#scrollProgress");

    function onScroll() {
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 30);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

      // Active link highlight
      let current = "home";
      $$("main section, header[id]").forEach((sec) => {
        if (sec.getBoundingClientRect().top <= window.innerHeight * 0.4) current = sec.id;
      });
      $$(".nav-links a").forEach((a) => {
        a.classList.toggle("active", a.getAttribute("href") === "#" + current);
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toggle.addEventListener("click", () => {
      const open = linksWrap.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$(".nav-links a").forEach((a) => a.addEventListener("click", () => {
      linksWrap.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  /* ------------------------------------------------------------
     Cursor glow
  ------------------------------------------------------------ */
  function initCursorGlow() {
    const glow = $("#cursorGlow");
    if (!glow) return;
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let cx = tx, cy = ty;
    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
    }, { passive: true });
    (function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = "translate(" + (cx - 260) + "px," + (cy - 260) + "px)";
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------
     Contact form
  ------------------------------------------------------------ */
  function initContactForm() {
    const form = $("#contactForm");
    if (!form) return;
    const status = $("#contactStatus");
    const submit = $("#contactSubmit");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (status) { status.textContent = ""; status.className = "form-status"; }

      const name = $("#cf-name").value.trim();
      const email = $("#cf-email").value.trim();
      const subject = $("#cf-subject").value.trim();
      const message = $("#cf-message").value.trim();

      if (!name || !email || !message) {
        if (status) { status.textContent = "Please fill in your name, email and message."; status.classList.add("err"); }
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        if (status) { status.textContent = "Please enter a valid email address."; status.classList.add("err"); }
        return;
      }

      form.classList.add("loading");
      if (submit) submit.disabled = true;

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, subject, message })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          form.reset();
          const successMsg = window.__contactSuccess || "Thanks! Your message has been received. We'll get back to you soon.";
          if (status) { status.textContent = successMsg; status.classList.add("ok"); }
        } else {
          if (status) { status.textContent = data.error || "Something went wrong. Please try again."; status.classList.add("err"); }
        }
      } catch (_) {
        if (status) { status.textContent = "Network error. Please try again in a moment."; status.classList.add("err"); }
      } finally {
        form.classList.remove("loading");
        if (submit) submit.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------
     Boot
  ------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", async () => {
    initParticles();
    initNav();
    initCursorGlow();
    initContactForm();
    observeReveals();
    await loadContent();
    initCounters();
  });
})();

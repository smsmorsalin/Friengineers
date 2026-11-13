/* ============================================================
   Friengineers — Admin script
   Schema-driven content editor, messages inbox, and settings.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let token = sessionStorage.getItem("fe_token") || "";
  let username = sessionStorage.getItem("fe_username") || "";
  // Remove credentials persisted by older versions of the admin panel.
  localStorage.removeItem("fe_token");
  localStorage.removeItem("fe_username");
  let data = null;         // full content object
  let currentView = "hero"; // active section
  let dirty = false;

  /* ============================================================
     Schemas — define the editable fields for each section
  ============================================================ */
  const SCHEMAS = {
    hero: {
      title: "Edit Hero",
      sub: "Update the hero section of the homepage.",
      fields: [
        { key: "badge", label: "Badge Text", type: "text" },
        { key: "headline", label: "Headline (basic HTML allowed, e.g. <span class='grad'>)", type: "textarea" },
        { key: "subheadline", label: "Subheadline", type: "textarea" },
        { key: "primary_cta", label: "Primary Button Label", type: "text" },
        { key: "secondary_cta", label: "Secondary Button Label", type: "text" },
        { key: "stats", label: "Stats", type: "list", itemTitle: "Stat", fields: [
          { key: "value", label: "Value", type: "number" },
          { key: "suffix", label: "Suffix (+, %, etc.)", type: "text" },
          { key: "label", label: "Label", type: "text" }
        ] }
      ]
    },
    about: {
      title: "Edit About",
      sub: "Update the 'Who We Are' section.",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "subheading", label: "Subheading", type: "text" },
        { key: "story", label: "Story", type: "textarea" },
        { key: "mission", label: "Mission", type: "textarea" },
        { key: "vision", label: "Vision", type: "textarea" },
        { key: "values", label: "Core Values", type: "list", itemTitle: "Value", fields: [
          { key: "icon", label: "Icon", type: "select", options: ["shield", "bolt", "lock", "spark", "heart", "users", "code", "layers", "phone", "brain", "cloud", "rocket"] },
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Text", type: "textarea" }
        ] },
        { key: "timeline", label: "Timeline", type: "list", itemTitle: "Milestone", fields: [
          { key: "year", label: "Year", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Text", type: "textarea" }
        ] }
      ]
    },
    services: {
      title: "Edit Services",
      sub: "Update the 'What We Do' section.",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "subheading", label: "Subheading", type: "text" },
        { key: "items", label: "Services", type: "list", itemTitle: "Service", fields: [
          { key: "icon", label: "Icon", type: "select", options: ["shield", "bolt", "lock", "spark", "heart", "users", "code", "layers", "phone", "brain", "cloud", "rocket"] },
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Text", type: "textarea" }
        ] }
      ]
    },
    projects: {
      title: "Edit Projects",
      sub: "Update the 'What We're Building' section.",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "subheading", label: "Subheading", type: "text" },
        { key: "items", label: "Projects", type: "list", itemTitle: "Project", fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "category", label: "Category", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "text", label: "Description", type: "textarea" },
          { key: "tags", label: "Tags (comma separated)", type: "taglist" }
        ] }
      ]
    },
    team: {
      title: "Edit Team",
      sub: "Update the 'The People' section.",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "subheading", label: "Subheading", type: "text" },
        { key: "items", label: "Members", type: "list", itemTitle: "Member", fields: [
          { key: "name", label: "Name", type: "text" },
          { key: "role", label: "Role", type: "text" },
          { key: "text", label: "Bio", type: "textarea" }
        ] }
      ]
    },
    contact: {
      title: "Edit Contact",
      sub: "Update the contact section and footer contact details.",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "subheading", label: "Subheading", type: "text" },
        { key: "address", label: "Address", type: "text" },
        { key: "email", label: "Email", type: "text" },
        { key: "phone", label: "Phone", type: "text" },
        { key: "hours", label: "Working Hours", type: "text" },
        { key: "form_title", label: "Form Title", type: "text" },
        { key: "cta", label: "Submit Button Label", type: "text" },
        { key: "success", label: "Success Message", type: "text" }
      ]
    },
    footer: {
      title: "Edit Footer",
      sub: "Update the footer text and links.",
      fields: [
        { key: "about", label: "About Text", type: "textarea" },
        { key: "tagline", label: "Tagline", type: "text" },
        { key: "links_title", label: "Quick Links Title", type: "text" },
        { key: "services_title", label: "Services Title", type: "text" },
        { key: "contact_title", label: "Contact Title", type: "text" },
        { key: "copyright", label: "Copyright Text (use {year} for current year)", type: "text" }
      ]
    }
  };

  /* ============================================================
     API helpers
  ============================================================ */
  async function api(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (token) headers["Authorization"] = "Bearer " + token;
    let res;
    try {
      res = await fetch(path, Object.assign({}, opts, { headers }));
    } catch (_) {
      return { ok: false, status: 0, body: { error: "Could not connect to the server. Check your connection and try again." } };
    }
    let body = {};
    try { body = await res.json(); } catch (_) {}
    return { ok: res.ok, status: res.status, body };
  }

  /* ============================================================
     Auth
  ============================================================ */
  async function doLogin(usernameVal, passwordVal) {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: usernameVal, password: passwordVal })
    });
    if (res.ok) {
      token = res.body.token;
      username = res.body.username;
      sessionStorage.setItem("fe_token", token);
      sessionStorage.setItem("fe_username", username);
      enterApp();
    } else {
      const err = $("#loginError");
      if (err) err.textContent = res.body.error || "Login failed. Check your credentials.";
    }
  }

  function enterApp() {
    $("#loginScreen").hidden = true;
    $("#app").hidden = false;
    loadAll();
  }

  async function loadAll() {
    const res = await api("/api/content");
    if (res.ok) {
      data = res.body;
      switchView(currentView);
    } else if (res.status === 401) {
      logout();
    } else {
      toast("Could not load content.", "err");
    }
    refreshMessageBadge();
  }

  function logout() {
    api("/api/auth/logout", { method: "POST" }).catch(() => {});
    token = "";
    username = "";
    sessionStorage.removeItem("fe_token");
    sessionStorage.removeItem("fe_username");
    $("#app").hidden = true;
    $("#loginScreen").hidden = false;
    $("#loginPassword").value = "";
    $("#loginError").textContent = "";
  }

  /* ============================================================
     Form rendering (schema-driven)
  ============================================================ */
  function fieldHtml(field, value) {
    const val = value == null ? "" : value;
    const name = "f_" + field.key;
    switch (field.type) {
      case "textarea":
        return '<div class="field"><label for="' + name + '">' + escapeHtml(field.label) + '</label>' +
          '<textarea id="' + name + '" rows="4">' + escapeHtml(val) + '</textarea></div>';
      case "number":
        return '<div class="field"><label for="' + name + '">' + escapeHtml(field.label) + '</label>' +
          '<input type="number" id="' + name + '" value="' + escapeHtml(val) + '" /></div>';
      case "select":
        return '<div class="field"><label for="' + name + '">' + escapeHtml(field.label) + '</label>' +
          '<select id="' + name + '">' + field.options.map(function (o) {
            return '<option value="' + o + '"' + (String(val) === o ? " selected" : "") + '>' + o + '</option>';
          }).join("") + '</select></div>';
      case "list":
        return listHtml(field, val || []);
      case "taglist":
        return '<div class="field"><label>' + escapeHtml(field.label) + '</label>' +
          '<input type="text" data-taglist="' + field.key + '" value="' + escapeHtml((val || []).join(", ")) + '" placeholder="tag1, tag2, tag3" /></div>';
      default:
        return '<div class="field"><label for="' + name + '">' + escapeHtml(field.label) + '</label>' +
          '<input type="text" id="' + name + '" value="' + escapeHtml(val) + '" /></div>';
    }
  }

  function listHtml(field, items) {
    const rows = items.map(function (item, idx) {
      return '<div class="rep-row" data-idx="' + idx + '">' +
        '<div class="rep-row-head"><span class="rep-row-title">' + escapeHtml(field.itemTitle || "Item") + ' ' + (idx + 1) + '</span>' +
        '<button type="button" class="rep-remove" data-remove="' + idx + '">Remove</button></div>' +
        '<div class="rep-fields grid-2">' + field.fields.map(function (f) {
          return fieldHtml(f, item[f.key]);
        }).join("") + '</div></div>';
    }).join("");
    return '<div class="rep-wrap"><label class="field-label">' + escapeHtml(field.label) + '</label>' +
      '<div data-list="' + field.key + '">' + rows + '</div>' +
      '<button type="button" class="rep-add" data-add-list="' + field.key + '">＋ Add ' + escapeHtml(field.itemTitle || "Item") + '</button></div>';
  }

  function renderSection(section) {
    const schema = SCHEMAS[section];
    const payload = data[section] || {};
    const content = $("#content");

    const panels = schema.fields.map(function (field) {
      if (field.type === "list") {
        return '<div class="panel"><div class="panel-title">' + escapeHtml(field.label) + '</div>' +
          '<div class="panel-desc">Click "Add" to create new entries.</div>' + listHtml(field, payload[field.key] || []) + '</div>';
      }
      return '<div class="panel">' + fieldHtml(field, payload[field.key]) + '</div>';
    });

    content.innerHTML = panels.join("");

    // Wire list add/remove
    $$("[data-add-list]", content).forEach(function (btn) {
      btn.addEventListener("click", function () {
        const key = btn.getAttribute("data-add-list");
        const field = schema.fields.find(function (f) { return f.key === key; });
        if (!field) return;
        const holder = $('[data-list="' + key + '"]', content);
        const empty = {};
        field.fields.forEach(function (f) { empty[f.key] = f.type === "taglist" ? [] : ""; });
        const div = document.createElement("div");
        div.innerHTML = listHtml(field, [empty]);
        holder.insertAdjacentHTML("beforeend", div.querySelector(".rep-row").outerHTML);
        bindRowEvents(holder);
        markDirty();
      });
    });

    bindRowEvents(content);

    // Any input change marks dirty
    content.addEventListener("input", markDirty, true);
    content.addEventListener("change", markDirty, true);
  }

  function bindRowEvents(scope) {
    $$("[data-remove]", scope).forEach(function (btn) {
      btn.addEventListener("click", function () {
        const row = btn.closest(".rep-row");
        const holder = row.parentElement;
        row.remove();
        renumber(holder);
        markDirty();
      });
    });
  }

  function renumber(holder) {
    const titleField = holder.querySelector(".rep-row .rep-row-title");
    // Rebuild titles from index using stored data is complex; simplest is re-label by order.
    $$(".rep-row", holder).forEach(function (row, i) {
      const t = row.querySelector(".rep-row-title");
      if (t) {
        const base = t.textContent.replace(/\s*\d+$/, "").trim();
        t.textContent = base + " " + (i + 1);
      }
      row.setAttribute("data-idx", i);
    });
  }

  /* Collect form values back into a payload object */
  function collect(section) {
    const schema = SCHEMAS[section];
    const payload = {};
    const content = $("#content");

    schema.fields.forEach(function (field) {
      if (field.type === "list") {
        const rows = $$('[data-list="' + field.key + '"] .rep-row', content);
        payload[field.key] = rows.map(function (row) {
          const obj = {};
          field.fields.forEach(function (f) {
            if (f.type === "taglist") {
              const inp = $('[data-taglist="' + f.key + '"]', row);
              obj[f.key] = inp ? inp.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [];
            } else {
              const el = $("#f_" + f.key, row);
              if (!el) return;
              obj[f.key] = f.type === "number" ? Number(el.value) || 0 : el.value;
            }
          });
          return obj;
        });
      } else if (field.type === "taglist") {
        const inp = $('[data-taglist="' + field.key + '"]', content);
        payload[field.key] = inp ? inp.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [];
      } else {
        const el = $("#f_" + field.key, content);
        if (!el) return;
        payload[field.key] = field.type === "number" ? Number(el.value) || 0 : el.value;
      }
    });

    return payload;
  }

  /* ============================================================
     Messages & settings views
  ============================================================ */
  async function renderMessages() {
    const content = $("#content");
    content.innerHTML = '<div class="panel"><div class="panel-title">Loading messages…</div></div>';
    const res = await api("/api/admin/messages");
    if (!res.ok) { content.innerHTML = '<div class="empty">Could not load messages.</div>'; return; }
    const messages = res.body.messages || [];
    if (messages.length === 0) {
      content.innerHTML = '<div class="empty"><div class="empty-icon">📭</div>No messages yet.<br/>Messages from the contact form will appear here.</div>';
      return;
    }
    content.innerHTML = messages.map(function (m) {
      const d = new Date(m.created_at * 1000);
      const dateStr = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
        " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      return '<div class="msg-card">' +
        '<div class="msg-head"><span class="msg-name">' + escapeHtml(m.name) + '</span>' +
        '<a class="msg-email" href="mailto:' + escapeHtml(m.email) + '">' + escapeHtml(m.email) + '</a>' +
        '<span class="msg-date">' + escapeHtml(dateStr) + '</span></div>' +
        (m.subject ? '<div class="msg-subject">' + escapeHtml(m.subject) + '</div>' : "") +
        '<div class="msg-body">' + escapeHtml(m.body) + '</div>' +
        '<div class="msg-actions"><a class="btn btn-ghost btn-sm" href="mailto:' + escapeHtml(m.email) + '">Reply</a>' +
        '<button class="btn btn-danger btn-sm" data-del-msg="' + m.id + '">Delete</button></div>' +
        '</div>';
    }).join("");

    $$("[data-del-msg]", content).forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const id = btn.getAttribute("data-del-msg");
        if (!confirm("Delete this message?")) return;
        const r = await api("/api/admin/messages/" + id, { method: "DELETE" });
        if (r.ok) { toast("Message deleted.", "ok"); renderMessages(); refreshMessageBadge(); }
        else toast(r.body.error || "Delete failed.", "err");
      });
    });
  }

  function renderSettings() {
    const content = $("#content");
    content.innerHTML =
      '<div class="panel"><div class="panel-title">Account</div>' +
      '<div class="panel-desc">Signed in as <strong style="color:var(--cyan)">' + escapeHtml(username || "admin") + '</strong></div>' +
      '<div class="setting-block">' +
        '<div class="field"><label>Current Password</label><input type="password" id="curPass" autocomplete="current-password" /></div>' +
        '<div class="field"><label>New Password (12 or more characters)</label><input type="password" id="newPass" autocomplete="new-password" minlength="12" maxlength="1024" /></div>' +
        '<div class="field"><label>Confirm New Password</label><input type="password" id="confirmPass" autocomplete="new-password" /></div>' +
        '<button class="btn btn-primary" id="changePassBtn">Update Password</button>' +
      '</div></div>' +
      '<div class="panel"><div class="panel-title">Database</div>' +
      '<div class="panel-desc">Reset all content back to the original defaults. This cannot be undone.</div>' +
      '<button class="btn btn-danger" id="resetBtn">Reset Content to Defaults</button></div>';

    $("#changePassBtn").addEventListener("click", async function () {
      const cur = $("#curPass").value;
      const nw = $("#newPass").value;
      const cf = $("#confirmPass").value;
      if (!cur) { toast("Enter your current password to continue.", "err"); return; }
      if (nw.length < 12 || nw.length > 1024) { toast("Use a password between 12 and 1024 characters.", "err"); return; }
      if (nw !== cf) { toast("Passwords do not match.", "err"); return; }
      const r = await api("/api/admin/change-password", {
        method: "POST", body: JSON.stringify({ current_password: cur, new_password: nw })
      });
      if (r.ok) {
        toast("Password updated. Please sign in again.", "ok");
        logout();
      } else toast(r.body.error || "Could not update password.", "err");
    });

    $("#resetBtn").addEventListener("click", async function () {
      if (!confirm("Reset ALL content to defaults? This overwrites your edits.")) return;
      const r = await api("/api/admin/reset", { method: "POST" });
      if (r.ok) { toast("Content reset. Reloading…", "ok"); setTimeout(loadAll, 800); }
      else toast(r.body.error || "Reset failed.", "err");
    });
  }

  async function refreshMessageBadge() {
    const badge = $("#msgBadge");
    try {
      const res = await api("/api/admin/messages");
      if (res.ok) {
        const n = (res.body.messages || []).length;
        badge.hidden = n === 0;
        badge.textContent = n;
      }
    } catch (_) {}
  }

  /* ============================================================
     Navigation & state
  ============================================================ */
  function switchView(view) {
    if (dirty && view !== currentView && !window.confirm("You have unsaved changes. Leave this section and discard them?")) return;
    currentView = view;
    $$(".side-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-view") === view);
    });

    if (view === "messages") {
      $("#viewTitle").textContent = "Messages";
      $("#viewSub").textContent = "Messages from the contact form.";
      $("#saveBtn").style.display = "none";
      $("#saveState").textContent = "";
      refreshMessageBadge();
      renderMessages();
      return;
    }
    if (view === "settings") {
      $("#viewTitle").textContent = "Settings";
      $("#viewSub").textContent = "Manage your account.";
      $("#saveBtn").style.display = "none";
      $("#saveState").textContent = "";
      renderSettings();
      return;
    }

    const schema = SCHEMAS[view];
    if (!schema) return;
    $("#viewTitle").textContent = schema.title;
    $("#viewSub").textContent = schema.sub;
    $("#saveBtn").style.display = "";
    setDirty(false);
    renderSection(view);
  }

  function markDirty() {
    if (currentView === "messages" || currentView === "settings") return;
    setDirty(true);
  }

  function setDirty(v) {
    dirty = v;
    const s = $("#saveState");
    if (s) {
      s.textContent = v ? "Unsaved changes" : "";
      s.className = "save-state" + (v ? " dirty" : "");
    }
  }

  async function saveCurrent() {
    if (currentView === "messages" || currentView === "settings") return;
    const payload = collect(currentView);
    setDirty(false);
    const btn = $("#saveBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    const res = await api("/api/admin/content", {
      method: "POST",
      body: JSON.stringify({ section: currentView, payload: payload })
    });
    btn.disabled = false;
    btn.textContent = "Save Changes";
    if (res.ok) {
      data[currentView] = payload;
      toast("Saved. Live site updated.", "ok");
      const s = $("#saveState");
      s.textContent = "Saved";
      s.className = "save-state saved";
      setTimeout(function () { if (s) { s.textContent = ""; s.className = "save-state"; } }, 2500);
    } else {
      toast(res.body.error || "Save failed.", "err");
      setDirty(true);
      const state = $("#saveState");
      state.textContent = "Not saved. Your edits are still here.";
      state.className = "save-state error";
    }
  }

  /* ============================================================
     Toast
  ============================================================ */
  let toastTimer = null;
  function toast(msg, type) {
    const t = $("#toast");
    t.className = "toast show " + (type || "");
    t.innerHTML = '<span class="dot"></span>' + escapeHtml(msg);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ============================================================
     Boot
  ============================================================ */
  document.addEventListener("DOMContentLoaded", function () {
    // Login
    $("#loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const u = $("#loginUsername").value.trim();
      const p = $("#loginPassword").value;
      const btn = $("#loginBtn");
      $("#loginError").textContent = "";
      btn.classList.add("loading");
      btn.disabled = true;
      doLogin(u, p).finally(function () {
        btn.classList.remove("loading");
        btn.disabled = false;
      });
    });

    // Sidebar nav
    $$(".side-nav a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        switchView(a.getAttribute("data-view"));
        $("#sidebar").classList.remove("open");
      });
    });

    $("#saveBtn").addEventListener("click", saveCurrent);
    $("#logoutBtn").addEventListener("click", function () {
      if (dirty && !window.confirm("You have unsaved changes. Log out and discard them?")) return;
      logout();
    });
    $("#menuToggle").addEventListener("click", function () {
      $("#sidebar").classList.toggle("open");
    });

    // Warn before a refresh or tab close would discard unsaved edits.
    window.addEventListener("beforeunload", function (e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });

    // If already authenticated, go straight in.
    if (token) {
      enterApp();
    }
  });
})();

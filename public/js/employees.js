(function () {
  "use strict";
  const grid = document.getElementById("employeeGrid");
  const portal = document.getElementById("employeePortal");
  const tokenKey = "fe_employee_token";
  let token = sessionStorage.getItem(tokenKey) || "";
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  async function api(path, options) {
    options = options || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(path, Object.assign({}, options, { headers }));
    let body = {};
    try { body = await response.json(); } catch (_) {}
    return { ok: response.ok, status: response.status, body };
  }

  async function loadDirectory() {
    try {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Could not load employees");
      const { employees } = await response.json();
      if (!employees.length) {
        grid.innerHTML = '<div class="empty">Employee profiles will appear here soon.</div>';
        return;
      }
      grid.innerHTML = employees.map((employee) => {
        const photo = employee.photo
          ? '<img class="employee-photo" src="' + esc(employee.photo) + '" alt="Photo of ' + esc(employee.name) + '" loading="lazy" />'
          : '<div class="team-avatar" aria-hidden="true">' + esc(employee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")) + '</div>';
        const skills = (employee.skills || []).map((skill) => '<span class="employee-skill">' + esc(skill) + '</span>').join("");
        const contact = (employee.email || employee.phone)
          ? '<div class="employee-contact">' + (employee.email ? '<a href="mailto:' + esc(employee.email) + '">' + esc(employee.email) + '</a>' : '') +
            (employee.phone ? '<a href="tel:' + esc(employee.phone) + '">' + esc(employee.phone) + '</a>' : '') + '</div>' : '';
        return '<article class="team-card employee-card">' + photo + '<h2>' + esc(employee.name) + '</h2>' +
          (employee.title ? '<div class="team-role">' + esc(employee.title) + '</div>' : '') +
          (employee.university ? '<p class="employee-university">' + esc(employee.university) + '</p>' : '') +
          (employee.bio ? '<p>' + esc(employee.bio) + '</p>' : '') +
          (skills ? '<div class="employee-skills">' + skills + '</div>' : '') + contact + '</article>';
      }).join("");
    } catch (_) {
      grid.innerHTML = '<div class="empty">Could not load employee profiles. Please try again later.</div>';
    }
  }

  function renderLogin(message) {
    portal.innerHTML = '<div class="employee-portal-head"><div><h2>Employee sign in</h2>' +
      '<p>Sign in to update your own profile. Ask an administrator for your account password.</p></div></div>' +
      '<form id="employeeLoginForm" class="employee-login-form"><div class="field"><label for="employeeLoginEmail">Work email</label>' +
      '<input id="employeeLoginEmail" type="email" autocomplete="username" required maxlength="254" /></div>' +
      '<div class="field"><label for="employeeLoginPassword">Password</label><input id="employeeLoginPassword" type="password" autocomplete="current-password" required /></div>' +
      '<button class="btn btn-primary" type="submit">Sign in</button><p class="employee-auth-message" role="status">' + esc(message || "") + '</p></form>';
    document.getElementById("employeeLoginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = await api("/api/employee/auth/login", { method: "POST", body: JSON.stringify({
        email: document.getElementById("employeeLoginEmail").value,
        password: document.getElementById("employeeLoginPassword").value
      }) });
      if (!result.ok) { renderLogin(result.body.error || "Sign in failed."); return; }
      token = result.body.token;
      sessionStorage.setItem(tokenKey, token);
      renderPortal();
    });
  }

  function renderEditor(employee) {
    portal.innerHTML = '<div class="employee-portal-head"><div><h2>Edit my profile</h2>' +
      '<p>Changes apply only to your employee profile.</p></div><button id="cancelEmployeeEdit" class="btn btn-ghost btn-sm">Cancel</button></div>' +
      '<form id="employeeProfileForm" class="employee-profile-form"><div class="grid-2">' +
      '<div class="field"><label for="myName">Name</label><input id="myName" required maxlength="120" value="' + esc(employee.name) + '" /></div>' +
      '<div class="field"><label for="myTitle">Job title</label><input id="myTitle" maxlength="120" value="' + esc(employee.title) + '" /></div>' +
      '<div class="field"><label for="myUniversity">Graduated from</label><input id="myUniversity" maxlength="200" value="' + esc(employee.university) + '" /></div>' +
      '<div class="field"><label for="myPhoto">Photo URL or local /assets/ path</label><input id="myPhoto" maxlength="2048" value="' + esc(employee.photo) + '" /></div>' +
      '<div class="field"><label for="myEmail">Email</label><input id="myEmail" type="email" required maxlength="254" value="' + esc(employee.email) + '" /></div>' +
      '<div class="field"><label for="myPhone">Phone number</label><input id="myPhone" type="tel" maxlength="40" value="' + esc(employee.phone) + '" /></div></div>' +
      '<div class="field"><label for="myBio">Bio</label><textarea id="myBio" rows="4" maxlength="2000">' + esc(employee.bio) + '</textarea></div>' +
      '<div class="field"><label for="mySkills">Skills (comma separated)</label><input id="mySkills" value="' + esc((employee.skills || []).join(", ")) + '" /></div>' +
      '<button class="btn btn-primary" type="submit">Save my profile</button><p class="employee-auth-message" role="status"></p></form>';
    document.getElementById("cancelEmployeeEdit").addEventListener("click", () => renderPortal());
    document.getElementById("employeeProfileForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const profile = {
        name: document.getElementById("myName").value,
        title: document.getElementById("myTitle").value,
        university: document.getElementById("myUniversity").value,
        photo: document.getElementById("myPhoto").value,
        email: document.getElementById("myEmail").value,
        phone: document.getElementById("myPhone").value,
        bio: document.getElementById("myBio").value,
        skills: document.getElementById("mySkills").value.split(",").map((skill) => skill.trim()).filter(Boolean)
      };
      const result = await api("/api/employee/profile", { method: "POST", body: JSON.stringify({ employee: profile }) });
      const status = document.querySelector(".employee-profile-form .employee-auth-message");
      if (!result.ok) { status.textContent = result.body.error || "Could not save profile."; return; }
      await loadDirectory();
      renderPortal("Your profile has been updated.");
    });
  }

  async function renderPortal(message) {
    if (!token) { renderLogin(message); return; }
    const result = await api("/api/employee/me");
    if (!result.ok) {
      token = "";
      sessionStorage.removeItem(tokenKey);
      renderLogin("Please sign in to continue.");
      return;
    }
    const employee = result.body.employee;
    portal.innerHTML = '<div class="employee-portal-head"><div><h2>Signed in as ' + esc(employee.name) + '</h2>' +
      '<p>You can edit your profile only. Changing your email also changes the email you use to sign in.</p>' +
      (message ? '<p class="employee-auth-message" role="status">' + esc(message) + '</p>' : '') + '</div>' +
      '<div class="employee-portal-actions"><button id="editMyEmployeeProfile" class="btn btn-primary btn-sm">Edit my profile</button>' +
      '<button id="employeeSignOut" class="btn btn-ghost btn-sm">Sign out</button></div></div>';
    document.getElementById("editMyEmployeeProfile").addEventListener("click", () => renderEditor(employee));
    document.getElementById("employeeSignOut").addEventListener("click", async () => {
      await api("/api/employee/auth/logout", { method: "POST" });
      token = "";
      sessionStorage.removeItem(tokenKey);
      renderLogin("You have signed out.");
    });
  }

  renderPortal();
  loadDirectory();
})();

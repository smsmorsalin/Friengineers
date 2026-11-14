(function () {
  "use strict";
  const grid = document.getElementById("employeeGrid");
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  fetch("/api/employees").then((response) => {
    if (!response.ok) throw new Error("Could not load employees");
    return response.json();
  }).then(({ employees }) => {
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
  }).catch(() => { grid.innerHTML = '<div class="empty">Could not load employee profiles. Please try again later.</div>'; });
})();

(() => {
    "use strict";

    const SESSION_KEY = "themba_session";
    const roleSelect = document.querySelector("#insurance-role");
    const sidebar = document.querySelector("#sidebar");
    const toastStack = document.querySelector("#insurance-toasts");

    const destinations = {
        member: "members-dashboard.html",
        treasurer: "treasurer-dashboard.html",
        platform_admin: "platform-admin-dashboard.html",
        insurance: "insurance-dashboard.html"
    };

    const iconPaths = {
        grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
        shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
        receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7z"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
    };

    document.querySelectorAll("[data-icon]").forEach((el) => {
        const body = iconPaths[el.dataset.icon];
        if (body) {
            el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
        }
    });

    function readSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function updateSession(patch) {
        const current = readSession() || {};
        const next = { ...current, ...patch };
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        return next;
    }

    function initialsFromName(name) {
        if (!name) return "IN";
        const parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function applyProfile() {
        const session = readSession() || {};
        const name = session.name || "Insurance User";
        const first = name.split(/\s+/)[0] || "User";
        const initials = initialsFromName(name);

        const nameInput = document.querySelector("#insurance-name");
        const emailInput = document.querySelector("#insurance-email");
        if (nameInput) nameInput.value = session.name || "";
        if (emailInput) emailInput.value = session.email || "";

        document.querySelectorAll("[data-user-name]").forEach((el) => {
            el.textContent = name;
        });
        document.querySelectorAll("[data-user-initials]").forEach((el) => {
            el.textContent = initials;
        });
        document.querySelectorAll("[data-first-name]").forEach((el) => {
            el.textContent = first;
        });

        if (roleSelect) roleSelect.value = "insurance";
    }

    function showToast(message, type = "info") {
        if (!toastStack) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastStack.appendChild(toast);
        window.setTimeout(() => {
            toast.classList.add("out");
            window.setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function navigate(page) {
        document.querySelectorAll(".page-view").forEach((view) => {
            const match = view.dataset.view === page;
            view.classList.toggle("is-visible", match);
            view.hidden = !match;
        });
        document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
            link.classList.toggle("is-active", link.dataset.page === page);
        });
        const crumb = document.getElementById("breadcrumb");
        if (crumb) {
            const labels = {
                overview: "Insurance",
                literacy: "Insurance literacy",
                options: "Protection options",
                settings: "Profile & settings"
            };
            crumb.textContent = labels[page] || "Insurance";
        }
    }

    // Role switcher
    if (roleSelect) {
        roleSelect.addEventListener("change", () => {
            const role = roleSelect.value;
            updateSession({ role });
            if (destinations[role] && role !== "insurance") {
                window.location.href = destinations[role];
            }
        });
    }

    // Side nav
    document.querySelectorAll(".nav-link[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => navigate(btn.dataset.page));
    });

    // Mobile menu
    const menuBtn = document.querySelector('[data-action="menu"]');
    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", () => {
            const open = sidebar.classList.toggle("is-open");
            menuBtn.setAttribute("aria-expanded", String(open));
        });
    }

    // Sign out
    document.querySelectorAll('[data-action="sign-out"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            localStorage.removeItem(SESSION_KEY);
            window.location.href = "login.html";
        });
    });

    // Profile form (settings)
    const profileForm = document.querySelector("#insurance-profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const name = document.querySelector("#insurance-name")?.value.trim();
            const email = document.querySelector("#insurance-email")?.value.trim();
            if (!name || !email) {
                showToast("Please enter your name and email address.", "error");
                return;
            }
            updateSession({ name, email, role: "insurance" });
            applyProfile();
            showToast("Insurance profile updated.", "success");
        });
    }

    // Restore session profile on load
    applyProfile();
    navigate("overview");
})();
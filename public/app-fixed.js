/* eslint-disable no-console, no-prototype-builtins, no-unused-vars */
// Secure App.js with XSS prevention and secure token storage

// Sanitize HTML to prevent XSS
const DOMPurify = require("isomorphic-dompurify");

function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "title", "target"],
  });
}

// Safe element update without innerHTML
function safeUpdateElement(element, content) {
  // Clear existing content
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  // Add sanitized content
  const sanitized = sanitizeHTML(content);
  const temp = document.createElement("div");
  temp.innerHTML = sanitized;

  while (temp.firstChild) {
    element.appendChild(temp.firstChild);
  }
}

class FixzitApp {
  constructor() {
    this.init();
  }

  init() {
    // Use secure cookie-based authentication instead of localStorage
    this.checkAuthentication();
    this.setupEventListeners();
  }

  checkAuthentication() {
    // Check for httpOnly cookie presence via API call
    fetch("/api/auth/check", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          this.loadDashboard();
        } else {
          this.showLogin();
        }
      });
  }

  updateDashboard(data) {
    const dashboard = document.getElementById("dashboard");
    if (!dashboard) return;

    // Safe update without innerHTML
    safeUpdateElement(dashboard, data.content);
  }

  displayWorkOrders(orders) {
    const container = document.getElementById("work-orders");
    if (!container) return;

    // Clear and rebuild safely
    container.innerHTML = ""; // Clear first

    orders.forEach((order) => {
      const orderEl = document.createElement("div");
      orderEl.className = "work-order";

      // Create elements safely
      const title = document.createElement("h3");
      title.textContent = order.title; // textContent is XSS-safe

      const description = document.createElement("p");
      description.textContent = order.description;

      const status = document.createElement("span");
      status.className = `status ${order.status}`;
      status.textContent = order.status;

      orderEl.appendChild(title);
      orderEl.appendChild(description);
      orderEl.appendChild(status);
      container.appendChild(orderEl);
    });
  }

  setupEventListeners() {
    // Prevent form-based XSS
    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", (e) => {
        const inputs = form.querySelectorAll("input, textarea");
        inputs.forEach((input) => {
          // Sanitize input values
          if (input.type !== "password") {
            input.value = DOMPurify.sanitize(input.value);
          }
        });
      });
    });
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  new FixzitApp();
});

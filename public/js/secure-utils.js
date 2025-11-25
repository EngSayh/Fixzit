// Secure utility functions for XSS prevention
class SecureUtils {
  // Safe HTML sanitization without external dependencies
  static sanitizeHTML(dirty) {
    if (typeof dirty !== "string") return "";

    // Basic HTML entity encoding
    return dirty
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  // Safe element update without innerHTML
  static safeUpdateElement(element, content) {
    if (!element) return;

    // Clear existing content
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    // Add sanitized text content
    if (typeof content === "string") {
      element.textContent = content;
    } else if (
      content instanceof DocumentFragment ||
      content instanceof Element
    ) {
      element.appendChild(content);
    }
  }

  // Create safe HTML elements
  static createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }

    if (options.textContent) {
      element.textContent = options.textContent;
    }

    if (options.attributes) {
      Object.keys(options.attributes).forEach((attr) => {
        element.setAttribute(attr, options.attributes[attr]);
      });
    }

    return element;
  }

  // Safe form input sanitization
  static sanitizeFormInputs(form) {
    const inputs = form.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      if (input.type !== "password" && input.type !== "file") {
        input.value = this.sanitizeHTML(input.value);
      }
    });
  }

  // Secure cookie-based token storage
  static getAuthToken() {
    // Check authentication via API call instead of localStorage
    return fetch("/api/auth/check", {
      credentials: "include",
    }).then((res) => res.json());
  }

  static clearAuth() {
    return fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  }
}

// Export for use in other scripts
window.SecureUtils = SecureUtils;

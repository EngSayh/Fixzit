/* eslint-disable no-console, no-prototype-builtins, no-unused-vars, no-undef */
// Simple React App - No external dependencies
// 🔐 Email domain comes from window for rebranding; falls back to generic demo domain.
const EMAIL_DOMAIN = window.EMAIL_DOMAIN || window.__EMAIL_DOMAIN__ || "example.com";
console.log("App.js loading...");

// Wait for React to load
function initializeApp() {
  if (!window.React || !window.ReactDOM) {
    console.log("Waiting for React...");
    setTimeout(initializeApp, 100);
    return;
  }

  console.log("React loaded, initializing app...");

  const { Component, createElement } = React;
  const { createRoot } = ReactDOM;

  class FixzitApp extends Component {
    constructor(props) {
      super(props);
      this.state = {
        user: null,
        currentView: "dashboard",
      };
    }

    componentDidMount() {
      console.log("App mounted");
      // Auto login for demo
      this.setState({
        user: {
          name: "Demo User",
          email: `demo@${EMAIL_DOMAIN}`,
          role: "admin",
        },
      });
    }

    renderNavigation() {
      const { currentView } = this.state;
      const menuItems = [
        { id: "dashboard", label: "Dashboard", icon: "📊" },
        { id: "properties", label: "Properties", icon: "🏢" },
        { id: "workorders", label: "Work Orders", icon: "🔧" },
        { id: "finance", label: "Finance", icon: "💰" },
        { id: "marketplace", label: "Marketplace", icon: "🛒" },
        { id: "hr", label: "HR", icon: "👥" },
        { id: "tickets", label: "Support", icon: "🎫" },
        { id: "compliance", label: "Compliance", icon: "📋" },
        { id: "reports", label: "Reports", icon: "📈" },
      ];

      return createElement(
        "nav",
        { className: "sidebar" },
        createElement(
          "div",
          { className: "nav-header" },
          createElement("h2", null, "Fixzit Souq"),
          createElement("span", null, this.state.user?.name || "User"),
        ),
        createElement(
          "ul",
          { className: "nav-menu" },
          menuItems.map((item) =>
            createElement(
              "li",
              {
                key: item.id,
                className: currentView === item.id ? "active" : "",
                onClick: () => this.setState({ currentView: item.id }),
              },
              createElement("span", { className: "icon" }, item.icon),
              createElement("span", null, item.label),
            ),
          ),
        ),
        createElement(
          "button",
          {
            className: "logout-btn",
            onClick: () => this.setState({ user: null }),
          },
          "Logout",
        ),
      );
    }

    renderDashboard() {
      return createElement(
        "div",
        { className: "dashboard" },
        createElement("h1", null, "Fixzit Souq Dashboard"),
        createElement(
          "div",
          { className: "stats-grid" },
          createElement(
            "div",
            { className: "stat-card" },
            createElement("h3", null, "Properties"),
            createElement("div", { className: "stat-number" }, "45"),
            createElement(
              "div",
              { className: "stat-label" },
              "Total Properties",
            ),
          ),
          createElement(
            "div",
            { className: "stat-card" },
            createElement("h3", null, "Work Orders"),
            createElement("div", { className: "stat-number" }, "12"),
            createElement("div", { className: "stat-label" }, "Open Orders"),
          ),
          createElement(
            "div",
            { className: "stat-card" },
            createElement("h3", null, "Revenue"),
            createElement("div", { className: "stat-number" }, "125,000 SAR"),
            createElement("div", { className: "stat-label" }, "This Month"),
          ),
          createElement(
            "div",
            { className: "stat-card" },
            createElement("h3", null, "Compliance"),
            createElement("div", { className: "stat-number" }, "98%"),
            createElement(
              "div",
              { className: "stat-label" },
              "ZATCA Compliant",
            ),
          ),
        ),
      );
    }

    renderContent() {
      const { currentView } = this.state;

      switch (currentView) {
        case "dashboard":
          return this.renderDashboard();
        default:
          return createElement(
            "div",
            { className: "content-section" },
            createElement(
              "h1",
              null,
              currentView.charAt(0).toUpperCase() + currentView.slice(1),
            ),
            createElement(
              "p",
              null,
              `${currentView} module is ready for implementation.`,
            ),
          );
      }
    }

    renderLogin() {
      return createElement(
        "div",
        { className: "login-container" },
        createElement(
          "div",
          { className: "login-form" },
          createElement("h2", null, "Fixzit Souq Login"),
          createElement("p", null, "Demo Mode - Click to continue"),
          createElement(
            "button",
            {
              onClick: () =>
                this.setState({
                  user: {
                    name: "Demo User",
                    email: `demo@${EMAIL_DOMAIN}`,
                    role: "admin",
                  },
                }),
            },
            "Enter Demo",
          ),
        ),
      );
    }

    render() {
      const { user } = this.state;

      if (!user) {
        return this.renderLogin();
      }

      return createElement(
        "div",
        { className: "app" },
        this.renderNavigation(),
        createElement(
          "main",
          { className: "main-content" },
          this.renderContent(),
        ),
      );
    }
  }

  // Mount the app
  const root = createRoot(document.getElementById("root"));
  root.render(createElement(FixzitApp));

  console.log("App rendered successfully");
}

// Start initialization
initializeApp();

/**
 * Simple hash-based router
 */

export class Router {
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this.currentView = null;

    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const route = this.routes.find(r => r.path === hash) || this.routes[0];

    // Update nav active state
    document.querySelectorAll('[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route.path);
    });

    // Render view
    if (this.currentView?.destroy) this.currentView.destroy();
    this.container.innerHTML = '';
    this.currentView = route.view();
    if (typeof this.currentView === 'string') {
      this.container.innerHTML = this.currentView;
    } else if (this.currentView instanceof HTMLElement) {
      this.container.appendChild(this.currentView);
    } else if (this.currentView?.el) {
      this.container.appendChild(this.currentView.el);
      if (this.currentView.mount) this.currentView.mount();
    }
  }

  navigate(path) {
    window.location.hash = path;
  }

  getCurrentPath() {
    return window.location.hash.slice(1) || '/';
  }
}

export class Router {
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this.currentView = null;
    this.onHashChange = () => this.resolve();

    this.aliases = {
      '/activity': '/timeline',
      '/habits': '/',
    };

    window.addEventListener('hashchange', this.onHashChange);
    this.resolve();
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const path = this.aliases[hash] ?? hash;

    if (path !== hash) {
      window.location.replace(`#${path}`);
      return;
    }

    const route = this.routes.find((r) => r.path === path) || this.routes[0];

    document.querySelectorAll('[data-route]').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === route.path);
    });

    this.currentView?.destroy?.();
    this.container.innerHTML = '';

    this.currentView = route.view();
    if (!this.currentView?.el) {
      throw new Error(`Route "${route.path}" must return a view with an el property`);
    }

    this.container.appendChild(this.currentView.el);
    this.currentView.mount?.();
  }

  navigate(path) {
    window.location.hash = path;
  }

  getCurrentPath() {
    const hash = window.location.hash.slice(1) || '/';
    return this.aliases[hash] ?? hash;
  }

  destroy() {
    window.removeEventListener('hashchange', this.onHashChange);
    this.currentView?.destroy?.();
  }
}

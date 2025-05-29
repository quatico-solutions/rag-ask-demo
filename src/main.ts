import { hello } from './index';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.textContent = hello();
}

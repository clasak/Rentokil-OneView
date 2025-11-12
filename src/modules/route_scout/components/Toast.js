class ToastManager {
  constructor(){
    this.el = document.createElement('div');
    this.el.className = 'rs-toast';
    this.timer = null;
  }
  show(msg){
    this.el.textContent = msg;
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('show'), 2000);
  }
}

export const Toast = new ToastManager();


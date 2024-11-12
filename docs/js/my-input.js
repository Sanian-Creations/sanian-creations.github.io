class MyInput extends HTMLElement {
	#clicked;
	
	constructor() {
		super();
		
		this.contentEditable = true;

		this.addEventListener("keydown", this.#keydown);
		this.addEventListener("focus", this.#focus);
		this.addEventListener("mousedown", this.#mousedown);
		this.addEventListener("blur", this.#blur);
	}

	#keydown(e) {
		if (e.code === "Enter") {
			e.preventDefault(); 
		}
	}
	#focus(e) {
		// select content on focus, but not when clicked (then it places the cursor where you clicked)
		if (this.#clicked) return;
		window.getSelection().selectAllChildren(this);
	}
	#mousedown(e) { this.#clicked = true; }
	#blur(e) { this.#clicked = false; }
}

// cached variable
const range = document.createRange();

customElements.define("my-input", MyInput);

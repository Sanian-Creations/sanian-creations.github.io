
class MyInput extends HTMLElement {
	constructor() {
		super(); 
	}
	
	connectedCallback() {
		this.contentEditable = true;
		this.addEventListener("keydown", e => {
			// do not insert newline characters into this input
			if (e.code === "Enter") {
				e.preventDefault(); 
			}
		});
	}
}



customElements.define("my-input", MyInput);

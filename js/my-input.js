
class MyInput extends HTMLParagraphElement // must because it is a modified <p> element, change this if it is something else
{
	constructor() {
		super(); 
	}
	
	connectedCallback() {
		this.contentEditable = true;
		this.addEventListener("keydown", prevent_enter);
	}
}

function prevent_enter(e) {
	if (e.code === "Enter") {
		e.preventDefault();
	}
}

customElements.define("my-input", MyInput, { extends: "p" });

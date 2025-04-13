class MyInput extends HTMLElement {
	#clicked;
	
	constructor() {
		super();
		
		this.contentEditable = true;

		this.addEventListener("keydown", this.#keydown);
		this.addEventListener("focus", this.#focus);
		this.addEventListener("mousedown", this.#mousedown);
		this.addEventListener("blur", this.#blur);
		this.addEventListener('paste', this.#paste);
	}

	#paste(e) {
		// This is necessary because if you paste "rich content" aka "copied html elements" into a contenteditable element, 
		// it pastes all the html elements in there, even though we only want it to paste the *text*.
		// Also, we don't allow newlines to be entered so we have to replace all of those as well.

		e.preventDefault();
		let text = e.clipboardData.getData('text/plain').replaceAll("\n", ""); // No newlines allowed!
		
		document.execCommand('insertText', false, text);
		// 'execCommand' is deprecated, but there is no modern way to replace text inside a text node (without creating new text nodes) 
		// and also retain undo-history. It still works in all major browsers so this is not a problem (yet).
	}
	#keydown(e) {
		if (e.code === "Enter") { // No newlines allowed!
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

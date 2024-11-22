import "./my-input.js"; // import nothing, but ensures the custom component is loaded

let moving = undefined; // anime which is currently being moved, or undefined if one is not being moved

function pr(a) {
	console.log(a);
	return a;
}

const list_elem      = document.getElementById("list");
const anime_template = document.getElementById("anime_template");

const export_button      = document.getElementById("export_button");
const export_dialog      = document.getElementById("export_dialog");
const export_textarea    = export_dialog.querySelector("textarea");
const export_button_copy = export_dialog.querySelector("button.copy");

const import_button    = document.getElementById("import_button");
const import_dialog    = document.getElementById("import_dialog");
const import_textarea  = import_dialog.querySelector("textarea");
const import_button_ok = import_dialog.querySelector("button.ok");
const import_button_paste = import_dialog.querySelector("button.paste");

const edit_dialog    = document.getElementById("edit_dialog");
const edit_fields    = edit_dialog.querySelector("#edit_fields");
const edit_button_ok = edit_dialog.querySelector("button.ok");

const new_anime_btn = document.getElementById("new_anime_button");

class Anime extends HTMLTableRowElement { // json serializable
	data;

	constructor(in_data) {
		super();

		this.data = in_data ?? {};
		this.data.episode_number ??= 1;
		this.data.title ??= "";
		this.data.link ??= "";
		this.data.air_time ??= "";

		this.setAttribute("tabindex", 0);
		this.append(anime_template.content.cloneNode(true)); // true for deepcopy
		
		this.update_all();
		this.init_callbacks();
	}

	update_all() {
		for (const field in this.data) { this.update(field); }
	}

	update(fieldname) {
		switch (fieldname) {
			case "title": {
				this.querySelector(".title").innerText = this.data.title;
			} break;
			case "episode_number": 
				this.querySelector(".episode_number").innerText = `Ep. ${this.data.episode_number}`;
				// FALLTHROUGH IS ACTUALLY USEFUL FOR ONCE HOLYYY
			case "link": {
				this.querySelector(".title").href = generate_link(this.data.link, this.data.episode_number);
			} break;
			case "air_time": {
				this.querySelector(".air_time").innerText = this.data.air_time;
			} break;
			default: {
				alert(`tried to set/update non existent field '${fieldname}'`);
			} break;
		}
	}
	
	set(fieldname, val) {
		this.data[fieldname] = val;
		this.update(fieldname);
	}
 
	inc_episode_by(amount) {
		this.data.episode_number += amount;
		this.update("episode_number");
	}

	init_callbacks() {
		const next_btn   = this.querySelector(".next_btn");
		const prev_btn   = this.querySelector(".prev_btn");
		const edit_btn   = this.querySelector(".edit_btn");
		const move_btn   = this.querySelector(".move_btn");
		const remove_btn = this.querySelector(".remove_btn");

		next_btn  .addEventListener("click", e => { this.inc_episode_by(1);  save_list(); });
		prev_btn  .addEventListener("click", e => { this.inc_episode_by(-1); save_list(); });
		remove_btn.addEventListener("click", e => {
			if (confirm(`Delete ${this.data.title}?`)) {
				this.remove();
				save_list();
				if (this === document.activeElement) {
					(this.nextSibling ?? this.previousSibling)?.focus();
				}
				this.remove();
			}
		});
		edit_btn.addEventListener("click", e => {
			const inputs = edit_fields.querySelectorAll(".field_input");
			for (let i = 0; i < inputs.length; i++) {
				const input = inputs[i];
				const field = input.dataset.field;
				if (input.constructor === HTMLInputElement) {
					input.valueAsNumber = this.data[field];
				} else {
					input.innerText = this.data[field];
				}
			}

			edit_button_ok.onclick = e => {
				const ok = this.set_from_inputs(inputs);
				if (!ok) { e.preventDefault(); return; }
				save_list();
			}
			edit_dialog.dataset.mode = "edit";
			edit_dialog.showModal();
		});

		// TODO moving is jank rn, make it less jank
		move_btn.addEventListener("click", e => {
			if (moving) {

				if (moving !== this) {
					const target_index = Array.prototype.indexOf.call(list_elem.children, this);

					moving.remove();
					element_insert(list_elem, target_index, moving);

					save_list();
				}

				const buttons = document.getElementsByTagName("button");
				for (let i = 0; i < buttons.length; i++) {
					const btn = buttons[i];
					if (btn.classList.contains("move_btn")) {
						btn.innerText = "Move";
					} else {
						btn.disabled = false;
					}
				}

				moving = undefined;

			} else {

				const buttons = document.getElementsByTagName("button");
				for (let i = 0; i < buttons.length; i++) {
					const btn = buttons[i];
					if (btn.classList.contains("move_btn")) {
						btn.innerText = "Here";
					} else {
						btn.disabled = true;
					}
				}

				moving = this;
			}
		});

		this.addEventListener("mouseenter", e => e.target.focus());
	}

	set_from_inputs(inputs) {
		let ok = true;
		for (let i = 0; i < inputs.length; i++) {
			const input = inputs[i];
			let value;
			if (input.constructor === HTMLInputElement) {
				value = input.valueAsNumber;
			} else {
				value = input.innerText;
			}
			this.set(input.dataset.field, value);
		}
		return ok;
	}

	toJSON() {
		return this.data;
	}
}
customElements.define("my-anime", Anime, {extends: 'tr'});

// TODO: make pressing enter in the input class switch focus to the next element

//
// Adding anime
//
new_anime_btn.addEventListener("click", function () {
	const anime = new Anime();

	const inputs = edit_fields.querySelectorAll(".field_input");
	for (let i = 0; i < inputs.length; i++) {
		const input = inputs[i];

		// Every input has a data-field attribute that specifies which field that input is for
		const field = input.dataset.field; 
		if (input.constructor === HTMLInputElement) {
			input.valueAsNumber = anime.data[field];
		} else {
			input.innerText = anime.data[field];
		}
	}

	edit_button_ok.onclick = e => {
		const ok = anime.set_from_inputs(inputs);
		if (!ok) { e.preventDefault(); return; }

		list_elem.append(anime);
		save_list();
	
		anime.focus();
	}
	edit_dialog.dataset.mode = "add";
	edit_dialog.showModal();
});

//
// Exporting
//
export_button.addEventListener("click", e => {
	export_textarea.value = JSON.stringify(Array.from(list_elem.children));
	export_button_copy.classList.remove("flash-fade");
	export_dialog.showModal();
});
export_button_copy.addEventListener("click", async e => {
	e.preventDefault(); // Do not close the dialog.  MUST be called before any 'await' or event will have passed
	await set_clipboard(export_textarea.value);
	
	// See: https://css-tricks.com/restart-css-animation/
	export_button_copy.classList.remove("flash-fade");
	void export_button_copy.offsetWidth;
	export_button_copy.classList.add("flash-fade");
});

//
// Importing
//
import_button.addEventListener("click", () => {
	import_textarea.value = "";
	import_dialog.showModal();
});
import_button_ok.addEventListener("click", e => {
	e.preventDefault();
	import_from_textarea();
});
import_button_paste.addEventListener("click", async e => {
	e.preventDefault();
	try {
		import_textarea.value = await get_clipboard();
	} catch (err) {
		if (err.name !== "NotAllowedError") {
			alert(err);
		}
		return;
	}
	import_from_textarea();
});
function import_from_textarea() {
	const err = load_list_from_json(import_textarea.value);
	if (err) { 
		alert(err);
		return; 
	}
	import_textarea.value = "";
	save_list();
	import_dialog.close(); // close on success
}

//
// Hotkeys
//
list_elem.addEventListener("keydown", e => {
	switch (e.code) {

		case "ArrowUp": (document.activeElement.previousSibling ?? list_elem.lastChild)?.focus(); break;
		case "ArrowDown": (document.activeElement.nextSibling ?? list_elem.firstChild)?.focus(); break;

		case "KeyA": new_anime_btn.click(); break;

		case "Enter":      document.activeElement.querySelector(".title").click();      break;
		case "ArrowLeft":  document.activeElement.querySelector(".prev_btn").click();   break;
		case "ArrowRight": document.activeElement.querySelector(".next_btn").click();   break;
		case "KeyM":       document.activeElement.querySelector(".move_btn").click();   break;
		case "KeyE":       document.activeElement.querySelector(".edit_btn").click();   e.preventDefault(); /* otherwise it types an 'e' in the edit fields */ break;
		case "Delete":     document.activeElement.querySelector(".remove_btn").click(); break;

		case "Escape":

		const buttons = document.getElementsByTagName("button");
		for (let i = 0; i < buttons.length; i++) {
			const btn = buttons[i];
			if (btn.classList.contains("move_btn")) {
				btn.innerText = "Move";
			} else {
				btn.disabled = false;
			}
		}

		moving = undefined;

		break;
	}
});

// --- utility functions ---


function generate_link(link, ep) {
	return link?.replace("EPISODE_NUMBER", ep);
}

/**
 * @param {string} input_json 
 * @returns {Error}
 */
function load_list_from_json(input_json) {
	const [arr, err] = try_json_parse_array(input_json);
	if (err) return err;

	remove_children(list_elem); // only remove what was there if parsing was successful
	for (let i = 0; i < arr.length; i++) {
		const anime = new Anime(arr[i]);
		list_elem.append(anime);
	}

	if (list_elem.firstChild) {
		list_elem.firstChild.focus();
	}
}

function save_list() {
	localStorage.setItem("show_list.list", JSON.stringify(Array.from(list_elem.children)));
}

function array_remove(arr, index) {
	arr.splice(index, 1);
}

function array_insert(arr, index, elem) {
	arr.splice(index, 0, elem);
}

function remove_children(elem) {
	while (elem.lastChild) elem.lastChild.remove();
}

function element_insert(parent, index, new_element) {
	const children = parent.children;
	if (index < children.length) {
		parent.insertBefore(new_element, children[index]);
	} else {
		parent.appendChild(new_element);
	}
}

async function set_clipboard(text) {
	// Retarded API.
	// https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
	const type = "text/plain";
	const blob = new Blob([text], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	await navigator.clipboard.write(data);
}
async function get_clipboard() {
	return await navigator.clipboard.readText();
}

/**
 * @param {string} json 
 * @returns {[any, Error]}
 */
function try_json_parse(json) /* [parsed, err] */ {
	try {
		return [JSON.parse(json)];
	} catch (err) {
		return [undefined, err];
	}
}

/**
 * @param {string} json 
 * @returns {[Array, Error]}
 */
function try_json_parse_array(json) /* [arr, err] */ {
	let parsed;
	try {
		parsed = JSON.parse(json);
	} catch (err) {
		return [undefined, err];
	}
	if (parsed.constructor !== Array) {
		return [undefined, `Expected json to contain an array, instead it was ${parsed.constructor.name}`];
	}
	return [parsed];
}

//
// main code
//
{
	const err = load_list_from_json(localStorage.getItem("show_list.list") ?? "[]");
	if (err) {
		alert(err);
	}
}
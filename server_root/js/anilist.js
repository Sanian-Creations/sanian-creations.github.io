let moving = undefined; // anime which is currently being moved, or undefined if one is not being moved
let list;

function pr(a) {
	console.log(a);
	return a;
}

const list_elem      = document.getElementById("list");
const anime_template = document.getElementById("anime_template");
const field_input_template = document.getElementById("field_input_template");

const export_button    = document.getElementById("export_button");
const export_dialog    = document.getElementById("export_dialog");
const export_textarea  = export_dialog.querySelector("textarea");

const import_button    = document.getElementById("import_button");
const import_dialog    = document.getElementById("import_dialog");
const import_textarea  = import_dialog.querySelector("textarea");
const import_button_ok = import_dialog.querySelector("button.ok");

const edit_dialog    = document.getElementById("edit_dialog");
const edit_fields    = edit_dialog.querySelector("#edit_fields");
const edit_textarea  = edit_dialog.querySelector("textarea");
const edit_button_ok = edit_dialog.querySelector("button.ok");

const new_anime_btn = document.getElementById("new_anime_button");

class Anime { // json serializable
	data;
	elem;

	constructor(in_data) {
		this.data = in_data ?? {};
		this.data.episode_number ??= 1;
		this.data.title ??= "";
		this.data.link ??= "";
		this.data.air_time ??= "";

		this.elem = anime_template.content.cloneNode(true).children[0]; // true for deepcopy

		this.update_all();
		this.init_callbacks();
	}

	update_all() {
		for (const field in this.data) { this.update(field); }
	}
	update(fieldname) {
		switch (fieldname) {
			case "title": {
				this.elem.querySelector(".title").innerText = this.data.title;
			} break;
			case "episode_number": 
				this.elem.querySelector(".episode_number").innerText = `Ep. ${this.data.episode_number}`;
				// FALLTHROUGH IS ACTUALLY USEFUL FOR ONCE HOLYYY
			case "link": {
				this.elem.querySelector(".title").href = generate_link(this.data.link, this.data.episode_number);
			} break;
			case "air_time": {
				this.elem.querySelector(".air_time").innerText = this.data.air_time;
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
		const next_btn   = this.elem.querySelector(".next_btn");
		const prev_btn   = this.elem.querySelector(".prev_btn");
		const edit_btn   = this.elem.querySelector(".edit_btn");
		const move_btn   = this.elem.querySelector(".move_btn");
		const remove_btn = this.elem.querySelector(".remove_btn");

		next_btn  .addEventListener("click", e => { this.inc_episode_by(1);  save_list(); });
		prev_btn  .addEventListener("click", e => { this.inc_episode_by(-1); save_list(); });
		remove_btn.addEventListener("click", e => {
			if (confirm(`Delete ${this.data.title}?`)) {
				array_remove(list, list.indexOf(this));
				save_list();
				if (this.elem === document.activeElement) {
					(this.elem.nextSibling ?? this.elem.previousSibling)?.focus();
				}
				this.elem.remove();
			}
		});
		edit_btn.addEventListener("click", e => {
			const inputs = edit_fields.querySelectorAll(".field_input");
			for (let i = 0; i < inputs.length; i++) {
				const input = inputs[i];
				const field = input.dataset.field;
				input.innerText = this.data[field];
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
					list_elem.insertBefore(/*insert this*/moving.elem, /*before this*/this.elem);

					array_remove(list, list.indexOf(moving)); // remove the anime we're moving,
					array_insert(list, list.indexOf(this), moving); // then insert it here

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

		this.elem.addEventListener("mouseenter", e => e.target.focus());
	}

	set_from_inputs(inputs) {
		let ok = true;
		for (let i = 0; i < inputs.length; i++) {
			const input = inputs[i];
			let value;
			if (input.dataset.type === "number") {
				value = Number(input.innerText);
				if (isNaN(value)) {
					alert(`${input.dataset.field} is not a number (you typed "${input.innerText}")`);
					ok = false;
					continue;
				}
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

// TODO make a custom input class for what is currently fake_input, because pressing Enter inside it currently inserts a newline which suuuucks

//
// Adding anime
//
new_anime_btn.addEventListener("click", function () {
	const anime = new Anime();

	const inputs = edit_fields.querySelectorAll(".field_input");
	for (let i = 0; i < inputs.length; i++) {
		const input = inputs[i];
		const field = input.dataset.field;
		input.innerText = anime.data[field];
	}

	edit_button_ok.onclick = e => {
		const ok = anime.set_from_inputs(inputs);
		if (!ok) { e.preventDefault(); return; }

		list.push(anime);
		save_list();
	
		list_elem.append(anime.elem);
		anime.elem.focus();
	}
	edit_dialog.dataset.mode = "add";
	edit_dialog.showModal();
});

//
// Exporting
//
export_button.addEventListener("click", e => {
	export_textarea.value = JSON.stringify(list);
	export_dialog.showModal();
});

//
// Importing
//
import_button.addEventListener("click", () => import_dialog.showModal());
import_button_ok.addEventListener("click", e => {
	const err = load_list_from_json(import_textarea.value);
	if (err) { 
		alert(err); 
		return; 
	}
	import_textarea.value = "";
	save_list();
});

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

// make backdrop clicks close their corresponding dialog.
let mousedown_x, mousedown_y;
document.addEventListener('mousedown', e => {
	mousedown_x = e.clientX;
	mousedown_y = e.clientY;
});
document.addEventListener("click", e => {
	if (e.target.tagName !== "DIALOG") return;
	const dialog = e.target;

	const rect = dialog.getBoundingClientRect();
	const pressed_in_dialog  = in_rect(mousedown_x, mousedown_y, rect);
	const released_in_dialog = in_rect(e.clientX, e.clientY, rect);
	const clicked_dialog = pressed_in_dialog || released_in_dialog;

	if (!clicked_dialog) { // clicked on the backdrop of the dialog, that should close it.
	  dialog.close();
	}
});

// close dialogs on escape
document.addEventListener("keydown", e => {
	switch (e.code) {
		case "Escape": 
			const dialogs = document.querySelectorAll("dialog");
			for (let i = 0; i < dialogs.length; i++) {
				if (dialogs[i].open) {
					dialogs[i].close();
					return;
				}
			}
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
	list = arr.map(data => {
		const anime = new Anime(data);
		list_elem.append(anime.elem);
		return anime;
	});

	if (list.length > 0) {
		list[0].elem.focus();
	}
}

function save_list() {
	localStorage.setItem("anilist.list", JSON.stringify(list));
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

function in_rect(x, y, rect) {
	return x >= rect.left && x <= rect.left + rect.width &&
		y >= rect.top  && y <= rect.top  + rect.height;
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
	const err = load_list_from_json(await localStorage.getItem("anilist.list") ?? "[]");
	if (err) {
		alert(err);
	}
}
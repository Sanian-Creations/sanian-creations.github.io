let moving = undefined; // anime which is currently being moved, or undefined if one is not being moved

const list_elem      = document.getElementById("list");
const anime_template = document.getElementById("anime_template");
const textarea_popup = document.getElementById("textarea_popup");
const textarea       = textarea_popup.getElementsByTagName("textarea")[0];
const textarea_ok    = textarea_popup.getElementsByClassName("ok_btn")[0];
const new_anime_btn  = document.getElementById("new_anime_button");

class Anime { // json serializable
	data;
	elem;

	constructor(data) {
		this.data = data ?? {};
		this.data.episode_number ??= 1;
		this.data.title ??= "";
		this.data.link ??= "";
		this.data.air_time ??= "";

		this.elem = anime_template.content.cloneNode(true).children[0]; // true for deepcopy

		for (const field in data) { this[field] = data[field]; } // use setters to init html element values

		this.init_callbacks();
	}

	get episode_number() { return this.data.episode_number; }
	set episode_number(val) {
		this.data.episode_number = val;
		this.elem.querySelector(".episode_number").innerText = `Ep. ${this.episode_number}`;
		this.elem.querySelector(".title").href = generate_link(this.link, this.episode_number);
	}

	get title() { return this.data.title; }
	set title(val) {
		this.data.title = val;
		this.elem.querySelector(".title").innerText = val;
	}

	get link() { return this.data.link; }
	set link(link) {
		this.data.link = link;
		this.elem.querySelector(".title").href = generate_link(this.link, this.episode_number);
	}

	get air_time() { return this.data.air_time; }
	set air_time(val) {
		this.data.air_time = val;
		this.elem.querySelector(".air_time").innerText = val;
	}

	init_callbacks() {
		const next_btn   = this.elem.querySelector(".next_btn");
		const prev_btn   = this.elem.querySelector(".prev_btn");
		const edit_btn   = this.elem.querySelector(".edit_btn");
		const move_btn   = this.elem.querySelector(".move_btn");
		const remove_btn = this.elem.querySelector(".remove_btn");

		next_btn  .addEventListener("click", e => { this.episode_number += 1; save_list(); });
		prev_btn  .addEventListener("click", e => { this.episode_number -= 1; save_list(); });
		remove_btn.addEventListener("click", e => {
			if (confirm(`Delete ${this.title}?`)) {
				array_remove(list, list.indexOf(this));
				save_list();
				if (this.elem === document.activeElement) {
					(this.elem.nextSibling ?? this.elem.previousSibling)?.focus();
				}
				this.elem.remove();
			}
		});
		edit_btn.addEventListener("click", e => {
			textarea.value = JSON.stringify(this, undefined, "  ");
			textarea_ok.onclick = () => {
				try {
					let new_anime = JSON.parse(textarea.value);
					for (const field in new_anime) { this[field] = new_anime[field]; }
					save_list();
					textarea_popup.close();
				} catch(err) { alert(err); }
			}
			textarea_popup.showModal();
		});

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

	toJSON() {
		return this.data;
	}
}

const list = await load_list();

textarea_popup.getElementsByClassName("cancel_btn")[0].addEventListener("click", () => textarea_popup.close());

new_anime_btn.addEventListener("click", function () {
	const anime = new Anime({
		link:  prompt("URL\nReplace the episode number with EPISODE_NUMBER"),
		title: prompt("Anime title")
	});

	list.push(anime);
	save_list();

	list_elem.append(anime.elem);
	anime.elem.focus();
});

list_elem.addEventListener("keydown", e => {
	switch (e.code) {

		case "ArrowUp": (document.activeElement.previousSibling ?? list_elem.lastChild)?.focus(); break;
		case "ArrowDown": (document.activeElement.nextSibling ?? list_elem.firstChild)?.focus(); break;

		case "KeyA": new_anime_btn.click(); break;

		case "Enter":      document.activeElement.querySelector(".title").click();      break;
		case "ArrowLeft":  document.activeElement.querySelector(".prev_btn").click();   break;
		case "ArrowRight": document.activeElement.querySelector(".next_btn").click();   break;
		case "KeyM":       document.activeElement.querySelector(".move_btn").click();   break;
		case "KeyE":       document.activeElement.querySelector(".edit_btn").click();   break;
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

async function load_list() {
	let list = JSON.parse(await localStorage.getItem("anilist.list") ?? "[]");
	list = list.map(data => {
		const anime = new Anime(data);
		list_elem.append(anime.elem);
		return anime;
	});

	if (list.length > 0) {
		list[0].elem.focus();
	}

	return list;
}
function save_list() {
	localStorage.setItem("anilist.list", JSON.stringify(list));
}

function array_remove(arr, index) {
	arr.splice(index, 1);
}
function array_insert(arr, index, elem) {
	list.splice(index, 0, elem);
}

// function index_in_parent(child) {
//   return Array.prototype.indexOf.call(child.parentNode.children, child);
// }

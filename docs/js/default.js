"use strict";
// do not make this script a module, it needs to declare some consts in global scope.
{
	// make backdrop clicks close their corresponding dialog.
	let mousedown_x, mousedown_y;
	document.addEventListener("mousedown", e => {
		mousedown_x = e.clientX;
		mousedown_y = e.clientY;
	});
	document.addEventListener("click", e => {
		if (e.target.constructor !== HTMLDialogElement) return;
		const dialog = e.target;

		const rect = dialog.getBoundingClientRect();
		const pressed_in_dialog  = in_rect(mousedown_x, mousedown_y, rect);
		const released_in_dialog = in_rect(e.clientX, e.clientY, rect);
		const clicked_outside_dialog = !pressed_in_dialog && !released_in_dialog;

		if (clicked_outside_dialog) {
		  dialog.close();
		}
	});

	function in_rect(x, y, rect) {
		return x >= rect.left && x <= rect.left + rect.width &&
			y >= rect.top  && y <= rect.top  + rect.height;
	}
}

const qs = document.querySelector.bind(document);
const qsa = document.querySelectorAll.bind(document);
const $ = (a, b) => {
	if (typeof a === 'string') return qs(a);
	else return a.querySelector(b);
}
const $$ = (a, b) => {
	if (typeof a === 'string') return qsa(a);
	else return a.querySelectorAll(b);
}
const on = (event, elem, callback) => {
	elem.addEventListener(event, callback);
}
const on_opts = (event, elem, opts, callback) => {
	elem.addEventListener(event, callback, opts);
}
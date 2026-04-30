export const qs = document.querySelector.bind(document);
export const qsa = document.querySelectorAll.bind(document);
export const $ = (a, b) => {
	if (typeof a === 'string') return qs(a);
	else return a.querySelector(b);
}
export const $$ = (a, b) => {
	if (typeof a === 'string') return qsa(a);
	else return a.querySelectorAll(b);
}
export const on = (event, elem, callback) => {
	elem.addEventListener(event, callback);
}
export const on_opts = (event, elem, opts, callback) => {
	elem.addEventListener(event, callback, opts);
}
export function in_rect(x, y, rect) {
	return x >= rect.left && x <= rect.left + rect.width &&
		y >= rect.top  && y <= rect.top  + rect.height;
}
export function reapply_class(el, cl) {
	// See: https://css-tricks.com/restart-css-animation/
	el.classList.remove(cl);
	void el.offsetWidth;
	el.classList.add(cl);
}
export async function set_clipboard(text) {
	// Retarded API.
	// https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
	const type = "text/plain";
	const blob = new Blob([text], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	await navigator.clipboard.write(data);
}
export async function get_clipboard() {
	return await navigator.clipboard.readText();
}

{
	let mousedown_x, mousedown_y;
	on("mousedown", document, e => {
		mousedown_x = e.clientX;
		mousedown_y = e.clientY;
	});
	on("click", document, e => {
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
}
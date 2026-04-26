const opts_once = { once: true };

const actions = []; // re-use action objects

const drag_class = "reorder-dragging";
const pickup_event = "reorder-pickup";
const drop_event = "reorder-drop";
// zindex: with animations below, some elems will shortly go in front of the moving one
// pos-rel: otherwise z-index does nothing
new CSSStyleSheet().replace(`
.${drag_class} {
	z-index: 1000;
	position: relative;
}
`).then(s => document.adoptedStyleSheets.push(s))


// Assumes the elements in the container are displayed top-to-bottom.
/**
 * @param {HTMLElement} container - the container of which the children get click-and-drag reordering.
 * @param {?string} move_handle_selector - optional selector for move handles, without this children of container can be click/dragged wherever you click them.
 */
export function make_reorderable(container, move_handle_selector) {
	document.createDocumentFragment().querySelector(move_handle_selector); // Run the selector on something to ensure it is valid.

	container.addEventListener("pointerdown", e => {
		if (e.button !== 0) return; // left-clicks only
		if (e.target === container) return; // must at least be a child of the container

		// Walk up parents of e.target to find the one that is a direct child of container, that one is the element that gets moved.
		// Meanwhile, check that e.target or one of its parents matches the selector of a move handle.
		let el = e.target;
		let clicked_handle = !move_handle_selector || el.matches(move_handle_selector);
		while (el.parentElement !== container) {
			el = el.parentElement;
			if (!clicked_handle && el.matches(move_handle_selector)) clicked_handle = true;
		}

		if (!clicked_handle) return;
		if (el.classList.contains(drag_class)) return; // don't move the same element with two fingers...

		// Now that we know for sure we're moving this element...
		e.preventDefault(); // stops text selection

		const a = actions.pop() ?? new MoveAction();
		a.init(container, el, e.pointerId, e.clientY);
	});
}

class MoveAction {
/** @type { HTMLElement } */ container;
/** @type { HTMLElement } */ elem;
/** @type { Number } */ pointerId;
/** @type { Number } */ current_index;
/** @type { Number } */ hover_pos; // Y of the mouse/pointer, that's where the element should be positioned.
/** @type { Number } */ hover_offset; // offset applied to the element such that it appears to be at hover_pos
/** @type { AbortController } */ abort_controller;

	init(container, elem, pointerId, hover_pos) {
		this.container = container;
		this.elem = elem;
		this.pointerId = pointerId;
		this.hover_offset = 0;
		this.hover_pos = hover_pos;

		this.current_index = Array.prototype.indexOf.call(this.container.children, this.elem);
		if (this.current_index === -1) throw new Error("this.elem should be a direct child of container");

		this.elem.classList.add("reorder-dragging");
		this.elem.style.transition = "";

		this.abort_controller = new AbortController();

		const opts = { signal: this.abort_controller.signal };

		this.container.setPointerCapture(this.pointerId);
		this.container.addEventListener("pointermove", this, opts);
		this.container.addEventListener("pointerup", this, opts);
		this.container.addEventListener("pointercancel", this, opts);
		this.container.addEventListener("contextmenu", this, opts);
		window.addEventListener("scroll", this, opts);

		this.move();

		this.elem.dispatchEvent(new CustomEvent(pickup_event, { detail: this, bubbles: true }));
	}

	handleEvent(e) {
		if (e.pointerId !== undefined && e.pointerId !== this.pointerId) return;

		switch (e.type) {
			case "pointermove":   this.hover_pos = e.clientY; // fallthrough
			case "scroll":        this.move(); break;
			case "pointercancel": this.stop_moving(); break;
			case "pointerup":     this.stop_moving(); break;
			case "contextmenu":   e.preventDefault(); break;
		}
	}

	stop_moving() {
		this.container.releasePointerCapture(this.pointerId);

		this.elem.classList.remove(drag_class);
		this.elem.style.transition = "transform 100ms ease";
		this.elem.style.transform = "";

		this.elem.addEventListener("transitionend", stop_transition, opts_once);

		this.abort_controller.abort();
		actions.push(this);

		this.elem.dispatchEvent(new CustomEvent(drop_event, { detail: this, bubbles: true }));
	}

	move() {
		const mybounds = this.elem.getBoundingClientRect();
		const half = mybounds.height/2;
		let base_pos = mybounds.y - this.hover_offset + half;

		let closest_index = this.current_index;
		let closest_dist =  Math.abs(this.hover_pos - base_pos);
		let closest_base_pos;

		const moving_up = this.hover_pos < base_pos;
		const dir = moving_up ? -1 : 1;
		const count = moving_up ? this.current_index : this.container.children.length - this.current_index - 1;

		const passed_elems = [];
		const old_positions = [];
		for (let i = 0; i < count; i++) {
			const other_index = this.current_index + (1 + i) * dir;
			const other_elem = this.container.children[other_index];
			if (other_elem.style.transition) continue;
			const other_bounds = other_elem.getBoundingClientRect();
			const other_pos = other_bounds.y + (moving_up ? half : other_bounds.height - half);
			const dist = Math.abs(this.hover_pos - other_pos);

			if (dist < closest_dist) {
				closest_dist = dist;
				closest_index = other_index;
				closest_base_pos = other_pos;
				passed_elems.push(other_elem);
				old_positions.push(other_bounds.y);
			} else break;
		}

		if (closest_index !== this.current_index) {
			this.elem.remove();
			insert_element(this.container, closest_index, this.elem);
			this.current_index = closest_index;
			base_pos = closest_base_pos;
		}

		for (let i = 0; i < passed_elems.length; i++) {
			const el = passed_elems[i];
			const offset_to_old_pos = old_positions[i] - el.getBoundingClientRect().y;

			el.style.transform = `translate(0, ${offset_to_old_pos}px)`;
			el.offsetHeight; // reflow
			el.style.transition = "100ms ease"; // if you slow this down it's actually super buggy, but at 100ms it's really not noticable at all
			el.style.transform = "";

			el.addEventListener("transitionend", stop_transition, opts_once);
		}

		let offset = this.hover_pos - base_pos;
		if (this.current_index === 0) {
			offset = Math.max(offset, 0);
		} else if (this.current_index === this.container.children.length-1) {
			offset = Math.min(offset, 0);
		}
		this.elem.style.transform = `translate(5px, ${offset}px)`;
		this.hover_offset = offset;
	}
}

function stop_transition(e) {
	e.target.style.transition = "";
}

function insert_element(parent, index, elem) {
	if (index < 0) {
		parent.prepend(elem);
	} else {
		parent.insertBefore(elem, parent.children[index]);
	}
}
/**
 * A key handler returns `true` if it consumed the event, which skips the handlers subscribed after it.
 */
export type KeyHandler = (e: KeyboardEvent) => boolean | void;

/**
 * Dispatches key events to subscribed handlers in subscription order.
 */
export class KeyDispatcher {
  readonly #handlers: KeyHandler[] = [];

  /**
   * @returns a function to unsubscribe the handler
   */
  subscribe(handler: KeyHandler): () => void {
    this.#handlers.push(handler);
    return () => {
      const i = this.#handlers.indexOf(handler);
      if (i >= 0) {
        this.#handlers.splice(i, 1);
      }
    };
  }

  /**
   * @returns `true` if a handler consumed the event
   */
  dispatch(e: KeyboardEvent): boolean {
    // iterate over a copy, a handler may unsubscribe while dispatching
    for (const handler of this.#handlers.slice()) {
      if (handler(e) === true) {
        return true;
      }
    }
    return false;
  }
}

import { describe, expect, test, vi } from "vite-plus/test";
import { KeyDispatcher } from "./key-dispatcher";

const event = { key: "1" } as KeyboardEvent;

describe("KeyDispatcher", () => {
  test("calls handlers in subscription order", () => {
    const dispatcher = new KeyDispatcher();
    const calls: string[] = [];
    dispatcher.subscribe(() => void calls.push("a"));
    dispatcher.subscribe(() => void calls.push("b"));
    expect(dispatcher.dispatch(event)).toBe(false);
    expect(calls).toEqual(["a", "b"]);
  });

  test("skips later handlers once a handler consumed the event", () => {
    const dispatcher = new KeyDispatcher();
    const later = vi.fn();
    dispatcher.subscribe(() => true);
    dispatcher.subscribe(later);
    expect(dispatcher.dispatch(event)).toBe(true);
    expect(later).not.toHaveBeenCalled();
  });

  test("unsubscribes handlers, also while dispatching", () => {
    const dispatcher = new KeyDispatcher();
    const second = vi.fn();
    const unsubscribe = dispatcher.subscribe(() => unsubscribe());
    dispatcher.subscribe(second);
    dispatcher.dispatch(event);
    dispatcher.dispatch(event);
    expect(second).toHaveBeenCalledTimes(2);
  });
});

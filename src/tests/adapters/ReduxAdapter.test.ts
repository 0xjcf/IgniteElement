import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import createReduxAdapter from "../../adapters/ReduxAdapter";
import counterStore, {
  increment,
  decrement,
  addByAmount,
  State,
  Event,
} from "../../examples/redux/src/js/reduxCounterStore";
import IgniteAdapter from "../../IgniteAdapter";

describe("ReduxAdapter", () => {
  let adapterFactory: () => IgniteAdapter<State, Event>;
  let adapter: IgniteAdapter<State, Event>;

  beforeEach(() => {
    adapterFactory = createReduxAdapter(counterStore);
    adapter = adapterFactory();
  });

  afterEach(() => {
    // Clean up adapter after each test
    adapter.stop();
    vi.clearAllMocks();
  });

  it("should initialize and return the current state", () => {
    expect(adapter).toBeDefined();
    expect(adapter.getState()).toEqual({ counter: { count: 0 } });
  });

  it("should dispatch actions to the store and update state", () => {
    adapter.send({ type: "counter/increment" });
    expect(adapter.getState()).toEqual({ counter: { count: 1 } });

    adapter.send(addByAmount(5));
    expect(adapter.getState()).toEqual({ counter: { count: 6 } });

    adapter.send(decrement());
    expect(adapter.getState()).toEqual({ counter: { count: 5 } });
  });

  it("should handle multiple subscriptions and notify listeners", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    adapter.subscribe(listener1);
    adapter.subscribe(listener2);

    adapter.send({ type: "counter/increment" });

    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  it("should clean up subscriptions when stopped", () => {
    const consoleErrorMock = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const listener = vi.fn();
    adapter.subscribe(listener);
    adapter.stop();
    adapter.send(increment());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("Cannot send events when adapter is stopped")
    );

    consoleErrorMock.mockRestore(); // Restore original console.error
  });

  it("should log a warning when send is called after stop", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    adapter.stop();
    adapter.send(increment());

    expect(warnSpy).toHaveBeenCalledWith(
      "[ReduxAdapter] Cannot send events when adapter is stopped."
    );

    warnSpy.mockRestore();
  });

  it("should return the last known state after stop", () => {
    adapter.send(increment());
    adapter.stop();

    expect(adapter.getState()).toEqual({ counter: { count: 1 } });
  });

  it("should prevent new subscriptions after stop", () => {
    adapter.stop();
    expect(() => adapter.subscribe(vi.fn())).toThrowError(
      "Adapter is stopped and cannot subscribe."
    );
  });

  it("should allow multiple calls to stop without error", () => {
    adapter.stop();
    expect(() => adapter.stop()).not.toThrow();
  });

  it("should allow unsubscribe calls after stop without errors", () => {
    const listener = vi.fn();
    const subscription = adapter.subscribe(listener);

    adapter.stop();
    expect(() => subscription.unsubscribe()).not.toThrow();
  });

  it("should allow unsubscribe calls before and after stop without errors", () => {
    const listener = vi.fn();
    const subscription = adapter.subscribe(listener);

    expect(() => subscription.unsubscribe()).not.toThrow();

    adapter.stop();
    expect(() => subscription.unsubscribe()).not.toThrow();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getLiteModePreference,
  setLiteModePreference,
  isLiteModeActive,
  applyLiteMode,
  LITE_MODE_STORAGE_KEY,
} from "./lite-mode";

describe("Lite Mode detection and preference", () => {
  let storage: Record<string, string> = {};
  let classListSet = new Set<string>();
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    storage = {};
    classListSet.clear();

    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
    };

    const mockDocument = {
      documentElement: {
        classList: {
          add: (cls: string) => classListSet.add(cls),
          remove: (cls: string) => classListSet.delete(cls),
          contains: (cls: string) => classListSet.has(cls),
        },
      },
    };

    // @ts-ignore
    globalThis.window = {} as any;
    // @ts-ignore
    globalThis.document = mockDocument as any;
    // @ts-ignore
    globalThis.localStorage = mockStorage as any;

    Object.defineProperty(globalThis, "navigator", {
      value: { connection: undefined, deviceMemory: undefined },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    // @ts-ignore
    delete globalThis.window;
    // @ts-ignore
    delete globalThis.document;
    // @ts-ignore
    delete globalThis.localStorage;

    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it("defaults to auto preference", () => {
    expect(getLiteModePreference()).toBe("auto");
  });

  it("stores and retrieves on / off preference", () => {
    setLiteModePreference("on");
    expect(getLiteModePreference()).toBe("on");
    expect(isLiteModeActive()).toBe(true);

    setLiteModePreference("off");
    expect(getLiteModePreference()).toBe("off");
    expect(isLiteModeActive()).toBe(false);
  });

  it("adds lite-mode class when set to on and removes it when set to off", () => {
    setLiteModePreference("on");
    expect(applyLiteMode()).toBe(true);
    expect(document.documentElement.classList.contains("lite-mode")).toBe(true);

    setLiteModePreference("off");
    expect(applyLiteMode()).toBe(false);
    expect(document.documentElement.classList.contains("lite-mode")).toBe(false);
  });

  it("detects saveData when preference is auto", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        connection: { saveData: true },
      },
      configurable: true,
      writable: true,
    });

    expect(isLiteModeActive()).toBe(true);
  });
});

import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

const store = new Map<string, string>()

const memoryStorage: Storage = {
  get length() {
    return store.size
  },
  clear() {
    store.clear()
  },
  getItem(key) {
    return store.has(key) ? store.get(key)! : null
  },
  key(index) {
    return [...store.keys()][index] ?? null
  },
  removeItem(key) {
    store.delete(key)
  },
  setItem(key, value) {
    store.set(key, String(value))
  },
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: memoryStorage,
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

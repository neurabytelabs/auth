import { vi, beforeEach } from 'vitest';

// Mock localStorage for browser environment tests
let store: Record<string, string> = {};

const localStorageMock = {
  get store() {
    return store;
  },
  set store(value: Record<string, string>) {
    store = value;
  },
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
Object.defineProperty(globalThis, 'location', {
  value: {
    origin: 'https://test.example.com',
    href: 'https://test.example.com/page',
  },
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  store = {};
});

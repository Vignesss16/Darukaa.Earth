import { getStoredTokens, setStoredTokens, clearStoredTokens } from '../api';

const storageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

global.localStorage = storageMock() as unknown as Storage;

describe('Frontend API Token Storage Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores access and refresh tokens correctly in localStorage', () => {
    setStoredTokens('test_access_jwt', 'test_refresh_jwt');
    const tokens = getStoredTokens();
    expect(tokens.accessToken).toBe('test_access_jwt');
    expect(tokens.refreshToken).toBe('test_refresh_jwt');
  });

  it('clears stored tokens cleanly', () => {
    setStoredTokens('test_access_jwt', 'test_refresh_jwt');
    clearStoredTokens();
    const tokens = getStoredTokens();
    expect(tokens.accessToken).toBeNull();
    expect(tokens.refreshToken).toBeNull();
  });
});

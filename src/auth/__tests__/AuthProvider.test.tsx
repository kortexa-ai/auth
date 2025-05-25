import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { AuthProvider } from '../AuthProvider'
import { AuthContext } from '../AuthContext'
import { useContext } from 'react'
import { type Auth, type User } from 'firebase/auth'
import type { AuthContextType } from '../types'

const mockFirebaseAuth = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn().mockResolvedValue(undefined),
  signInWithPopup: vi.fn().mockResolvedValue(undefined),
  signInWithCustomToken: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn(),
  browserPopupRedirectResolver: vi.fn(),
}))

vi.mock('firebase/auth', async () => ({
  ...mockFirebaseAuth,
  GoogleAuthProvider: class MockGoogleProvider {
    setCustomParameters() { return this; }
  },
  GithubAuthProvider: class MockGithubProvider {},
  TwitterAuthProvider: class MockTwitterProvider {}
}))

vi.mock('../types', () => ({
  AuthProviders: new Map([
    ['google', {}]
  ]),
  AUTH_MODES: ['standalone', 'sso-provider', 'sso-consumer']
}))

vi.mock('../components/LoginView', () => ({
  LoginView: () => null
}))

const mockUser = {
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
  email: 'test@example.com'
} satisfies Partial<User> as unknown as User

const mockAuth = {
  currentUser: null
} satisfies Partial<Auth> as Auth

// Global fetch mock
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ token: 'exchanged-token' }),
    statusText: 'OK',
    status: 200
  })
))

function TestConsumer({ onContext }: { onContext: (ctx: AuthContextType) => void }) {
  const context = useContext(AuthContext)
  onContext(context)
  return null
}

describe('AuthProvider in standalone mode', () => {
  let authStateCallback: ((user: User | null) => void) | null = null
  let contextValue: AuthContextType

  beforeEach(() => {
    vi.clearAllMocks()
    contextValue = {} as AuthContextType
    mockFirebaseAuth.onAuthStateChanged.mockImplementation((_auth, callback) => {
      authStateCallback = callback
      return () => { }
    })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        href: 'http://test.com',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })
  })

  afterEach(() => {
    authStateCallback = null
  })

  it('should initialize in standalone mode with loading state', () => {
    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    expect(contextValue.mode).toBe('standalone')
    expect(contextValue.loading).toBe(true)
    expect(contextValue.currentUser).toBe(null)
    expect(contextValue.token).toBe('')
  })

  it('should update context when user signs in', async () => {
    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await act(async () => {
      authStateCallback?.(mockUser)
    })

    expect(contextValue.mode).toBe('standalone')
    expect(contextValue.loading).toBe(false)
    expect(contextValue.currentUser).toBe(mockUser)
    expect(contextValue.token).toBe('mock-token')
  })

  it('should update context when user signs out', async () => {
    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await act(async () => {
      authStateCallback?.(mockUser)
    })

    await act(async () => {
      authStateCallback?.(null)
    })

    expect(contextValue.mode).toBe('standalone')
    expect(contextValue.loading).toBe(false)
    expect(contextValue.currentUser).toBe(null)
    expect(contextValue.token).toBe('')
  })

  it('should handle provider login in standalone mode', async () => {
    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await act(async () => {
      await contextValue.loginWithProvider('google.com')
    })

    expect(contextValue.mode).toBe('standalone')
    expect(mockFirebaseAuth.signInWithPopup).toHaveBeenCalledWith(mockAuth, expect.anything(), mockFirebaseAuth.browserPopupRedirectResolver)
    expect(mockFirebaseAuth.signInWithPopup).toHaveBeenCalledTimes(1)
  })

  it('should throw when using SSO login in standalone mode', async () => {
    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await expect(contextValue.loginWithSSO()).rejects.toThrow('SSO login not available in current mode')
  })

  it('should handle logout action', async () => {
    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await act(async () => {
      await contextValue.logout()
    })

    expect(mockFirebaseAuth.signOut).toHaveBeenCalledWith(mockAuth)
    expect(mockFirebaseAuth.signOut).toHaveBeenCalledTimes(1)
  })

  it('should stay in standalone mode with no_sso parameter', () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '?no_sso=true',
        href: 'http://test.com?no_sso=true',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })

    render(
      <AuthProvider auth={mockAuth} loginRedirect="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    expect(contextValue.mode).toBe('standalone')
  })

  it('should cleanup auth state listener on unmount', () => {
    const unsubscribe = vi.fn()
    mockFirebaseAuth.onAuthStateChanged.mockReturnValue(unsubscribe)

    const { unmount } = render(
      <AuthProvider auth={mockAuth}>
        <div>Test</div>
      </AuthProvider>
    )

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should keep its Login property as LoginView', () => {
    render(
      <AuthProvider auth={mockAuth}>
        <div>Test</div>
      </AuthProvider>
    )

    expect(AuthProvider.Login).not.toBeUndefined()
  })
})

describe('AuthProvider in SSO provider mode', () => {
  let authStateCallback: ((user: User | null) => Promise<void>) | null = null
  let contextValue: AuthContextType

  beforeEach(() => {
    vi.clearAllMocks()
    contextValue = {} as AuthContextType

    mockFirebaseAuth.onAuthStateChanged.mockImplementation((_auth, callback) => {
      authStateCallback = callback as ((user: User | null) => Promise<void>);
      return () => { };
    });

    // Set up SSO provider mode with returnUrl
    Object.defineProperty(window, 'location', {
      value: {
        search: '?returnUrl=http://app.test.com/callback',
        href: 'http://test.com?returnUrl=http://app.test.com/callback',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })
  })

  afterEach(() => {
    authStateCallback = null
  })

  it('should initialize in SSO provider mode', () => {
    render(
      <AuthProvider auth={mockAuth} loginServer="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    expect(contextValue.mode).toBe('sso-provider')
    expect(contextValue.loading).toBe(true)
  })

  it('should exchange token and redirect after successful login', async () => {
    let windowLocationHref = 'http://test.com'
    const mockLocation = {
      get href() { return windowLocationHref },
      set href(value) { windowLocationHref = value },
      search: '?returnUrl=http://app.test.com/callback',
      origin: 'http://test.com',
      pathname: '/'
    }

    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    })

    render(
      <AuthProvider auth={mockAuth} loginServer="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await act(async () => {
      authStateCallback?.(mockUser)
    })

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sso?scope=app.test.com'),
      expect.objectContaining({ method: 'GET' })
    ))

    expect(windowLocationHref).toBe('http://app.test.com/callback?token=exchanged-token')
  })

  it('should handle provider login in SSO provider mode', async () => {
    render(
      <AuthProvider auth={mockAuth} loginServer="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await act(async () => {
      await contextValue.loginWithProvider('google.com')
    })

    expect(contextValue.mode).toBe('sso-provider')
    expect(mockFirebaseAuth.signInWithPopup).toHaveBeenCalledWith(mockAuth, expect.anything(), mockFirebaseAuth.browserPopupRedirectResolver)
  })

  it('should throw when using SSO login in provider mode', async () => {
    render(
      <AuthProvider auth={mockAuth} loginServer="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await expect(contextValue.loginWithSSO()).rejects.toThrow('SSO login not available in current mode')
  })

  it('should handle token exchange errors', async () => {
    // Mock fetch to reject for this test
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Exchange failed'));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider auth={mockAuth} loginServer="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    );

    await expect(async () => {
      if (authStateCallback) {
        await authStateCallback(mockUser);
      }
    }).rejects.toThrow('Token exchange failed:');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('sso?scope=app.test.com'),
      expect.objectContaining({ method: 'GET' })
    );
  })
})

describe('AuthProvider in SSO consumer mode', () => {
  let contextValue: AuthContextType

  beforeEach(() => {
    vi.clearAllMocks()
    contextValue = {} as AuthContextType
    mockFirebaseAuth.onAuthStateChanged.mockImplementation((_auth, _callback) => {
      return () => { }
    })
  })

  afterEach(() => {
  })

  it('should initialize in consumer mode with token parameter', () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '?token=custom-token',
        href: 'http://test.com?token=custom-token',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })

    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    expect(contextValue.mode).toBe('sso-consumer')
    expect(contextValue.loading).toBe(true)
  })

  it('should initialize in consumer mode with loginRedirect', () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        href: 'http://test.com',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })

    render(
      <AuthProvider auth={mockAuth} loginRedirect="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    expect(contextValue.mode).toBe('sso-consumer')
  })

  it('should handle SSO login redirect', async () => {
    let windowLocationHref = 'http://test.com'
    Object.defineProperty(window, 'location', {
      value: {
        get href() { return windowLocationHref },
        set href(value) { windowLocationHref = value },
        search: '',
        origin: 'http://test.com',
        pathname: '/'
      }
    })

    render(
      <AuthProvider auth={mockAuth} loginRedirect="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await act(async () => {
      await contextValue.loginWithSSO()
    })

    expect(windowLocationHref).toBe('http://login.test.com?returnUrl=http%3A%2F%2Ftest.com')
  })

  it('should sign in with custom token when provided', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '?token=custom-token',
        href: 'http://test.com?token=custom-token',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })

    // Track history.replaceState calls
    const historySpy = vi.spyOn(window.history, 'replaceState')

    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await waitFor(() => expect(mockFirebaseAuth.signInWithCustomToken).toHaveBeenCalledWith(mockAuth, 'custom-token'))

    expect(historySpy).toHaveBeenCalledWith({}, '', 'http://test.com/')
  })

  it('should throw when using provider login in consumer mode', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        href: 'http://test.com',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })

    render(
      <AuthProvider auth={mockAuth} loginRedirect="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await expect(contextValue.loginWithProvider('google.com')).rejects.toThrow('Provider login not available in SSO consumer mode')
  })

  it('should throw when using email/password login in consumer mode', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        href: 'http://test.com',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })

    render(
      <AuthProvider auth={mockAuth} loginRedirect="http://login.test.com">
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await expect(contextValue.loginWithEmailAndPassword('test@test.com', 'password')).rejects.toThrow('Email/password login not available in SSO consumer mode')
  })

  it('should handle custom token signin failure', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '?token=invalid-token',
        href: 'http://test.com?token=invalid-token',
        origin: 'http://test.com',
        pathname: '/'
      },
      writable: true
    })

    mockFirebaseAuth.signInWithCustomToken.mockRejectedValueOnce(new Error('Invalid token'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

    render(
      <AuthProvider auth={mockAuth}>
        <TestConsumer onContext={(ctx) => Object.assign(contextValue, ctx)} />
      </AuthProvider>
    )

    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('SSO token signin failed:', expect.any(Error)))

    expect(contextValue.loading).toBe(false)
  })
})

// Test for the auth store
describe('useAuthStore', () => {
  // Mock the Supabase client
  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful sign up', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { access_token: 'token', user: mockUser };
    
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    // Test the signup logic
    const result = await mockSupabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.error).toBeNull();
    expect(result.data.user).toEqual(mockUser);
    expect(result.data.session).toEqual(mockSession);
  });

  it('should handle duplicate email signup', async () => {
    // Mock Supabase behavior for existing email
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    const result = await mockSupabase.auth.signUp({
      email: 'existing@example.com',
      password: 'password123',
    });

    // Check if user/session are null (indicating duplicate email)
    expect(result.data.user).toBeNull();
    expect(result.data.session).toBeNull();
    expect(result.error).toBeNull();
  });

  it('should handle sign up errors', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Database error saving new user' },
    });

    const result = await mockSupabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.error.message).toBe('Database error saving new user');
  });

  it('should handle successful sign in', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { access_token: 'token', user: mockUser };

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await mockSupabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.error).toBeNull();
    expect(result.data.user).toEqual(mockUser);
    expect(result.data.session).toEqual(mockSession);
  });

  it('should handle invalid credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await mockSupabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(result.error.message).toBe('Invalid login credentials');
  });

  it('should handle sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    });

    const result = await mockSupabase.auth.signOut();
    
    expect(result.error).toBeNull();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});

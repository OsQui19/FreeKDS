export default function LoginPage() {
  return (
    <main className="login-page u-center-screen">
      <div className="login-container text-center">
        <div className="auth-card card shadow-sm p-4">
          <h1 className="mb-4">Employee Login</h1>
          <form method="post" action="/api/login">
            <div className="mb-3">
              <input
                type="text"
                name="username"
                placeholder="Username"
                required
                className="form-control"
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                className="form-control"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100">
              Log In
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">₱</span>
          <h1>CashFlow</h1>
          <p>Cash Transaction Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-banner">{error}</div>}

          <div className="field-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div className="field-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-hint">
          <p>Demo Accounts:</p>
          <div className="demo-accounts">
            <button className="demo-btn" onClick={() => { setEmail("admin@cash.app"); setPassword("Admin123!"); }}>Admin</button>
            <button className="demo-btn" onClick={() => { setEmail("encoder@cash.app"); setPassword("Encoder123!"); }}>Encoder</button>
            <button className="demo-btn" onClick={() => { setEmail("viewer@cash.app"); setPassword("Viewer123!"); }}>Viewer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

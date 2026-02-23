import { useEffect, useState } from "react";
import { login, seedDemoUserIfEmpty } from "../services/mockAuth";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ensures you have a test user to log in with
    seedDemoUserIfEmpty();
  }, []);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Email is required.");
    if (!password.trim()) return setError("Password is required.");

    try {
      const user = login(email, password);
      localStorage.setItem("mock_current_user", JSON.stringify(user));
      alert("Login success (mock)!"); // replace later with dashboard navigation
    } catch (err: any) {
      setError(err.message ?? "Login failed.");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1>Login</h1>

      <p style={{ opacity: 0.8 }}>
        Demo user: <b>test@demo.com</b> / <b>Password123!</b>
      </p>

      {error && (
        <div style={{ background: "#3b1d1d", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input
          style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={{ width: "100%", padding: 10 }} type="submit">
          Log In
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <a href="register.html">Forgot password?</a>
      </div>
    </div>
  );
}

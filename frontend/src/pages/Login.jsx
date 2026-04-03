import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);
      
      if (res.data.role === "normal") {
        navigate("/sales");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      alert("Invalid credentials!");
    }
  };

  const continueAsGuest = () => {
    localStorage.setItem("role", "guest");
    localStorage.setItem("username", "Guest");
    navigate("/dashboard");
  };

  return (
    <div className="page">
      <h1 id="logIn">Welcome Back</h1>
      <form id="loginForm" onSubmit={handleSubmit}>
        <input
          className="inputData"
          type="text"
          placeholder="Enter Username..."
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <div className="passwordWrapper">
          <input
            className="inputData"
            type={showPassword ? "text" : "password"}
            placeholder="Enter Password..."
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            id="togglePassword"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <button type="submit" id="logButton">
          Login
        </button>
        <button type="button" id="guestButton" onClick={continueAsGuest}>
          Continue as Guest
        </button>
      </form>
    </div>
  );
}

export default Login;

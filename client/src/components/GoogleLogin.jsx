// GoogleLoginOnly.jsx
import { LogoutOutlined } from "@ant-design/icons";
import { Button, Spin, theme } from "antd";
import { Header } from "antd/es/layout/layout";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { auth, provider } from "../firebase";

const ALLOWED_EMAIL = "sumanj631@gmail.com"; // only this email can access

export default function GoogleLoginOnly({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email === ALLOWED_EMAIL) {
        setUser(u);
        setLoading(false);
        setMessage(null);
      } else if (u) {
        // Signed in user not allowed → sign out
        signOut(auth);
        setMessage("Access denied for this account");
        setUser(null);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
        setMessage(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      if (email !== ALLOWED_EMAIL) {
        await signOut(auth);
        setMessage("Access denied for this account");
      } else {
        setUser(result.user);
        setLoading(false);
        setMessage(null);
      }
    } catch (err) {
      console.error(err);
      setMessage("Login Failed!");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const { isDarkMode } = useTheme();
  const {
    token: { colorText },
  } = theme.useToken();

  if (loading) {
    return <Spin style={{ position: "absolute", top: "50%", left: "50%" }} />;
  }

  return (
    <div>
      {" "}
      {message && (
        <div style={{ textAlign: "center", color: "red", marginTop: 10 }}>
          {message}
        </div>
      )}
      {!user ? (
        <Button
          type="primary"
          onClick={handleLogin}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          Login with Google
        </Button>
      ) : (
        <div>
          <Header
            className="app-header"
            style={{
              padding: "0 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: isDarkMode
                ? "1px solid #434343"
                : "1px solid #f0f0f0",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: colorText,
                fontSize: "16px",
              }}
            >
              <img
                src="favicon.jpg"
                alt=""
                style={{
                  height: 30,
                  width: 30,
                  borderRadius: 15,
                  marginRight: 5,
                  verticalAlign: "middle",
                }}
              />{" "}
              My Wallet
            </div>
            <div>
              <span
                style={{
                  color: colorText,
                  marginRight: 16,
                  fontSize: 12,
                }}
              >
                {user.email}
              </span>

              <LogoutOutlined
                size="small"
                style={{
                  color: colorText,
                  fontSize: 16,
                  cursor: "pointer",
                }}
                onClick={handleLogout}
              />
            </div>
          </Header>
          {children}
        </div>
      )}
    </div>
  );
}

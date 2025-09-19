// GoogleLoginOnly.jsx
import { Button, Spin, theme } from "antd";
import { Header } from "antd/es/layout/layout";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
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

  const {
    token: { colorBgContainer },
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
            style={{
              padding: "0 24px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: colorBgContainer,
                fontSize: "16px",
              }}
            >
              Expense Tracker
            </div>
            <div>
              <span style={{ color: colorBgContainer, marginRight: 16 }}>
                {user.email}
              </span>
              <Button onClick={handleLogout}>Logout</Button>
            </div>
          </Header>
          {children}
        </div>
      )}
    </div>
  );
}

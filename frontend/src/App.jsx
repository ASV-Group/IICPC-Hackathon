import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase'; // Firebase initialized auth instance
import AuthPage from './components/AuthPage';
import UploadPage from './components/UploadPage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth State Observer setup (Reactive State Management)
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Backend authorization ke liye current user ka JWT token fetch karein
        try {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
        } catch (tokenError) {
          console.error("Error fetching token:", tokenError);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout process error:", error);
    }
  };

  // Jab tak session verify ho raha hai, tab tak clean loading display hoga
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Verifying secure session parameters...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Dynamic Navbar (Sirf tabhi dikhega jab user logged in ho) */}
      {user && (
        <nav className="main-navbar">
          <div className="brand-title">IICPC Benchmark 2026</div>
          <div className="nav-profile">
            <span className="user-email">{user.email}</span>
            <button onClick={handleLogout} className="signout-button">
              Sign Out
            </button>
          </div>
        </nav>
      )}

      {/* Conditional Rendering Flow (SOLID Principle) */}
      <main className="content-area">
        {user ? (
          <UploadPage userToken={token} />
        ) : (
          <AuthPage />
        )}
      </main>
    </div>
  );
}

export default App;
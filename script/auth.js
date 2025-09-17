// This file acts as a security guard for all protected pages.

// This configuration object MUST be the same one you used in login.js
const firebaseConfig = {
    apiKey: "AIzaSyDtuYr4icwQf2HsvByrCZeqbEex28lL6GI", // <--- IMPORTANT: Replace with your actual Firebase API key
    authDomain: "genaihack-240d7.firebaseapp.com",
    projectId: "genaihack-240d7",
    storageBucket: "genaihack-240d7.firebasestorage.app",
    messagingSenderId: "1095624251792",
    appId: "1:1095624251792:web:8b4be21e68c1a8bcc2bb15"
};

// Initialize Firebase if it hasn't been already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// This is the core of the security guard.
// It listens for changes in the user's authentication state.
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("Auth guard: User is logged in.", user.displayName, user.uid);
        // If a function named 'onUserLoggedIn' exists on the page, call it.
        if (typeof onUserLoggedIn === "function") {
            onUserLoggedIn(user);
        }
        // Redirect authenticated users from login/index to home
        if (window.location.pathname === '/login.html' || window.location.pathname === '/' || window.location.pathname === '/index.html') {
             window.location.href = '/home.html';
        }
    } else {
        console.log("Auth guard: No user logged in.");
        // If not logged in and on a protected page, redirect to index.html
        // (index.html will then guide them to login/signup)
        const protectedPaths = ['/home.html', '/profile.html', '/optimizer.html', '/roadmap.html', '/joblisting.html'];
        if (protectedPaths.includes(window.location.pathname) || (window.location.pathname.startsWith('/script') && !window.location.pathname.includes('login.js'))) {
            window.location.href = '/index.html';
        }
        // If already on index.html or login.html, do nothing (let them choose)
    }
});
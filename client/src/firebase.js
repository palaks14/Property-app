import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDJYb0jGPX76yb50X7PZKwuecCpCFQyep4",
  authDomain: "property-app-4dac6.firebaseapp.com",
  projectId: "property-app-4dac6",
  storageBucket: "property-app-4dac6.firebasestorage.app",
  messagingSenderId: "203615111741",
  appId: "1:203615111741:web:d9a15a187ce03f94363854",
  measurementId: "G-ZMPX94XG65"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
githubProvider.addScope("user:email");
githubProvider.setCustomParameters({
  allow_signup: "true"
});

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {});
}

export { app, auth, db, storage, googleProvider, githubProvider };

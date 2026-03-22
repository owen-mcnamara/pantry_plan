<template>
    <div>
        <h1>Register</h1>

         <!-- 
            The form listens for the "submit" event.
            @submit.prevent means:
            - Run the registerUser() function when the form is submitted.
            - The .prevent part stops the browser from reloading the page.
        -->

        <form @submit.prevent="registerUser"> 
            <input id="email" type="email" placeholder="Email" />
            <input id="password" type="password" placeholder="Password" />
            <button type="submit">Register</button>
        </form>
    </div>
</template>

<script setup>
// "auth" is your Firebase Authentication object,
// created and exported in firebaseConfig.js.
// It connects this page to your Firebase project.
import { auth } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth"; // Handles new user creation



// "async" means this function will do something that takes time,
// and using "await" to pause until Firebase finishes.
async function registerUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created successfully!");
  } catch (error) {
    alert("Error: " + error.message);
  }
}
</script>

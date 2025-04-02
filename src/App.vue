<script setup>
import { computed } from 'vue';
import { useAuthStore } from './store/auth';
import { useRoute } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();

// Check for saved authentication on app load
authStore.initAuth();

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);

// Determine if we're on a full-page auth route (login, signup, etc.)
const isAuthPage = computed(() => {
  const authRoutes = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'];
  return authRoutes.includes(route.path);
});
</script>

<template>
  <div class="app-container">
    <!-- Navigation bar - hidden on auth pages -->
    <nav v-if="!isAuthPage" class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="navbar-logo">
          Olivine
        </router-link>
        
        <div class="navbar-links">
          <router-link to="/" class="navbar-link">Home</router-link>
          
          <template v-if="isAuthenticated">
            <router-link to="/dashboard" class="navbar-link">Dashboard</router-link>
            <router-link to="/integrations" class="navbar-link">Integrations</router-link>
            <router-link to="/agents" class="navbar-link">Agents</router-link>
            <router-link to="/conversation" class="navbar-link">Conversation</router-link>
            <div class="dropdown">
              <button class="dropdown-toggle">
                {{ user ? user.email : 'Account' }}
              </button>
              <div class="dropdown-menu">
                <router-link to="/account" class="dropdown-item">Settings</router-link>
                <button @click="authStore.logout" class="dropdown-item">Logout</button>
              </div>
            </div>
          </template>
          
          <template v-else>
            <router-link to="/login" class="navbar-link">Login</router-link>
            <router-link to="/signup" class="navbar-btn">Sign Up</router-link>
          </template>
        </div>
      </div>
    </nav>
    
    <!-- Main content -->
    <main :class="{ 'with-navbar': !isAuthPage }">
      <router-view></router-view>
    </main>
    
    <!-- Footer - hidden on auth pages -->
    <footer v-if="!isAuthPage" class="footer">
      <div class="footer-container">
        <div class="footer-copyright">
          &copy; {{ new Date().getFullYear() }} Olivine. All rights reserved.
        </div>
        <div class="footer-links">
          <a href="#" class="footer-link">Privacy Policy</a>
          <a href="#" class="footer-link">Terms of Service</a>
          <a href="#" class="footer-link">Contact</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #4CAF50;
  --primary-dark: #388E3C;
  --primary-bg: #E8F5E9;
  --text-primary: #212121;
  --text-secondary: #757575;
  --border-color: #E0E0E0;
  --bg-light: #F5F5F5;
  --error-color: #F44336;
  --error-dark: #C62828;
  --error-bg: #FFEBEE;
  --success-color: #4CAF50;
  --success-bg: #E8F5E9;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-primary);
  background-color: white;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}

main.with-navbar {
  padding-top: 70px;
}

.navbar {
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 100;
  height: 70px;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  height: 100%;
}

.navbar-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  text-decoration: none;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.navbar-link {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.navbar-link:hover, .navbar-link.router-link-active {
  color: var(--primary-color);
}

.navbar-btn {
  background-color: var(--primary-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
}

.navbar-btn:hover {
  background-color: var(--primary-dark);
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  background: none;
  border: none;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
}

.dropdown-toggle::after {
  content: '';
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid currentColor;
  margin-left: 0.5rem;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 180px;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  display: none;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-item {
  display: block;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 400;
  text-align: left;
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

.footer {
  background-color: #f8f9fa;
  padding: 2rem 0;
  margin-top: 3rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.footer-copyright {
  color: var(--text-secondary);
}

.footer-links {
  display: flex;
  gap: 1.5rem;
}

.footer-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: var(--primary-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

.error-message {
  background-color: var(--error-bg);
  color: var(--error-color);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.success-message {
  background-color: var(--success-bg);
  color: var(--success-color);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .navbar-links {
    gap: 1rem;
  }
  
  .footer-container {
    flex-direction: column;
    text-align: center;
  }
}
</style>

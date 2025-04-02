<template>
  <div class="home">
    <div class="hero">
      <div class="hero-content">
        <h1>Welcome to Olivine</h1>
        <p class="hero-subtitle">Build, share, and execute AI workflows with ease</p>
        
        <div class="hero-actions">
          <router-link v-if="!isAuthenticated" to="/login" class="btn-primary">
            Get Started
          </router-link>
          <router-link v-else to="/dashboard" class="btn-primary">
            Go to Dashboard
          </router-link>
          
          <a href="#features" class="btn-secondary">
            Learn More
          </a>
        </div>
      </div>
    </div>
    
    <section id="features" class="features">
      <h2>Key Features</h2>
      
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <h3>Langflow Integration</h3>
          <p>Create complex AI workflows using the powerful Langflow framework with an intuitive interface.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>Collaboration</h3>
          <p>Share your workflows with team members and collaborate on AI solutions together.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <h3>Real-time Execution</h3>
          <p>Execute AI workflows in real-time and receive instant results through WebSocket connections.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h3>Cloud Storage</h3>
          <p>Securely store your workflows and data in the cloud for access from anywhere.</p>
        </div>
      </div>
    </section>
    
    <section class="how-it-works">
      <h2>How It Works</h2>
      
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <h3>Create an Account</h3>
          <p>Sign up for an Olivine account to get started with your AI workflows.</p>
        </div>
        
        <div class="step">
          <div class="step-number">2</div>
          <h3>Build Your Flow</h3>
          <p>Design your AI workflow using the intuitive interface backed by Langflow.</p>
        </div>
        
        <div class="step">
          <div class="step-number">3</div>
          <h3>Execute & Share</h3>
          <p>Run your flow to get AI-powered results and share with team members.</p>
        </div>
      </div>
    </section>
    
    <section class="showcase">
      <h2>What You Can Build</h2>
      
      <div class="showcase-grid">
        <div class="showcase-item">
          <div class="showcase-image" style="background-color: #e0f7fa;"></div>
          <h3>Customer Support Bots</h3>
          <p>Create intelligent support bots that understand and respond to customer inquiries.</p>
        </div>
        
        <div class="showcase-item">
          <div class="showcase-image" style="background-color: #e8f5e9;"></div>
          <h3>Document Analysis</h3>
          <p>Extract insights and automate processing of documents with AI-powered analysis.</p>
        </div>
        
        <div class="showcase-item">
          <div class="showcase-image" style="background-color: #fff8e1;"></div>
          <h3>Content Generation</h3>
          <p>Generate high-quality content based on your specific needs and guidelines.</p>
        </div>
      </div>
    </section>
    
    <section class="cta">
      <div class="cta-content">
        <h2>Ready to Build AI Workflows?</h2>
        <p>Join Olivine today and start creating powerful AI solutions.</p>
        <router-link v-if="!isAuthenticated" to="/signup" class="btn-primary">
          Create an Account
        </router-link>
        <router-link v-else to="/dashboard" class="btn-primary">
          Go to Dashboard
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../store/auth';

const authStore = useAuthStore();

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);
</script>

<style scoped>
.home {
  max-width: 100%;
}

.hero {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  padding: 6rem 1rem;
  text-align: center;
  clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin-bottom: 2.5rem;
  opacity: 0.9;
  font-weight: 300;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  display: inline-block;
  padding: 0.9rem 2rem;
  border-radius: 50px;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all 0.3s;
  font-weight: 500;
}

.btn-primary {
  background-color: white;
  color: var(--primary-color);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background-color: #f8f9fa;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-3px);
}

section {
  padding: 6rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

section h2 {
  font-size: 2.5rem;
  margin-bottom: 3rem;
  color: var(--text-primary);
  position: relative;
  display: inline-block;
}

section h2::after {
  content: '';
  position: absolute;
  width: 60px;
  height: 4px;
  background-color: var(--primary-color);
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 2px;
}

.features {
  background-color: var(--bg-light);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2.5rem;
}

.feature-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  padding: 2.5rem;
  transition: all 0.3s;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  background-color: var(--primary-bg);
  color: var(--primary-color);
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  box-shadow: 0 5px 15px rgba(76, 175, 80, 0.2);
}

.feature-card h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.4rem;
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.how-it-works {
  background-color: white;
}

.steps {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3rem;
}

.step {
  flex: 1;
  min-width: 250px;
  max-width: 300px;
  text-align: center;
  position: relative;
}

.step-number {
  width: 50px;
  height: 50px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 auto 1.5rem;
  position: relative;
  z-index: 1;
}

.step h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.4rem;
}

.step p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.showcase {
  background-color: var(--bg-light);
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2.5rem;
}

.showcase-item {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.showcase-item:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.showcase-image {
  height: 180px;
  background-size: cover;
  background-position: center;
}

.showcase-item h3 {
  padding: 1.5rem 1.5rem 0.5rem;
  color: var(--text-primary);
  font-size: 1.4rem;
}

.showcase-item p {
  padding: 0 1.5rem 1.5rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.cta {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  text-align: center;
  padding: 5rem 1rem;
  margin-top: 3rem;
  clip-path: polygon(0 15%, 100% 0, 100% 100%, 0 100%);
}

.cta-content {
  max-width: 800px;
  margin: 0 auto;
}

.cta h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: white;
}

.cta h2::after {
  background-color: white;
}

.cta p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta .btn-primary {
  background-color: white;
  color: var(--primary-color);
  padding: 1rem 2.5rem;
  font-size: 1.2rem;
}

.cta .btn-primary:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.2rem;
  }
  
  section h2 {
    font-size: 2rem;
  }
  
  .cta h2 {
    font-size: 2rem;
  }
}
</style> 
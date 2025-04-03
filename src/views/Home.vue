<template>
  <div class="home-page" :class="{ 'slide-in': isActive }">
    <!-- Floating Navigation Button -->
    <div class="floating-nav">
      <router-link to="/circuit" class="nav-circle">
        <span class="nav-arrow">→</span>
      </router-link>
    </div>

    <div class="hero">
      <div class="hero-content">
        <div class="hero-circle"></div>
        <h1>OLIVINE <span class="accent">STATION</span></h1>
        <p class="hero-subtitle">Connecting creative tools. Automating tedium. Amplifying talent.</p>
        
        <div class="hero-actions">
          <router-link v-if="!isAuthenticated" to="/login" class="btn-primary">
            ENTER
          </router-link>
          <router-link v-else to="/dashboard" class="btn-primary">
            DASHBOARD
          </router-link>
        </div>
      </div>
    </div>
    
    <section class="manifesto">
      <div class="container">
        <div class="text-block">
          <p>For film producers, creatives, and agents who value their craft over admin work. Olivine Station connects your existing tools through an invisible network of AI, enabling you to focus on creating, not coordinating.</p>
        </div>
      </div>
    </section>

    <section class="tool-grid">
      <div class="container">
        <div class="section-label">INTEGRATIONS</div>
        <div class="tool-items">
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">GOOGLE WORKSPACE</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">DROPBOX</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">MONDAY.COM</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">SLACK</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">XERO</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">QUICKBOOKS</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">OUTLOOK</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">FRAME.IO</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">AIRTABLE</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">ASANA</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">MERCURY</div>
          </div>
          <div class="tool-item">
            <div class="tool-icon">
              <div class="circle-icon"></div>
            </div>
            <div class="tool-name">DOCUSIGN</div>
          </div>
        </div>
      </div>
    </section>

    <section class="column-section">
      <div class="container">
        <div class="column-grid">
          <div class="column">
            <div class="column-content">
              <div class="section-label">APPROACH</div>
              <h2>INVISIBLE<br>INTELLIGENCE</h2>
              <p>Olivine doesn't add another platform to learn. It quietly connects the tools you already use, allowing them to communicate and automate through an invisible layer of AI.</p>
            </div>
          </div>
          <div class="column">
            <div class="column-content">
              <div class="section-label">OBJECTIVE</div>
              <h2>ELIMINATE<br>TEDIUM</h2>
              <p>Creative time is valuable. Olivine removes hours of administrative work by automating the processes that typically consume a producer's day.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="systems-grid">
      <div class="container">
        <div class="section-label">INTELLIGENT SYSTEMS</div>
        <div class="systems-items">
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>SCHEDULING</h3>
            <p>Automatically coordinate calendars, check availability, generate call sheets, and send reminders across your preferred tools.</p>
          </div>
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>FINANCIAL</h3>
            <p>Connect invoicing, expense tracking, budgeting, and payment systems into a single automated financial workflow.</p>
          </div>
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>DOCUMENTS</h3>
            <p>Process contracts, briefs, and forms to extract key information and transform unstructured content into actionable data.</p>
          </div>
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>TALENT</h3>
            <p>Source, evaluate, and book talent while maintaining a rich database of contacts and past collaborations.</p>
          </div>
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>PROCUREMENT</h3>
            <p>Streamline vendor selection, location booking, and equipment rental through automated research and validation.</p>
          </div>
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>COMMUNICATION</h3>
            <p>Coordinate email, messaging, and notifications across platforms to ensure everyone stays informed.</p>
          </div>
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>PRODUCTION</h3>
            <p>Track shooting schedules, manage dailies, and coordinate post-production workflows seamlessly.</p>
          </div>
          <div class="system-item">
            <div class="system-circle"></div>
            <h3>COMPLIANCE</h3>
            <p>Ensure permits, insurance, and legal requirements are organized, tracked, and completed on time.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="use-cases">
      <div class="container">
        <div class="section-label">USE CASES</div>
        <div class="case-grid">
          <div class="case">
            <div class="case-number">01</div>
            <h3>CALL SHEETS</h3>
            <p>Generate detailed call sheets in minutes by connecting scheduling, contact, and location data across your tools, eliminating hours of manual coordination.</p>
          </div>
          <div class="case">
            <div class="case-number">02</div>
            <h3>TALENT SOURCING</h3>
            <p>Automate shortlisting, availability checks, and communication management to find and secure the right talent without the endless email threads.</p>
          </div>
          <div class="case">
            <div class="case-number">03</div>
            <h3>INVOICE PROCESSING</h3>
            <p>Transform your financial workflow by automatically handling invoices, expense tracking, and payment reconciliation across systems.</p>
          </div>
          <div class="case">
            <div class="case-number">04</div>
            <h3>CONTRACTS</h3>
            <p>Automate contract creation, revision tracking, approval workflows, and signature collection while maintaining secure access controls.</p>
          </div>
          <div class="case">
            <div class="case-number">05</div>
            <h3>LOCATION SCOUTING</h3>
            <p>Organize location data, permits, contacts, and availability information into a streamlined workflow for faster decisions.</p>
          </div>
          <div class="case">
            <div class="case-number">06</div>
            <h3>BUDGET TRACKING</h3>
            <p>Connect real-time expense data with budget forecasts to maintain complete visibility and control over production finances.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="metrics">
      <div class="container">
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-value">83%</div>
            <div class="metric-label">ADMIN TIME SAVED</div>
          </div>
          <div class="metric">
            <div class="metric-value">60%</div>
            <div class="metric-label">COORDINATION REDUCTION</div>
          </div>
          <div class="metric">
            <div class="metric-value">3x</div>
            <div class="metric-label">FASTER PRODUCTION CYCLES</div>
          </div>
        </div>
      </div>
    </section>

    <div class="cta-section">
      <div class="container">
        <h2>RECLAIM YOUR CREATIVE TIME</h2>
        <div class="cta-actions">
          <router-link v-if="!isAuthenticated" to="/signup" class="btn-primary">
            REQUEST ACCESS
          </router-link>
          <router-link v-else to="/dashboard" class="btn-primary">
            ENTER STATION
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useAuthStore } from '../store/auth';

const authStore = useAuthStore();

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Animation states
const isActive = ref(false);
const hoverNav = ref(false);

onMounted(() => {
  // Trigger slide-in animation after the component is mounted
  setTimeout(() => {
    isActive.value = true;
  }, 50);
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
</style>

<style scoped>
:root {
  --bg-dark: #000000;
  --text-light: #ffffff;
  --text-dim: rgba(255, 255, 255, 0.7);
  --accent-color: #3D85F4; /* Blue accent */
  --grid-gap: 2rem;
  --section-spacing: 10rem;
  --border-light: rgba(255, 255, 255, 0.1);
}

/* Global Styles */
.home-page {
  background-color: var(--bg-dark);
  color: var(--text-light);
  font-family: 'Space Grotesk', sans-serif;
  overflow-x: hidden;
  position: relative;
  transform: translateX(-100%);
  transition: transform 0.8s cubic-bezier(0.19, 1, 0.22, 1);
}

.slide-in {
  transform: translateX(0);
}

.container {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 2rem;
}

section {
  margin-bottom: 120px;
  padding: 60px 0;
}

h1, h2, h3, h4, p {
  margin: 0;
}

.section-label {
  font-size: 0.875rem;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  margin-bottom: 3rem;
}

/* Hero Section */
.hero {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.hero-content {
  text-align: center;
  position: relative;
  z-index: 2;
}

.hero-circle {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(61, 133, 244, 0.2) 0%, rgba(61, 133, 244, 0) 70%);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.hero h1 {
  font-size: 5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
}

.accent {
  color: var(--accent-color);
}

.hero-subtitle {
  font-size: 1.5rem;
  font-weight: 300;
  max-width: 600px;
  margin: 0 auto 3rem;
  line-height: 1.4;
}

.hero-actions {
  margin-top: 2rem;
}

.btn-primary {
  display: inline-block;
  background-color: transparent;
  color: var(--text-light);
  border: 1px solid var(--text-light);
  padding: 0.8rem 2.5rem;
  font-size: 1rem;
  text-decoration: none;
  letter-spacing: 0.1em;
  transition: all 0.3s;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 500;
}

.btn-primary:hover {
  background-color: var(--text-light);
  color: var(--bg-dark);
}

/* Manifesto Section */
.manifesto {
  padding: 5rem 0;
  margin-bottom: 140px;
}

.text-block {
  max-width: 800px;
  margin: 0 auto;
}

.text-block p {
  font-size: 2rem;
  line-height: 1.4;
  font-weight: 300;
}

/* Tool Grid */
.tool-grid {
  margin: 8rem 0;
  margin-bottom: 160px;
}

.tool-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 2rem;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tool-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tool-name {
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-align: center;
}

/* Column Section */
.column-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4rem;
}

.column-content {
  max-width: 400px;
}

.column-content h2 {
  font-size: 3rem;
  line-height: 1.1;
  margin-bottom: 2rem;
  font-weight: 700;
}

.column-content p {
  font-size: 1.2rem;
  line-height: 1.5;
  color: var(--text-dim);
}

/* Systems Grid */
.systems-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 4rem 2rem;
}

.system-item {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.system-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin-bottom: 2rem;
  background: radial-gradient(circle, rgba(61, 133, 244, 0.15) 0%, rgba(61, 133, 244, 0) 70%);
  border: 1px solid rgba(61, 133, 244, 0.2);
}

.system-item h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.system-item p {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-dim);
  max-width: 300px;
  margin: 0 auto;
}

/* Use Cases */
.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 4rem 2rem;
}

.case {
  position: relative;
  padding-top: 2rem;
}

.case-number {
  font-size: 3rem;
  font-weight: 700;
  color: rgba(61, 133, 244, 0.2);
  position: absolute;
  top: -2.5rem;
  left: 0;
}

.case h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.case p {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-dim);
}

/* Metrics */
.metrics {
  margin: 15rem 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.metric {
  text-align: center;
}

.metric-value {
  font-size: 6rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #fff, var(--accent-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.metric-label {
  font-size: 1rem;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}

/* CTA Section */
.cta-section {
  padding: 10rem 0;
  text-align: center;
  background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), 
              radial-gradient(circle at 50% 50%, rgba(61, 133, 244, 0.2) 0%, rgba(0,0,0,0) 70%);
  margin-bottom: 160px;
}

.cta-section h2 {
  font-size: 3.5rem;
  margin-bottom: 3rem;
  font-weight: 700;
}

.cta-actions {
  margin-top: 3rem;
}

/* Responsive Adjustments */
@media (max-width: 1200px) {
  .hero h1 {
    font-size: 4rem;
  }
  
  .text-block p {
    font-size: 1.8rem;
  }
  
  .column-content h2 {
    font-size: 2.5rem;
  }
  
  .metric-value {
    font-size: 5rem;
  }
  
  .cta-section h2 {
    font-size: 3rem;
  }
}

@media (max-width: 992px) {
  :root {
    --section-spacing: 8rem;
  }
  
  .hero h1 {
    font-size: 3.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.3rem;
  }
  
  .column-grid {
    grid-template-columns: 1fr;
    gap: 5rem;
  }
  
  .column-content {
    max-width: 100%;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 3rem;
  }
  
  .text-block p {
    font-size: 1.5rem;
  }
  
  .case-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 5rem;
  }
  
  .cta-section h2 {
    font-size: 2.5rem;
  }
}

@media (max-width: 576px) {
  :root {
    --section-spacing: 6rem;
  }
  
  .hero h1 {
    font-size: 2.5rem;
  }
  
  .tool-items {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .systems-items {
    grid-template-columns: 1fr;
  }
  
  .floating-nav {
    right: 2rem;
    bottom: 2rem;
    transform: none;
  }
}

/* Floating Navigation */
.floating-nav {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  z-index: 1000;
}

.nav-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: white;
  color: black;
  text-decoration: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}

.nav-circle:hover {
  transform: scale(1.1);
}

.nav-arrow {
  font-size: 2rem;
  font-weight: bold;
}
</style> 
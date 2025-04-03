<template>
  <div class="circuit-page" :class="{ 'slide-in': isActive }">
    <!-- Network Background -->
    <div class="network-background">
      <div class="connection connection-1"></div>
      <div class="connection connection-2"></div>
      <div class="connection connection-3"></div>
      <div class="connection connection-4"></div>
    </div>

    <div class="hero">
      <!-- Floating Navigation Button -->
      <div class="floating-nav">
        <router-link to="/" class="nav-circle" v-if="showNavArrow">
          <span class="nav-arrow">←</span>
        </router-link>
      </div>
      
      <div class="hero-content">
        <div class="hero-circle"></div>
        <h1>OLIVINE <span class="accent">CIRCUIT</span></h1>
        <p class="hero-subtitle">
          A network of direct connections.
          <br><br>
          Linking studios with brands through intelligent nodes, eliminating layers of intermediaries and unlocking creative potential.
        </p>
        
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
          <p>A network where quality creates connection. Studios, brands, and sales representatives form direct relationships in a trusted ecosystem that evolves with every interaction.</p>
        </div>
      </div>
    </section>

    <section class="column-section">
      <div class="container">
        <div class="column-grid">
          <div class="column">
            <div class="column-content">
              <div class="section-label">BALANCE</div>
              <h2>AUTOMATION<br>WITH HUMANITY</h2>
              <p>Circuit accelerates the tedious parts of finding opportunities and qualifying leads but preserves the crucial human relationships that drive our industry. Sales representatives remain essential facilitators, but now focus on meaningful connections instead of administrative overhead.</p>
            </div>
          </div>
          <div class="column">
            <div class="column-content">
              <div class="section-label">BENEFIT</div>
              <h2>MORE TIME<br>FOR RELATIONSHIP</h2>
              <p>We don't replace the human touch—we give it more room to thrive. By automating the process of digging through briefs, validating proposals, and identifying qualified connections, we free up time for the work that matters: building genuine partnerships.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="network-diagram">
      <div class="container">
        <div class="section-label">DYNAMIC NETWORK</div>
        <div class="diagram" ref="diagramEl">
          <!-- Controls container -->
          <div class="controls-container">
            <div class="node-counters">
              <div class="counter-item producer-counter">
                <div class="counter-icon"></div>
                <div class="counter-text">
                  <div class="counter-label">STUDIOS</div>
                  <div class="counter-value">{{ nodeCounts.producers }}</div>
                </div>
              </div>
              <div class="counter-item consumer-counter">
                <div class="counter-icon"></div>
                <div class="counter-text">
                  <div class="counter-label">BRANDS</div>
                  <div class="counter-value">{{ nodeCounts.consumers }}</div>
                </div>
              </div>
              <div class="counter-item green-counter">
                <div class="counter-icon"></div>
                <div class="counter-text">
                  <div class="counter-label">IN PRODUCTION</div>
                  <div class="counter-value">{{ nodeCounts.greenNodes }}</div>
                </div>
              </div>
            </div>

            <!-- Speed control -->
            <div class="speed-control">
              <div class="speed-label-container">
                <span class="speed-label-left">Slower</span>
                <span class="speed-label-right">Actual Speed</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="30" 
                step="1" 
                v-model="speedMultiplier"
                class="speed-slider"
              >
            </div>
          </div>
          
          <!-- Simulation description moved to bottom left -->
          <div class="simulation-description">
            <div class="section-label">NETWORK VISUALIZATION</div>
            <p>A dynamic representation of our intelligent matching system. This simulation assumes a 2% qualification rate, where studios (red) and brands (orange) form direct partnerships (green) through validated connections.</p>
          </div>
          
          <!-- Static Fenced Area Nodes -->
          <div 
            v-for="space in staticSpaces" 
            :key="space.id" 
            class="static-space-node" 
            :class="space.id"
            :style="space.style">
            <div class="space-pulse-circle">
               {{ space.label }}
            </div>
          </div>

          <!-- Dynamic Orbital Nodes -->
          <div class="orbital-nodes-container">
            <div 
              v-for="node in nodes" 
              :key="node.id" 
              class="orbital-node" 
              :class="[node.type, node.state]" 
              :style="node.style"
              :isAccepting="node.isAccepting"
              :isRejecting="node.isRejecting"
              :isGreen="node.isGreen">
              <div class="node-circle">
                {{ node.label }}
                <div v-if="node.state === 'orbitingCollector'" class="orbit-indicator"></div>
              </div>
            </div>
          </div>
          
          <!-- Studio stream button (top left) -->
          <div class="stream-control producer-control">
            <div 
              class="stream-button producer-stream"
              @mousedown="startStreaming('producer')"
              @mouseup="stopStreaming('producer')"
              @mouseleave="stopStreaming('producer')"
              @touchstart.prevent="startStreaming('producer')"
              @touchend.prevent="stopStreaming('producer')">
              + STUDIOS
            </div>
          </div>
          
          <!-- Brand stream button (top right) -->
          <div class="stream-control consumer-control">
            <div 
              class="stream-button consumer-stream"
              @mousedown="startStreaming('consumer')"
              @mouseup="stopStreaming('consumer')"
              @mouseleave="stopStreaming('consumer')"
              @touchstart.prevent="startStreaming('consumer')"
              @touchend.prevent="stopStreaming('consumer')">
              + BRANDS
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="column-section">
      <div class="container">
        <div class="column-grid">
          <div class="column">
            <div class="column-content">
              <div class="section-label">PREMISE</div>
              <h2>DIRECT<br>RELATIONSHIPS</h2>
              <p>When creative studios and brands connect directly, both sides benefit from reduced costs, increased transparency, and stronger partnerships that lead to better creative outcomes.</p>
            </div>
          </div>
          <div class="column">
            <div class="column-content">
              <div class="section-label">METHODOLOGY</div>
              <h2>INTELLIGENT<br>MATCHING</h2>
              <p>Our network uses reputation-based algorithms to create perfect matches between studios and brands, learning from each interaction to continuously improve future connections.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="systems-grid">
      <div class="container">
        <div class="section-label">NETWORK AGENTS & SYSTEMS</div>
        <div class="systems-items">
          <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>PRODUCERS (Studios)</h3>
            <p>Creative teams providing content, building reputation through successful brand partnerships and quality deliverables.</p>
          </div>
          <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>CONSUMERS (Brands)</h3>
            <p>Brands seeking authentic creative partnerships, gaining direct access to vetted production talent without markup fees.</p>
          </div>
          <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>COLLECTORS</h3>
            <p>Automated agents gathering and categorizing production leads, creating curated pools of opportunities.</p>
          </div>
          <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>QUALIFIERS</h3>
            <p>Expert agents verifying project proposals and participant credentials, ensuring quality standards are met.</p>
          </div>

           <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>DISPERSION AGENT</h3>
            <p>Prevents echo chambers and promotes diverse connections by ensuring healthy distribution across the network.</p>
          </div>
          <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>MAINTENANCE AGENT</h3>
            <p>Cleans and optimizes network data, removing inactive entities and refreshing connections for system health.</p>
          </div>
          <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>RULES ENFORCEMENT</h3>
            <p>Monitors adherence to network policies and interaction rules within designated spaces.</p>
          </div>
          <div class="system-item">
            <div class="system-circle">
              <div class="inner-pulse"></div>
            </div>
            <h3>INTERACTION SPACES</h3>
            <p>Defines the environments (Private, Premium, Public) where agents connect and collaborate under specific rules.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="connection-flow">
      <div class="container">
        <div class="section-label">CONNECTION FLOW</div>
        <div class="flow-diagram">
          <div class="flow-node">
            <div class="flow-circle">01</div>
            <h3>INTAKE</h3>
            <p>Brands and studios enter the network with validated profiles and clear capabilities</p>
          </div>
          <div class="flow-arrow"></div>
          <div class="flow-node">
            <div class="flow-circle">02</div>
            <h3>MATCHING</h3>
            <p>Intelligent systems pair ideal collaborators based on style, needs and capabilities</p>
          </div>
          <div class="flow-arrow"></div>
          <div class="flow-node">
            <div class="flow-circle">03</div>
            <h3>CONNECTION</h3>
            <p>Direct relationships form with transparent communication channels</p>
          </div>
          <div class="flow-arrow"></div>
          <div class="flow-node">
            <div class="flow-circle">04</div>
            <h3>CREATION</h3>
            <p>Collaborative work begins with reduced friction and clear expectations</p>
          </div>
          <div class="flow-arrow"></div>
          <div class="flow-node">
            <div class="flow-circle">05</div>
            <h3>LEARNING</h3>
            <p>The network evolves with each interaction, improving future connections</p>
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
            <h3>BRAND DIRECT</h3>
            <p>Consumer goods companies connect directly with specialized production studios that understand their aesthetic and values, avoiding agency markups.</p>
          </div>
          <div class="case">
            <div class="case-number">02</div>
            <h3>REPRESENTATIVE COLLECTIONS</h3>
            <p>Sales reps curate networks of pre-vetted studios and brands, offering clients exclusive access to their professional connections.</p>
          </div>
          <div class="case">
            <div class="case-number">03</div>
            <h3>STUDIO GROWTH</h3>
            <p>Production companies build reputation scores through successful projects, increasing visibility to brands seeking their specific expertise.</p>
          </div>
          <div class="case">
            <div class="case-number">04</div>
            <h3>MATCHMAKING</h3>
            <p>AI-powered tools analyze past collaborations to suggest ideal studio-brand pairings based on style, budget, and communication preferences.</p>
          </div>
          <div class="case">
            <div class="case-number">05</div>
            <h3>VALIDATION POOLS</h3>
            <p>Premium qualifier agents offer specialized vetting services for high-profile projects requiring additional security or quality assurance.</p>
          </div>
          <div class="case">
            <div class="case-number">06</div>
            <h3>NEGOTIATION INTELLIGENCE</h3>
            <p>Each entity's experience builds a proprietary knowledge graph that informs future negotiations and partnership decisions.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="metrics">
      <div class="container">
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-value">42%</div>
            <div class="metric-label">COST REDUCTION</div>
          </div>
          <div class="metric">
            <div class="metric-value">3.8x</div>
            <div class="metric-label">FASTER MATCHING</div>
          </div>
          <div class="metric">
            <div class="metric-value">95%</div>
            <div class="metric-label">PARTNERSHIP SATISFACTION</div>
          </div>
        </div>
      </div>
    </section>

    <div class="cta-section">
      <div class="container">
        <h2>JOIN THE DIRECT REVOLUTION</h2>
        <div class="cta-actions">
          <router-link v-if="!isAuthenticated" to="/signup" class="btn-primary">
            REQUEST ACCESS
          </router-link>
          <router-link v-else to="/dashboard" class="btn-primary">
            ENTER CIRCUIT
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, reactive, nextTick } from 'vue';
import { useAuthStore } from '../store/auth';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Window size tracking
const windowWidth = ref(window.innerWidth);
const showNavArrow = computed(() => windowWidth.value > 900);

// Handle window resize
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

// --- Configuration ---
const NODE_COUNT = {
  PRODUCER: 15,
  CONSUMER: 15,
  QUALIFIER: 1,
  COLLECTOR: 0
};
const ATTRACTION_RANGE_V = 280;
const ATTRACTION_RANGE_C = 120;
const TOUCH_DISTANCE = 40;
const NODE_SIZE = {
  PC: 24,
  VC: 50
};
const ORBIT_RADIUS_VALIDATOR = 220;
const ORBIT_RADIUS_PC = 100;
const ORBIT_SPEED_PC_BASE = 0.015;
const ORBIT_SPEED_VC_MIN = 0.000575;
const ORBIT_SPEED_VC_MAX = 0.00115;
const ATTRACTION_STRENGTH = 0.02875;
const UPDATE_INTERVAL = 50;
const BASE_SPEED = 0.5;
const CENTER_ANIMATION_DURATION = 5000;
const MAX_MATCHES = 1000;
const GREEN_CONNECTION_CHANCE = 0.02;
const GREEN_DURATION = 60000;

// --- State Refs & Reactive Objects ---
const isActive = ref(false);
const nodes = reactive([]);
// Node counters
const nodeCounts = reactive({
  producers: 0,  // Red nodes (Studios)
  consumers: 0,  // Orange nodes (Brands)
  greenNodes: 0  // Green nodes (in production)
});
const staticSpaces = reactive([
  {
    id: 'public',
    label: 'PUBLIC SPACE',
    type: 'space',
    x: 50,
    y: 35,
    style: { top: '35%', left: '50%' }
  },
  {
    id: 'womens-sports',
    label: 'WOMEN\'S SPORTS - EAST COAST', 
    type: 'space',
    x: 30,
    y: 75,
    style: { top: '75%', left: '30%' }
  },
  {
    id: 'fashion',
    label: 'FASHION AND EDITORIAL (UNION)',
    type: 'space',
    x: 70,
    y: 75,
    style: { top: '75%', left: '70%' }
  }
]);
let animationFrameId = null;
const diagramEl = ref(null);
let diagramRect = { width: 0, height: 0 };

// Add variables to track matching animations
const matchingNodes = reactive([]);

// Stream control
const isStreaming = reactive({
  producer: false,
  consumer: false
});

// Speed control - from 1 (100%) to 100 (10000%)
const speedMultiplier = ref(1);

// --- Helper Functions ---
const getDiagramRect = () => {
  if (diagramEl.value) {
    diagramRect = diagramEl.value.getBoundingClientRect();
  }
};

const getRandomCoord = (max) => Math.random() * max;

const getBiasedRandomCoord = (max, biasMin, biasMax) => {
  return Math.random() * (biasMax - biasMin) + biasMin;
};

const calculateDistance = (node1, node2) => {
  const dx = node1.x - node2.x;
  const dy = node1.y - node2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Check if a point is inside a space's boundary
const isInsideSpace = (x, y, space) => {
  const spaceX = space.x / 100 * diagramRect.width;
  const spaceY = space.y / 100 * diagramRect.height;
  const distance = Math.sqrt(Math.pow(x - spaceX, 2) + Math.pow(y - spaceY, 2));
  return distance < 130; // Space boundary radius (a bit larger than the visual circle)
};

// --- Node Creation ---
let idCounter = 0;
const createNode = (type, spaceId = null, options = {}) => {
  let x, y;
  let state = 'roaming';
  let label = '';
  let orbitTargetId = null;
  let orbitAngle = Math.random() * Math.PI * 2;
  let targetValidatorId = null;
  let targetCollectorId = null;
  let spaceOrbitTarget = null;
  let spaceOrbitRadius = 0;
  let spaceOrbitAngle = Math.random() * Math.PI * 2;
  let spaceOrbitSpeed = ORBIT_SPEED_VC_MIN + Math.random() * (ORBIT_SPEED_VC_MAX - ORBIT_SPEED_VC_MIN);
  let size = 0;
  let orbitDirection = options.orbitDirection || 1;
  let matchAnimationStart = 0;
  let rejectedValidators = [];
  let matchCount = 0;
  let isAccepting = false;
  let isRejecting = false;
  let visitedSpaces = []; // Track spaces this node has previously visited
  let isGreen = false; // Special green connection state
  let greenUntil = 0; // Timestamp when green state ends

  // Assign orbit target based on spaceId or randomly
  if (spaceId) {
    spaceOrbitTarget = staticSpaces.find(s => s.id === spaceId);
  } else if (type === 'qualifier') {
    spaceOrbitTarget = options.space || staticSpaces[Math.floor(Math.random() * staticSpaces.length)];
  }

  switch (type) {
    case 'producer':
      // Start at top left in a stream
      x = 100 + Math.random() * 50;
      y = 50 + Math.random() * 20;
      label = 'Studio';
      size = NODE_SIZE.PC;
      orbitDirection = 1;
      break;
    case 'consumer':
      // Start at top right in a stream
      x = diagramRect.width - 150 + Math.random() * 50;
      y = 50 + Math.random() * 20;
      label = 'Brand';
      size = NODE_SIZE.PC;
      orbitDirection = -1;
      break;
    case 'qualifier':
      state = 'orbitingSpace';
      label = 'Qualifier';
      spaceOrbitRadius = ORBIT_RADIUS_VALIDATOR;
      size = NODE_SIZE.VC;
      break;
  }

  if (state === 'orbitingSpace') {
    const targetX = spaceOrbitTarget.x / 100 * diagramRect.width;
    const targetY = spaceOrbitTarget.y / 100 * diagramRect.height;
    x = targetX + Math.cos(spaceOrbitAngle) * spaceOrbitRadius;
    y = targetY + Math.sin(spaceOrbitAngle) * spaceOrbitRadius;
  }

  return reactive({
    id: `${type}-${idCounter++}`,
    type,
    label,
    x, y,
    vx: (Math.random() - 0.5) * BASE_SPEED,
    vy: (Math.random() - 0.5) * BASE_SPEED,
    state,
    targetValidatorId,
    targetCollectorId,
    orbitTargetId,
    orbitAngle,
    spaceOrbitTarget, 
    spaceOrbitRadius,
    spaceOrbitAngle, 
    spaceOrbitSpeed,
    orbitDirection,
    hover: false,
    size,
    isMatching: false,
    matchingPartner: null,
    matchAnimationStart,
    rejectedValidators,
    matchCount,
    isAccepting,
    isRejecting,
    visitedSpaces,
    isGreen,  // Special green connection state
    greenUntil, // Timestamp when green state ends
    style: {
      transform: `translate(${x - size / 2}px, ${y - size / 2}px)`,
      transition: `transform ${UPDATE_INTERVAL / 1000}s linear`,
      width: `${size}px`,
      height: `${size}px`
    }
  });
};

const initializeNodes = () => {
  getDiagramRect();
  if (diagramRect.width === 0) return;
  nodes.length = 0; 
  idCounter = 0;
  
  // Create P/C nodes as before
  for (let i = 0; i < NODE_COUNT.PRODUCER; i++) nodes.push(createNode('producer'));
  for (let i = 0; i < NODE_COUNT.CONSUMER; i++) nodes.push(createNode('consumer'));
  
  // Create one qualifier for each space
  staticSpaces.forEach(space => {
    nodes.push(createNode('qualifier', space.id, { space }));
  });
};

// Stream node creation function
const streamNode = (type) => {
  if (isStreaming[type]) {
    nodes.push(createNode(type));
    setTimeout(() => streamNode(type), 300); // Create a new node every 300ms
  }
};

// --- Animation Loop ---
const updateAnimation = () => {
  if (!diagramRect.width) getDiagramRect();
  const qualifiers = nodes.filter(n => n.type === 'qualifier');
  const producers = nodes.filter(n => n.type === 'producer');
  const consumers = nodes.filter(n => n.type === 'consumer');
  const currentTime = Date.now();
  
  // Update node counts
  nodeCounts.producers = producers.filter(n => !n.isGreen).length;
  nodeCounts.consumers = consumers.filter(n => !n.isGreen).length;
  nodeCounts.greenNodes = nodes.filter(n => n.isGreen).length;
  
  // Get current speed factor
  const speedFactor = speedMultiplier.value;

  // Count nodes by space and type for balancing
  const spaceNodeCounts = {};
  staticSpaces.forEach(space => {
    spaceNodeCounts[space.id] = {
      producer: nodes.filter(n => n.type === 'producer' && 
                            n.state === 'orbitingSpace' && 
                            n.spaceOrbitTarget && 
                            n.spaceOrbitTarget.id === space.id).length,
      consumer: nodes.filter(n => n.type === 'consumer' && 
                            n.state === 'orbitingSpace' && 
                            n.spaceOrbitTarget && 
                            n.spaceOrbitTarget.id === space.id).length
    };
  });

  // Process all nodes, including Q
  nodes.forEach(node => {
    const halfSize = node.size / 2;
    let targetX = 0, targetY = 0;
    let dx = 0, dy = 0;
    let dist = 0;

    // Check if node's green state has expired
    if (node.isGreen && currentTime > node.greenUntil) {
      node.isGreen = false;
      node.greenUntil = 0;
    }

    // Check if node is in match animation
    if (node.isMatching) {
      const elapsedTime = currentTime - node.matchAnimationStart;
      
      // Apply speed factor to animation duration
      if (elapsedTime > CENTER_ANIMATION_DURATION / speedFactor) {
        // Animation ended - return to orbit
        node.isMatching = false;
        node.matchingPartner = null;
        
        // Increment match count
        node.matchCount++;
        
        // Check if reached max matches and should leave space
        if (node.matchCount >= MAX_MATCHES) {
          // Eject from space to find a new qualifier
          node.state = 'roaming';
          node.matchCount = 0; // Reset match count
          
          // Record this space as visited before leaving
          if (node.spaceOrbitTarget && node.spaceOrbitTarget.id) {
            node.visitedSpaces.push(node.spaceOrbitTarget.id);
          }
          
          // Get current space center
          const currentSpaceX = node.spaceOrbitTarget.x / 100 * diagramRect.width;
          const currentSpaceY = node.spaceOrbitTarget.y / 100 * diagramRect.height;
          
          // Store departing space ID before clearing reference
          const departingSpaceId = node.spaceOrbitTarget.id;
          
          // Clear space reference before ejection
          node.spaceOrbitTarget = null;
          
          // Find the best ejection angle - one that's furthest from all spaces
          let bestAngle = 0;
          let maxMinDistance = 0;
          
          // Try 16 different angles around the circle for better precision
          for (let i = 0; i < 16; i++) {
            const testAngle = (Math.PI * 2 * i) / 16;
            const safeDistance = 250; // Even larger safe distance
            const testX = currentSpaceX + Math.cos(testAngle) * safeDistance;
            const testY = currentSpaceY + Math.sin(testAngle) * safeDistance;
            
            // Ensure we're not out of bounds
            if (testX < 30 || testX > diagramRect.width - 30 || 
                testY < 30 || testY > diagramRect.height - 30) {
              continue; // Skip this angle if it would place the node out of bounds
            }
            
            // Check distance to all spaces from this test position
            let minDistanceToAnySpace = Number.MAX_VALUE;
            staticSpaces.forEach(space => {
              const spaceX = space.x / 100 * diagramRect.width;
              const spaceY = space.y / 100 * diagramRect.height;
              const distance = Math.sqrt(
                Math.pow(testX - spaceX, 2) + 
                Math.pow(testY - spaceY, 2)
              );
              
              if (distance < minDistanceToAnySpace) {
                minDistanceToAnySpace = distance;
              }
            });
            
            // If this position is better than our previous best, keep it
            if (minDistanceToAnySpace > maxMinDistance) {
              maxMinDistance = minDistanceToAnySpace;
              bestAngle = testAngle;
            }
          }
          
          // If we couldn't find a good angle, try a random position far from all spaces
          if (maxMinDistance < 150) { // If best position is still too close to a space
            // Try random positions until we find a good one
            let attempts = 0;
            const maxAttempts = 20;
            let foundSafePosition = false;
            
            while (!foundSafePosition && attempts < maxAttempts) {
              const randomX = 50 + Math.random() * (diagramRect.width - 100);
              const randomY = 50 + Math.random() * (diagramRect.height - 100);
              
              // Check if this random position is safe from all spaces
              let tooCloseToAnySpace = false;
              staticSpaces.forEach(space => {
                const spaceX = space.x / 100 * diagramRect.width;
                const spaceY = space.y / 100 * diagramRect.height;
                const distance = Math.sqrt(
                  Math.pow(randomX - spaceX, 2) + 
                  Math.pow(randomY - spaceY, 2)
                );
                
                if (distance < 150) { // If too close to a space
                  tooCloseToAnySpace = true;
                }
              });
              
              if (!tooCloseToAnySpace) {
                // We found a safe position
                node.x = randomX;
                node.y = randomY;
                foundSafePosition = true;
                
                // Set random velocity
                const randomAngle = Math.random() * Math.PI * 2;
                node.vx = Math.cos(randomAngle) * BASE_SPEED;  // Reduced speed
                node.vy = Math.sin(randomAngle) * BASE_SPEED;  // Reduced speed
              }
              
              attempts++;
            }
            
            // If we still couldn't find a safe position, just place at top center
            if (!foundSafePosition) {
              node.x = diagramRect.width / 2;
              node.y = 50;
              node.vx = 0;
              node.vy = BASE_SPEED;  // Reduced speed
            }
          } else {
            // Use the best angle we found
            const ejectionSpeed = BASE_SPEED * 1.5; // Reduced from 3 to 1.5
            node.vx = Math.cos(bestAngle) * ejectionSpeed;
            node.vy = Math.sin(bestAngle) * ejectionSpeed;
            
            // Place node at the best angle at a safe distance
            const safeDistance = 250;
            node.x = currentSpaceX + Math.cos(bestAngle) * safeDistance;
            node.y = currentSpaceY + Math.sin(bestAngle) * safeDistance;
          }
          
          // Clear rejection list to enable finding new qualifiers
          node.rejectedValidators = [];
        } else {
          // Return to orbiting
          node.state = 'orbitingSpace';
          node.spaceOrbitAngle = Math.random() * Math.PI * 2; // New random angle
        }
      } else {
        // Continue center animation - node is already in center
        // Skip other state processing
        return;
      }
    }

    // Process by state
    if (node.state === 'orbitingSpace') {
      // Nodes orbiting spaces (qualifiers and now producers/consumers)
      // Apply speed factor to orbit speed
      node.spaceOrbitAngle += node.spaceOrbitSpeed * node.orbitDirection * speedFactor;
      const targetX = node.spaceOrbitTarget.x / 100 * diagramRect.width;
      const targetY = node.spaceOrbitTarget.y / 100 * diagramRect.height;
      node.x = targetX + Math.cos(node.spaceOrbitAngle) * node.spaceOrbitRadius;
      node.y = targetY + Math.sin(node.spaceOrbitAngle) * node.spaceOrbitRadius;
    } 
    else if (node.state === 'roaming') {
      // Calculate next position - apply speed factor
      const nextX = node.x + node.vx * speedFactor;
      const nextY = node.y + node.vy * speedFactor;
      
      // Check if next position would cross any space boundary the node hasn't been qualified for
      let boundaryViolation = false;
      
      staticSpaces.forEach(space => {
        // Skip if node is already qualified for this space
        const isQualifiedForSpace = node.spaceOrbitTarget && node.spaceOrbitTarget.id === space.id;
        
        if (!isQualifiedForSpace && isInsideSpace(nextX, nextY, space)) {
          boundaryViolation = true;
          // Calculate bounce angle away from space center
          const spaceX = space.x / 100 * diagramRect.width;
          const spaceY = space.y / 100 * diagramRect.height;
          const angle = Math.atan2(node.y - spaceY, node.x - spaceX);
          node.vx = Math.cos(angle) * BASE_SPEED;
          node.vy = Math.sin(angle) * BASE_SPEED;
        }
      });
      
      if (!boundaryViolation) {
        // If no boundary violation, proceed with normal movement
        node.x = nextX;
        node.y = nextY;
        
        // Add slight random variation for natural drift - scale with speed
        node.vx += (Math.random() - 0.5) * 0.1 * speedFactor;
        node.vy += (Math.random() - 0.5) * 0.1 * speedFactor;
        // Clamp velocity - scale with speed
        const maxSpeed = BASE_SPEED * speedFactor;
        node.vx = Math.max(-maxSpeed, Math.min(maxSpeed, node.vx));
        node.vy = Math.max(-maxSpeed, Math.min(maxSpeed, node.vy));

        // Boundary collision
        if (node.x < halfSize || node.x > diagramRect.width - halfSize) node.vx *= -1;
        if (node.y < halfSize || node.y > diagramRect.height - halfSize) node.vy *= -1;
      }

      // Skip qualifier attraction if in green state
      if (node.isGreen) return;

      // Check for nearby qualifiers (excluding rejected ones)
      let closestV = null, minDistV = ATTRACTION_RANGE_V;
      qualifiers.forEach(v => {
        // Skip this qualifier if it's in the node's rejection list
        if (node.rejectedValidators.includes(v.id)) return;
        
        dist = calculateDistance(node, v);
        if (dist < minDistV) {
          minDistV = dist;
          closestV = v;
        }
      });
      if (closestV) {
        node.state = 'attractedToValidator';
        node.targetValidatorId = closestV.id;
      }
    } 
    else if (node.state === 'attractedToValidator') {
      // Skip qualifier attraction if in green state
      if (node.isGreen) {
        node.state = 'roaming';
        node.targetValidatorId = null;
        return;
      }

      // Handle attraction to qualifiers
      const targetV = qualifiers.find(v => v.id === node.targetValidatorId);
      if (!targetV) { node.state = 'roaming'; } 
      else {
        dist = calculateDistance(node, targetV);

        if (dist < TOUCH_DISTANCE) {
          // Check if node has previously been in this space and left - if so, reject it
          const spaceId = targetV.spaceOrbitTarget.id;
          if (node.visitedSpaces.includes(spaceId)) {
            // Cannot requalify for a space it has already left
            node.rejectedValidators.push(targetV.id);
            
            // Add reject glow to qualifier
            const qualifierIndex = nodes.findIndex(n => n.id === targetV.id);
            if (qualifierIndex !== -1) {
              nodes[qualifierIndex].isRejecting = true;
              // Reset after a short time
              setTimeout(() => {
                if (qualifierIndex < nodes.length) {
                  nodes[qualifierIndex].isRejecting = false;
                }
              }, 1000);
            }
            
            // Push away slightly
            const angle = Math.atan2(node.y - targetV.y, node.x - targetV.x);
            node.vx = Math.cos(angle) * BASE_SPEED * 2;
            node.vy = Math.sin(angle) * BASE_SPEED * 2;
            node.state = 'roaming';
            node.targetValidatorId = null;
            return;
          }
          
          // Check if we should grant entry based on balance
          const producerCount = spaceNodeCounts[spaceId].producer;
          const consumerCount = spaceNodeCounts[spaceId].consumer;
          const imbalance = Math.abs(producerCount - consumerCount);
          
          let allowEntry = true;
          
          // If imbalance > 1, only allow the lesser represented type
          if (imbalance > 1) {
            if (node.type === 'producer' && producerCount > consumerCount) {
              allowEntry = false; // Too many producers already
            } else if (node.type === 'consumer' && consumerCount > producerCount) {
              allowEntry = false; // Too many consumers already
            }
          }
          
          if (allowEntry) {
            // Grant entry to orbit
            node.state = 'orbitingSpace';
            node.spaceOrbitTarget = targetV.spaceOrbitTarget; // Use same space as qualifier
            node.spaceOrbitRadius = ORBIT_RADIUS_PC; // Use P/C-specific radius
            node.spaceOrbitAngle = Math.random() * Math.PI * 2; // Random starting angle
            node.spaceOrbitSpeed = ORBIT_SPEED_PC_BASE; // Use P/C-specific speed
            node.targetValidatorId = null;
            
            // Update the count for balancing
            if (node.type === 'producer') {
              spaceNodeCounts[spaceId].producer++;
            } else if (node.type === 'consumer') {
              spaceNodeCounts[spaceId].consumer++;
            }
            
            // Add success glow to qualifier
            const qualifierIndex = nodes.findIndex(n => n.id === targetV.id);
            if (qualifierIndex !== -1) {
              nodes[qualifierIndex].isAccepting = true;
              // Reset after a short time
              setTimeout(() => {
                if (qualifierIndex < nodes.length) {
                  nodes[qualifierIndex].isAccepting = false;
                }
              }, 1000);
            }
          } else {
            // Reject entry - add qualifier to rejection list
            node.rejectedValidators.push(targetV.id);
            
            // Add reject glow to qualifier
            const qualifierIndex = nodes.findIndex(n => n.id === targetV.id);
            if (qualifierIndex !== -1) {
              nodes[qualifierIndex].isRejecting = true;
              // Reset after a short time
              setTimeout(() => {
                if (qualifierIndex < nodes.length) {
                  nodes[qualifierIndex].isRejecting = false;
                }
              }, 1000);
            }
            
            // Push away slightly
            const angle = Math.atan2(node.y - targetV.y, node.x - targetV.x);
            node.vx = Math.cos(angle) * BASE_SPEED * 2;
            node.vy = Math.sin(angle) * BASE_SPEED * 2;
            node.state = 'roaming';
            node.targetValidatorId = null;
          }
        } else if (dist < ATTRACTION_RANGE_V) {
          // Move towards qualifier - apply speed factor to attraction
          dx = targetV.x - node.x;
          dy = targetV.y - node.y;
          const angle = Math.atan2(dy, dx);
          node.vx += Math.cos(angle) * ATTRACTION_STRENGTH * speedFactor;
          node.vy += Math.sin(angle) * ATTRACTION_STRENGTH * speedFactor;
          // Dampen velocity
          node.vx *= 0.98;
          node.vy *= 0.98;
          // Apply speed to movement
          node.x += node.vx * speedFactor;
          node.y += node.vy * speedFactor;
        } else {
          // Qualifier moved out of range
          node.state = 'roaming';
          node.targetValidatorId = null;
        }
      }
    } 
    else if (node.state === 'attractedToCollector' || node.state === 'orbitingCollector') {
      node.state = 'roaming';
    }

    node.x = Math.max(halfSize, Math.min(diagramRect.width - halfSize, node.x));
    node.y = Math.max(halfSize, Math.min(diagramRect.height - halfSize, node.y));

    node.style.transform = `translate(${node.x - halfSize}px, ${node.y - halfSize}px)`;
    node.style.width = `${node.size}px`;
    node.style.height = `${node.size}px`;
  });

  const orbitingProducers = nodes.filter(n => n.type === 'producer' && n.state === 'orbitingSpace' && !n.isMatching);
  const orbitingConsumers = nodes.filter(n => n.type === 'consumer' && n.state === 'orbitingSpace' && !n.isMatching);
  
  const spaceIds = staticSpaces.map(s => s.id);
  spaceIds.forEach(spaceId => {
    const spaceProducers = orbitingProducers.filter(p => p.spaceOrbitTarget && p.spaceOrbitTarget.id === spaceId);
    const spaceConsumers = orbitingConsumers.filter(c => c.spaceOrbitTarget && c.spaceOrbitTarget.id === spaceId);
    
    for (const p of spaceProducers) {
      for (const c of spaceConsumers) {
        if (calculateDistance(p, c) < TOUCH_DISTANCE) {
          // Check for 1% chance of green connection
          const isGreenConnection = Math.random() < GREEN_CONNECTION_CHANCE;
          
          p.isMatching = true;
          c.isMatching = true;
          p.matchingPartner = c.id;
          c.matchingPartner = p.id;
          p.matchAnimationStart = currentTime;
          c.matchAnimationStart = currentTime;
          
          const centerX = p.spaceOrbitTarget.x / 100 * diagramRect.width;
          const centerY = p.spaceOrbitTarget.y / 100 * diagramRect.height;
          
          p.x = centerX;
          p.y = centerY;
          c.x = centerX;
          c.y = centerY;
          
          p.style.transform = `translate(${p.x - p.size/2}px, ${p.y - p.size/2}px)`;
          c.style.transform = `translate(${c.x - c.size/2}px, ${c.y - c.size/2}px)`;
          
          if (isGreenConnection) {
            // Instead of waiting for match animation to complete, we'll 
            // schedule the green state and ejection to happen after animation
            setTimeout(() => {
              // Set both nodes to green state for 60 seconds
              p.isGreen = true;
              c.isGreen = true;
              p.greenUntil = Date.now() + GREEN_DURATION;
              c.greenUntil = Date.now() + GREEN_DURATION;
              
              // Eject both nodes from space
              p.isMatching = false;
              c.isMatching = false;
              p.matchingPartner = null;
              c.matchingPartner = null;
              p.state = 'roaming';
              c.state = 'roaming';
              
              // Store space center positions before clearing references
              const spaceX = p.spaceOrbitTarget.x / 100 * diagramRect.width;
              const spaceY = p.spaceOrbitTarget.y / 100 * diagramRect.height;
              
              // Clear space references
              p.spaceOrbitTarget = null;
              c.spaceOrbitTarget = null;
              
              // Generate random angles for the two nodes to go in different directions
              const angleP = Math.random() * Math.PI * 2;
              const angleC = (angleP + Math.PI) % (Math.PI * 2); // Opposite direction
              
              // Set velocities for both nodes
              const ejectionSpeed = BASE_SPEED * 1.5;
              p.vx = Math.cos(angleP) * ejectionSpeed;
              p.vy = Math.sin(angleP) * ejectionSpeed;
              c.vx = Math.cos(angleC) * ejectionSpeed;
              c.vy = Math.sin(angleC) * ejectionSpeed;
              
              // Move nodes outside the space boundary
              const safeDistance = 180;
              p.x = spaceX + Math.cos(angleP) * safeDistance;
              p.y = spaceY + Math.sin(angleP) * safeDistance;
              c.x = spaceX + Math.cos(angleC) * safeDistance;
              c.y = spaceY + Math.sin(angleC) * safeDistance;
              
              // Update style transforms immediately
              p.style.transform = `translate(${p.x - p.size/2}px, ${p.y - p.size/2}px)`;
              c.style.transform = `translate(${c.x - c.size/2}px, ${c.y - c.size/2}px)`;
            }, CENTER_ANIMATION_DURATION / speedFactor);
          }
          
          return;
        }
      }
    }
  });

  animationFrameId = requestAnimationFrame(updateAnimation);
};

// --- Lifecycle Hooks ---
onMounted(() => {
  setTimeout(() => { isActive.value = true; }, 50);
  
  nextTick(() => {
      initializeNodes();
      if (nodes.length > 0) {
          animationFrameId = requestAnimationFrame(updateAnimation);
      } else {
          console.warn("Diagram dimensions not ready on mount, nodes not initialized.");
      }
  });
  window.addEventListener('resize', initializeNodes);
  
  // Add resize event listener for nav arrow visibility
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', initializeNodes);
  
  // Remove resize event listener for nav arrow visibility
  window.removeEventListener('resize', handleResize);
});

// --- Streaming Control Methods ---
const startStreaming = (type) => {
  isStreaming[type] = true;
  streamNode(type);
};

const stopStreaming = (type) => {
  isStreaming[type] = false;
};

</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
</style>

<style scoped>
:root {
  --bg-dark: #000000;
  --text-light: #ffffff;
  --text-dim: rgba(255, 255, 255, 0.7);
  --accent-color: #FF4D5E;
  --grid-gap: 2rem;
  --section-spacing: 10rem;
  --border-light: rgba(255, 255, 255, 0.1);
}

.circuit-page {
  background-color: var(--bg-dark);
  color: var(--text-light);
  font-family: 'Space Grotesk', sans-serif;
  overflow-x: hidden;
  position: relative;
  transform: translateX(100%);
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
  position: relative;
  z-index: 2;
}

section {
  margin-bottom: 120px;
  padding: 60px 0;
  position: relative;
}

h1, h2, h3, h4, p {
  margin: 0;
}

.section-label {
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  color: #888;
  margin-bottom: 10px;
}

.section-description {
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 20px;
  max-width: 700px;
  text-align: center;
  line-height: 1.5;
  margin-left: auto;
  margin-right: auto;
}

.network-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.08;
  pointer-events: none;
}

.connection {
  position: absolute;
  height: 1px;
  background-color: var(--accent-color);
  transform-origin: left center;
}

.connection-1 { top: 15%; left: 10%; width: 70%; transform: rotate(15deg); opacity: 0.2; }
.connection-2 { top: 35%; left: 80%; width: 45%; transform: rotate(-160deg); opacity: 0.15; }
.connection-3 { top: 65%; left: 25%; width: 40%; transform: rotate(-15deg); opacity: 0.2; }
.connection-4 { top: 50%; left: 50%; width: 30%; transform: rotate(45deg); opacity: 0.25; }

.floating-nav {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
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

.hero {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.hero:before {
  content: "";
  position: absolute;
  width: 600px;
  height: 500px;
  background: radial-gradient(circle, rgba(61, 133, 244, 0.3) 0%, rgba(61, 133, 244, 0) 60%);
  z-index: 1;
  left: -35%;
  top: 50%;
  transform: translateY(-50%);
}

.hero-content {
  text-align: center;
  position: relative;
  z-index: 2;
}

.hero-circle {
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 94, 0.2) 0%, rgba(255, 77, 94, 0) 60%);
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
  position: relative;
  z-index: 2;
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
  position: relative;
  z-index: 2;
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

.network-diagram {
  margin-bottom: 140px;
}

.column-section {
  margin-bottom: 140px;
}

.systems-grid {
  margin-bottom: 160px;
}

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
  position: relative;
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

.diagram {
  position: relative;
  height: 90vh;
  min-height: 700px;
  max-height: 1000px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}

/* --- Static Space Nodes --- */
.static-space-node {
  position: absolute;
  z-index: 2;
  text-align: center;
  transform: translate(-50%, -50%);
}

/* Simulation description style at bottom left */
.simulation-description {
  position: absolute;
  bottom: 30px;
  left: 30px;
  max-width: 320px;
  z-index: 5;
  text-align: left;
}

.simulation-description .section-label {
  font-size: 0.875rem;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  margin-bottom: 1rem;
}

.simulation-description p {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0;
}

.space-pulse-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 94, 0.1) 0%, rgba(255, 77, 94, 0) 70%);
  position: relative;
  margin: 0 auto;
  border: 1px solid rgba(255, 77, 94, 0.15);
  animation: pulse-center 5s infinite alternate;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 15px;
  line-height: 1.2;
}

.static-space-node.public .space-pulse-circle {
  width: 220px;
  height: 220px;
  font-size: 0.9rem;
  background: radial-gradient(circle, rgba(255, 77, 94, 0.2) 0%, rgba(255, 77, 94, 0) 70%);
  border: 1px solid rgba(255, 77, 94, 0.2);
}

.static-space-node.womens-sports .space-pulse-circle {
  background: radial-gradient(circle, rgba(100, 200, 255, 0.1) 0%, rgba(100, 200, 255, 0) 70%);
  border: 1px solid rgba(100, 200, 255, 0.15);
}

.static-space-node.fashion .space-pulse-circle {
  background: radial-gradient(circle, rgba(255, 180, 100, 0.1) 0%, rgba(255, 180, 100, 0) 70%);
  border: 1px solid rgba(255, 180, 100, 0.15);
}

/* --- Dynamic Orbital Nodes --- */
.orbital-nodes-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.orbital-node {
  position: absolute;
  /* width and height set dynamically via style binding */
  will-change: transform;
}

.node-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
  font-size: 0;  /* Hide text label by default */
  font-weight: 500;
  line-height: 1.1;
  text-align: center;
}

/* Type-specific styles - solid colors for Studio/Brand */
.orbital-node.producer .node-circle { 
  background: #FF4D5E; /* Solid red */
  border: none;
  box-shadow: 0 0 10px rgba(255, 77, 94, 0.4);
}

.orbital-node.consumer .node-circle { 
  background: #FF8A4D; /* Solid orange */
  border: none;
  box-shadow: 0 0 10px rgba(255, 138, 77, 0.4);
}

/* Green connection state */
.orbital-node.producer[isGreen="true"] .node-circle,
.orbital-node.consumer[isGreen="true"] .node-circle { 
  background: #4DFF7A; /* Bright green */
  border: none;
  box-shadow: 0 0 15px rgba(77, 255, 122, 0.6);
  animation: pulse-green 2s infinite alternate;
}

@keyframes pulse-green {
  0% { box-shadow: 0 0 8px rgba(77, 255, 122, 0.6); }
  100% { box-shadow: 0 0 18px rgba(77, 255, 122, 0.8); }
}

.orbital-node.qualifier .node-circle { 
  border: 2px solid rgba(100, 150, 255, 0.8); 
  background: rgba(100, 150, 255, 0.15); 
  color: rgba(100, 150, 255, 1);
  font-size: 0.8rem; /* Keep text for qualifiers */
  transition: all 0.3s ease;
}

/* Acceptance/rejection glow effects */
.orbital-node.qualifier[isAccepting="true"] .node-circle {
  border-color: rgba(40, 200, 80, 0.9);
  background: rgba(40, 200, 80, 0.25);
  box-shadow: 0 0 15px rgba(40, 200, 80, 0.7);
  animation: pulse-accept 1s ease-out;
}

.orbital-node.qualifier[isRejecting="true"] .node-circle {
  border-color: rgba(255, 100, 40, 0.9);
  background: rgba(255, 100, 40, 0.25);
  box-shadow: 0 0 15px rgba(255, 100, 40, 0.7);
  animation: pulse-reject 1s ease-out;
}

@keyframes pulse-accept {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes pulse-reject {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.orbital-node.collector .node-circle { 
  border: 2px solid rgba(200, 200, 200, 0.8); 
  background: rgba(200, 200, 200, 0.15); 
  color: rgba(200, 200, 200, 1);
  border-style: dashed;
  font-size: 0.8rem; /* Keep text for collectors */
}

/* State-specific styles */
.orbital-node.attractedToValidator .node-circle {
  box-shadow: 0 0 15px rgba(100, 150, 255, 0.6);
}

/* Remove styles no longer needed */
.orbit-indicator {
  display: none;
}

/* ... rest of existing styles ... */

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
}

@media (max-width: 992px) {
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
  
  .diagram {
    height: 60vh; 
    min-height: 450px;
  }
  
  .space-pulse-circle { width: 140px; height: 140px; }
  .static-space-node.public .space-pulse-circle { width: 180px; height: 180px; }
  .simulation-description { max-width: 280px; padding: 15px; }
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 3rem;
  }
  
  .text-block p {
    font-size: 1.5rem;
  }
  
  .diagram {
    height: 55vh;
    min-height: 400px;
  }
  
  .orbital-node { width: 55px; height: 55px; }
  .node-circle { font-size: 0.65rem; }
  .space-pulse-circle { width: 120px; height: 120px; font-size: 0.7rem; }
  .static-space-node.public .space-pulse-circle { width: 160px; height: 160px; font-size: 0.8rem; }
  .simulation-description { 
    max-width: 240px; 
    bottom: 20px; 
    left: 20px;
    padding: 12px;
  }
  .simulation-description .section-label { font-size: 0.8rem; margin-bottom: 8px; }
  .simulation-description p { font-size: 0.85rem; }
  
  .systems-items {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .hero h1 {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .diagram {
    height: 50vh;
    min-height: 350px;
  }
  
  .orbital-node { width: 45px; height: 45px; }
  .node-circle { font-size: 0.55rem; }
  .space-pulse-circle { width: 100px; height: 100px; font-size: 0.6rem; padding: 5px; }
  .static-space-node.public .space-pulse-circle { width: 140px; height: 140px; font-size: 0.7rem; }
  .simulation-description {
    max-width: none;
    left: 10px;
    right: 10px;
    bottom: 10px;
  }
  
  .floating-nav {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
  }
}

/* ... circuit-page > section:last-child ... */

/* Stream Controls */
.stream-control {
  position: absolute;
  top: 20px;
  z-index: 100;
}

.producer-control {
  left: 20px;
}

.consumer-control {
  right: 20px;
}

.stream-button {
  padding: 10px 15px;
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stream-button:active {
  transform: scale(0.95);
}

.producer-stream {
  background-color: rgba(255, 77, 94, 0.8);
  border: 1px solid rgba(255, 77, 94, 1);
}

.consumer-stream {
  background-color: rgba(255, 138, 77, 0.8);
  border: 1px solid rgba(255, 138, 77, 1);
}

/* Speed Control */
.speed-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 240px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding-left: 15px;
  margin-left: 10px;
}

.speed-label-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 5px;
}

.speed-label-left,
.speed-label-right {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.speed-slider {
  width: 100%;
  appearance: none;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
}

.speed-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.speed-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  background: var(--accent-color);
}

.speed-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  background: var(--accent-color);
}

/* Node counters */
.node-counters {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.counter-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.counter-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.producer-counter .counter-icon {
  background-color: #FF4D5E; /* Red for studios */
  box-shadow: 0 0 8px rgba(255, 77, 94, 0.6);
}

.consumer-counter .counter-icon {
  background-color: #FF8A4D; /* Orange for brands */
  box-shadow: 0 0 8px rgba(255, 138, 77, 0.6);
}

.green-counter .counter-icon {
  background-color: #4DFF7A; /* Green for in production */
  box-shadow: 0 0 8px rgba(77, 255, 122, 0.6);
}

.counter-text {
  display: flex;
  flex-direction: column;
}

.counter-label {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.counter-value {
  font-size: 1.2rem;
  font-weight: 500;
  color: white;
}

/* Controls container */
.controls-container {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding: 12px 20px;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

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

.connection-flow {
  margin-bottom: 140px;
}

.flow-diagram {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-top: 4rem;
  position: relative;
}

.flow-node {
  flex: 1;
  min-width: 150px;
  max-width: 200px;
  text-align: center;
  position: relative;
  margin-bottom: 3rem;
}

.flow-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(61, 133, 244, 0.1);
  border: 1px solid rgba(61, 133, 244, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-color);
}

.flow-node h3 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.flow-node p {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-dim);
}

.flow-arrow {
  width: 40px;
  height: 2px;
  background-color: rgba(255, 255, 255, 0.2);
  position: relative;
  margin-top: 40px;
  flex-grow: 1;
  max-width: 80px;
}

.flow-arrow:after {
  content: "";
  position: absolute;
  right: 0;
  top: -4px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 992px) {
  .flow-diagram {
    justify-content: center;
    gap: 2rem;
  }
  
  .flow-arrow {
    display: none;
  }
  
  .flow-node {
    margin-bottom: 3rem;
  }
}

.use-cases {
  margin-bottom: 140px;
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 4rem 2rem;
  margin-top: 4rem;
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

@media (max-width: 768px) {
  .case-grid {
    grid-template-columns: 1fr;
  }
}

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

@media (max-width: 992px) {
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .metric-value {
    font-size: 5rem;
  }
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 5rem;
  }
}

.cta-section {
  padding: 10rem 0;
  text-align: center;
  background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), 
              radial-gradient(circle at 50% 50%, rgba(255, 77, 94, 0.2) 0%, rgba(0,0,0,0) 70%);
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

@media (max-width: 1200px) {
  .cta-section h2 {
    font-size: 3rem;
  }
}

@media (max-width: 768px) {
  .cta-section h2 {
    font-size: 2.5rem;
  }
}
</style> 
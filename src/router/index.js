import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth';

// Lazy load views for better performance
const Home = () => import('../views/Home.vue');
const Login = () => import('../views/Login.vue');
const SignUp = () => import('../views/SignUp.vue');
const VerifyEmail = () => import('../views/VerifyEmail.vue');
const Dashboard = () => import('../views/Dashboard.vue');
const NotFound = () => import('../views/NotFound.vue');
const ForgotPassword = () => import('../views/ForgotPassword.vue');
const ResetPassword = () => import('../views/ResetPassword.vue');
const Conversation = () => import('../views/Conversation.vue');
const Account = () => import('../views/Account.vue');
const Integrations = () => import('../views/Integrations.vue');
const AgentSettings = () => import('../views/AgentSettings.vue');
const Circuit = () => import('../views/Circuit.vue');

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: false }
  },
  {
    path: '/circuit',
    name: 'Circuit',
    component: Circuit,
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: SignUp,
    meta: { requiresAuth: false }
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: VerifyEmail,
    meta: { requiresAuth: false }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/agents/:agentId/chat/:conversationId?',
    name: 'Conversation',
    component: Conversation,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/agents/:agentId/settings',
    name: 'AgentSettings',
    component: AgentSettings,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/integrations',
    name: 'Integrations',
    component: Integrations,
    meta: {
      requiresAuth: true,
      title: 'API Keys'
    }
  },
  {
    path: '/account',
    name: 'Account',
    component: Account,
    meta: {
      requiresAuth: true,
      title: 'Account Settings'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router; 
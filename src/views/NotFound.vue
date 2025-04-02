<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <h1 class="not-found-title">404</h1>
      <p class="not-found-message">Page not found</p>
      <p class="not-found-description">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div class="not-found-actions">
        <router-link to="/" class="btn-primary">Go Home</router-link>
        <button @click="goBack" class="btn-secondary">Go Back</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFoundView',
  methods: {
    goBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: var(--bg-light);
}

.not-found-content {
  text-align: center;
  max-width: 500px;
}

.not-found-title {
  font-size: 6rem;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 0;
}

.not-found-message {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.not-found-description {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.not-found-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.not-found-actions a,
.not-found-actions button {
  min-width: 120px;
}
</style> 
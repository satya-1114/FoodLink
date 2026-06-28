// FoodLink client-side bootstrap script.
// Auto-dismiss flash alerts after 5 seconds.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.alert-dismissible').forEach((el) => {
    setTimeout(() => {
      const instance = bootstrap.Alert.getOrCreateInstance(el);
      instance.close();
    }, 5000);
  });
});

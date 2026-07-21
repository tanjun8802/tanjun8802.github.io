// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Simple form submission handler
document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thanks for your message! (This is a template so the message was not actually sent)');
    this.reset();
});

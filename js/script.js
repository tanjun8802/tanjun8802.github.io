document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    var yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Simple form submission handler
    var contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thanks for your message! (This is a template so the message was not actually sent)');
            this.reset();
        });
    }

    // Mobile menu toggle
    var menuIcon = document.getElementById('menu-icon');
    var navLinks = document.getElementById('nav-links');
    if (menuIcon && navLinks) {
        menuIcon.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }
});

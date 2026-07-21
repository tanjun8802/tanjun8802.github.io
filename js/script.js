document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Simple form submission handler
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thanks for your message! (This is a template so the message was not actually sent)');
            this.reset();
        });
    }

    // Mobile menu toggle
    const menuIcon = document.getElementById('menu-icon');
    const navLinks = document.getElementById('nav-links');
    if (menuIcon && navLinks) {
        menuIcon.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }

    // Image Upload Preview for Profile Picture
    const profileUpload = document.getElementById('profile-upload');
    const profilePreview = document.getElementById('profile-img-preview');
    if (profileUpload && profilePreview) {
        profileUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    profilePreview.style.backgroundImage = `url(${event.target.result})`;
                    profilePreview.innerHTML = ''; // Clear the placeholder text
                    profilePreview.style.border = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Carousel Logic and Image Upload
    const carouselUpload = document.getElementById('carousel-upload');
    const carouselInner = document.getElementById('carousel-inner');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    let currentSlide = 0;
    
    function updateCarousel() {
        const slides = document.querySelectorAll('.carousel-item');
        if(slides.length === 0) return;
        
        slides.forEach((slide, index) => {
            slide.classList.remove('active');
            if (index === currentSlide) {
                slide.classList.add('active');
            }
        });
    }

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', function() {
            const slides = document.querySelectorAll('.carousel-item');
            if(slides.length === 0) return;
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateCarousel();
        });

        nextBtn.addEventListener('click', function() {
            const slides = document.querySelectorAll('.carousel-item');
            if(slides.length === 0) return;
            currentSlide = (currentSlide + 1) % slides.length;
            updateCarousel();
        });
    }

    if (carouselUpload && carouselInner) {
        carouselUpload.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                // Remove placeholder if it's the only thing there
                const placeholder = document.querySelector('.carousel-placeholder-text');
                if (placeholder) {
                    carouselInner.innerHTML = '';
                    currentSlide = 0;
                }

                Array.from(files).forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const newSlide = document.createElement('div');
                        newSlide.className = 'carousel-item';
                        // If it's the first image being added, make it active
                        if (carouselInner.children.length === 0) {
                            newSlide.classList.add('active');
                        }
                        newSlide.style.backgroundImage = `url(${event.target.result})`;
                        carouselInner.appendChild(newSlide);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }
});

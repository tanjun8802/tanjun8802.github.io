document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Mobile menu toggle
    const menuIcon = document.getElementById('menu-icon');
    const navLinks = document.getElementById('nav-links');
    if (menuIcon && navLinks) {
        menuIcon.addEventListener('click', function() {
            const isActive = navLinks.classList.toggle('active');
            menuIcon.setAttribute('aria-expanded', isActive);
        });
    }

    // Load data from JSON
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            populateHero(data.hero);
            populateAbout(data.about);
            populateExperience(data.education, 'education-container');
            populateExperience(data.work, 'work-container');
            populateProjects(data.projects);
            
            // Populate footer name if provided
            const footerName = document.getElementById('footer-name');
            if (footerName) {
                footerName.textContent = data.hero.name;
            }
        })
        .catch(error => {
            console.error('Error loading data:', error);
            alert('Failed to load portfolio data. Please try refreshing the page.');
        });

    function populateHero(heroData) {
        document.getElementById('hero-name').textContent = heroData.name;
        document.getElementById('hero-tagline').textContent = heroData.tagline;

        const carouselInner = document.getElementById('carousel-inner');
        carouselInner.innerHTML = ''; // clear placeholder

        heroData.carousel.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-item' + (index === 0 ? ' active' : '');
            slide.style.backgroundImage = `url(${item.image})`;
            
            if (item.description) {
                const caption = document.createElement('div');
                caption.className = 'carousel-caption';
                caption.textContent = item.description;
                slide.appendChild(caption);
            }
            
            carouselInner.appendChild(slide);
        });

        initCarousel();
    }

    function populateAbout(aboutData) {
        document.getElementById('about-text').textContent = aboutData.text;
        
        const hobbiesList = document.getElementById('about-hobbies');
        hobbiesList.innerHTML = '';
        aboutData.hobbies.forEach(hobby => {
            const li = document.createElement('li');
            li.textContent = hobby;
            hobbiesList.appendChild(li);
        });

        const profilePreview = document.getElementById('profile-img-preview');
        profilePreview.style.backgroundImage = `url(${aboutData.profile_image})`;
        profilePreview.classList.add('has-image');

        document.getElementById('about-cv-link').href = aboutData.cv_link;
    }

    function populateExperience(expData, containerId) {
        const container = document.getElementById(containerId);
        
        // Remove existing git items but keep the main line
        const existingItems = container.querySelectorAll('.git-item');
        existingItems.forEach(item => item.remove());

        expData.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'git-item';

            // create branch line
            const branchLine = document.createElement('div');
            branchLine.className = 'git-branch-line';
            branchLine.style.borderColor = item.color;
            itemDiv.appendChild(branchLine);

            // create dot
            const dot = document.createElement('div');
            dot.className = 'git-dot';
            dot.style.border = `4px solid ${item.color}`;
            itemDiv.appendChild(dot);

            // create content
            const content = document.createElement('div');
            content.className = 'git-content';
            
            const title = document.createElement('h3');
            title.textContent = `${item.title} - ${item.institution || item.company}`;
            
            const date = document.createElement('span');
            date.className = 'date';
            date.textContent = item.date;

            const desc = document.createElement('p');
            desc.textContent = item.description;

            content.appendChild(title);
            content.appendChild(date);
            content.appendChild(desc);
            itemDiv.appendChild(content);

            container.appendChild(itemDiv);
        });
    }

    function populateProjects(projects) {
        const grid = document.getElementById('projects-grid');
        grid.innerHTML = '';

        projects.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.onclick = () => openModal(proj);
            card.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModal(proj);
                }
            };

            const img = document.createElement('img');
            img.src = proj.image;
            img.className = 'card-image';
            img.alt = proj.title;

            const content = document.createElement('div');
            content.className = 'card-content';

            const title = document.createElement('h3');
            title.textContent = proj.title;

            const shortDesc = document.createElement('p');
            shortDesc.textContent = proj.short_description;

            const link = document.createElement('span');
            link.className = 'btn-link';
            link.textContent = 'View Details';

            content.appendChild(title);
            content.appendChild(shortDesc);
            content.appendChild(link);

            card.appendChild(img);
            card.appendChild(content);

            grid.appendChild(card);
        });
    }

    // Modal Logic
    const modal = document.getElementById('project-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModalBtn = document.getElementById('close-modal');

    function openModal(project) {
        modalBody.innerHTML = ''; // clear

        const title = document.createElement('h2');
        title.id = 'modal-title';
        title.textContent = project.title;

        const img = document.createElement('img');
        img.src = project.image;
        img.alt = project.title;
        img.className = 'modal-image';

        const desc = document.createElement('p');
        desc.textContent = project.detail_description;

        const br = document.createElement('br');

        const link = document.createElement('a');
        link.href = project.repo_link;
        link.className = 'btn';
        link.target = '_blank';
        link.textContent = 'View Repo';

        modalBody.appendChild(title);
        modalBody.appendChild(img);
        modalBody.appendChild(desc);
        modalBody.appendChild(br);
        modalBody.appendChild(link);

        modal.classList.add('show');
    }

    if (closeModalBtn) {
        closeModalBtn.onclick = function() {
            modal.classList.remove('show');
        }
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    }

    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    });

    // Carousel Logic
    function initCarousel() {
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        let currentSlide = 0;
        
        function updateCarousel(slides) {
            if (!slides || slides.length === 0) return;
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
                if (slides.length === 0) return;
                currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                updateCarousel(slides);
            });

            nextBtn.addEventListener('click', function() {
                const slides = document.querySelectorAll('.carousel-item');
                if (slides.length === 0) return;
                currentSlide = (currentSlide + 1) % slides.length;
                updateCarousel(slides);
            });
        }
    }
});

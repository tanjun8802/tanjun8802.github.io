document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // ===== PARTICLE BACKGROUND =====
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const PARTICLE_COUNT = 60;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        function createParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.1
            };
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }

        function drawParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = 'rgba(35, 213, 171, ' + (0.1 * (1 - dist / 150)) + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(35, 213, 171, ' + p.opacity + ')';
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            }

            requestAnimationFrame(drawParticles);
        }
        drawParticles();
    }

    // ===== TYPING EFFECT =====
    const typingPhrases = [
        'Reinforcement Learning Researcher',
        'F1 Software Engineer @ Mercedes-AMG',
        'Imperial College London — MSc ML',
        'World Champion — IYRC Robotics 2017',
        'Speedcuber — PB 5.09s'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingEl = document.getElementById('typing-text');

    function typeEffect() {
        if (!typingEl) return;
        const currentPhrase = typingPhrases[phraseIndex];

        if (isDeleting) {
            typingEl.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingEl.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
        }

        let delay = isDeleting ? 30 : 60;

        if (!isDeleting && charIndex === currentPhrase.length) {
            delay = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % typingPhrases.length;
            delay = 500;
        }

        setTimeout(typeEffect, delay);
    }
    typeEffect();

    // ===== SCROLL FADE-IN =====
    const fadeElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    fadeElements.forEach(function(el) {
        observer.observe(el);
    });

    // ===== MOBILE MENU =====
    const menuIcon = document.getElementById('menu-icon');
    const navLinks = document.getElementById('nav-links');
    if (menuIcon && navLinks) {
        menuIcon.addEventListener('click', function() {
            const isActive = navLinks.classList.toggle('active');
            menuIcon.setAttribute('aria-expanded', isActive);
        });
    }

    // ===== IMAGE UPLOAD HANDLERS =====
    // Profile image upload
    const profileUpload = document.getElementById('profile-upload');
    if (profileUpload) {
        profileUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const preview = document.getElementById('profile-img-preview');
                    preview.style.backgroundImage = 'url(' + ev.target.result + ')';
                    preview.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Carousel image upload
    const carouselUpload = document.getElementById('carousel-upload');
    if (carouselUpload) {
        carouselUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const carouselInner = document.getElementById('carousel-inner');
                    // Deactivate all current slides
                    const currentSlides = carouselInner.querySelectorAll('.carousel-item');
                    currentSlides.forEach(function(s) { s.classList.remove('active'); });

                    // Create new slide
                    const slide = document.createElement('div');
                    slide.className = 'carousel-item active';
                    slide.style.backgroundImage = 'url(' + ev.target.result + ')';
                    carouselInner.appendChild(slide);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ===== LOAD DATA =====
    fetch('data.json')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(function(data) {
            populateHero(data.hero);
            populateAbout(data.about);
            populateSkills();
            populateGitGraph(data.education, 'education-container');
            populateGitGraph(data.work, 'work-container');
            populateProjects(data.projects);

            const footerName = document.getElementById('footer-name');
            if (footerName) {
                footerName.textContent = data.hero.name;
            }
        })
        .catch(function(error) {
            console.error('Error loading data:', error);
            alert('Failed to load portfolio data. Please try refreshing the page.');
        });

    // ===== POPULATE HERO =====
    function populateHero(heroData) {
        document.getElementById('hero-name').textContent = heroData.name;
        document.getElementById('hero-tagline').textContent = heroData.tagline;

        const carouselInner = document.getElementById('carousel-inner');
        carouselInner.innerHTML = '';

        heroData.carousel.forEach(function(item, index) {
            const slide = document.createElement('div');
            slide.className = 'carousel-item' + (index === 0 ? ' active' : '');
            slide.style.backgroundImage = 'url(' + item.image + ')';

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

    // ===== POPULATE ABOUT =====
    function populateAbout(aboutData) {
        document.getElementById('about-text').textContent = aboutData.text;

        const hobbiesList = document.getElementById('about-hobbies');
        hobbiesList.innerHTML = '';
        aboutData.hobbies.forEach(function(hobby) {
            const li = document.createElement('li');
            li.textContent = hobby;
            hobbiesList.appendChild(li);
        });

        const profilePreview = document.getElementById('profile-img-preview');
        profilePreview.style.backgroundImage = 'url(' + aboutData.profile_image + ')';
        profilePreview.classList.add('has-image');

        document.getElementById('about-cv-link').href = aboutData.cv_link;
    }

    // ===== POPULATE SKILLS =====
    function populateSkills() {
        const skills = [
            'Python', 'PyTorch', 'CUDA', 'Reinforcement Learning', 'Deep Learning',
            'MATLAB', 'Simulink', 'C++', 'TypeScript', 'Java',
            'LabVIEW', 'Git', 'Azure DevOps', 'MongoDB', 'Docker',
            'Neural Architecture Search', 'Federated Learning', 'MuJoCo',
            'Optuna', 'SLAM', 'Computer Vision', 'Robotics', 'Mechatronics'
        ];
        const grid = document.getElementById('skills-grid');
        if (!grid) return;
        grid.innerHTML = '';
        skills.forEach(function(skill) {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            grid.appendChild(tag);
        });
    }

    // ===== GIT GRAPH (realistic) =====
    // Standard git colors
    const GIT_COLORS = ['#e73c7e', '#23d5ab', '#58a6ff', '#d2a8ff', '#f0883e', '#3fb950', '#f778ba', '#79c0ff'];

    function populateGitGraph(items, containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        var mainX = 20;
        var branchX = 55;
        var itemHeight = 130;
        var dotRadius = 7;
        var totalHeight = items.length * itemHeight + 40;

        // Create SVG
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'git-graph-svg');
        svg.setAttribute('width', '70');
        svg.setAttribute('height', totalHeight.toString());
        svg.style.height = totalHeight + 'px';

        // Main branch line
        var mainLine = document.createElementNS(svgNS, 'line');
        mainLine.setAttribute('x1', mainX.toString());
        mainLine.setAttribute('y1', '0');
        mainLine.setAttribute('x2', mainX.toString());
        mainLine.setAttribute('y2', totalHeight.toString());
        mainLine.setAttribute('stroke', '#3fb950');
        mainLine.setAttribute('stroke-width', '3');
        svg.appendChild(mainLine);

        items.forEach(function(item, i) {
            var cy = i * itemHeight + 50;
            var color = GIT_COLORS[i % GIT_COLORS.length];

            // Branch-out curve (from main to branch dot)
            var path = document.createElementNS(svgNS, 'path');
            var d = 'M ' + mainX + ' ' + (cy - 25) +
                    ' C ' + mainX + ' ' + (cy - 5) +
                    ' ' + branchX + ' ' + (cy - 15) +
                    ' ' + branchX + ' ' + cy;
            path.setAttribute('d', d);
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '2.5');
            path.setAttribute('fill', 'none');
            svg.appendChild(path);

            // Merge-back curve (from branch dot back to main)
            var pathBack = document.createElementNS(svgNS, 'path');
            var dBack = 'M ' + branchX + ' ' + cy +
                        ' C ' + branchX + ' ' + (cy + 15) +
                        ' ' + mainX + ' ' + (cy + 5) +
                        ' ' + mainX + ' ' + (cy + 25);
            pathBack.setAttribute('d', dBack);
            pathBack.setAttribute('stroke', color);
            pathBack.setAttribute('stroke-width', '2.5');
            pathBack.setAttribute('fill', 'none');
            svg.appendChild(pathBack);

            // Main branch dot (merge point top)
            var mainDot1 = document.createElementNS(svgNS, 'circle');
            mainDot1.setAttribute('cx', mainX.toString());
            mainDot1.setAttribute('cy', (cy - 25).toString());
            mainDot1.setAttribute('r', '4');
            mainDot1.setAttribute('fill', '#3fb950');
            svg.appendChild(mainDot1);

            // Main branch dot (merge point bottom)
            var mainDot2 = document.createElementNS(svgNS, 'circle');
            mainDot2.setAttribute('cx', mainX.toString());
            mainDot2.setAttribute('cy', (cy + 25).toString());
            mainDot2.setAttribute('r', '4');
            mainDot2.setAttribute('fill', '#3fb950');
            svg.appendChild(mainDot2);

            // Branch commit dot
            var branchDot = document.createElementNS(svgNS, 'circle');
            branchDot.setAttribute('cx', branchX.toString());
            branchDot.setAttribute('cy', cy.toString());
            branchDot.setAttribute('r', dotRadius.toString());
            branchDot.setAttribute('fill', color);
            branchDot.setAttribute('stroke', '#0d1117');
            branchDot.setAttribute('stroke-width', '2');
            svg.appendChild(branchDot);

            // Content card
            var itemDiv = document.createElement('div');
            itemDiv.className = 'git-item';
            itemDiv.style.marginTop = (i === 0 ? '25px' : '0');
            itemDiv.style.height = itemHeight + 'px';
            itemDiv.style.display = 'flex';
            itemDiv.style.alignItems = 'center';

            var content = document.createElement('div');
            content.className = 'git-content';
            content.style.borderLeftColor = color;

            // Generate a fake commit hash for visual effect
            var hash = Math.random().toString(16).substring(2, 9);
            var hashSpan = document.createElement('span');
            hashSpan.className = 'commit-hash';
            hashSpan.textContent = hash;

            var title = document.createElement('h3');
            title.textContent = item.title + ' — ' + (item.institution || item.company);

            var date = document.createElement('span');
            date.className = 'date';
            date.textContent = item.date;

            var desc = document.createElement('p');
            desc.textContent = item.description;

            content.appendChild(hashSpan);
            content.appendChild(title);
            content.appendChild(date);
            content.appendChild(desc);
            itemDiv.appendChild(content);

            container.appendChild(itemDiv);

            // Observe for animation
            var animObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, { threshold: 0.2 });
            animObserver.observe(itemDiv);
        });

        container.insertBefore(svg, container.firstChild);
        container.style.minHeight = totalHeight + 'px';
    }

    // ===== POPULATE PROJECTS =====
    function populateProjects(projects) {
        var grid = document.getElementById('projects-grid');
        grid.innerHTML = '';

        projects.forEach(function(proj) {
            var card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.onclick = function() { openModal(proj); };
            card.onkeydown = function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModal(proj);
                }
            };

            var img = document.createElement('img');
            img.src = proj.image;
            img.className = 'card-image';
            img.alt = proj.title;

            var content = document.createElement('div');
            content.className = 'card-content';

            var title = document.createElement('h3');
            title.textContent = proj.title;

            var shortDesc = document.createElement('p');
            shortDesc.textContent = proj.short_description;

            var link = document.createElement('span');
            link.className = 'btn-link';
            link.textContent = 'View Details →';

            content.appendChild(title);
            content.appendChild(shortDesc);
            content.appendChild(link);

            card.appendChild(img);
            card.appendChild(content);

            grid.appendChild(card);
        });
    }

    // ===== MODAL =====
    const modal = document.getElementById('project-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModalBtn = document.getElementById('close-modal');

    function openModal(project) {
        modalBody.innerHTML = '';

        var title = document.createElement('h2');
        title.id = 'modal-title';
        title.textContent = project.title;

        var img = document.createElement('img');
        img.src = project.image;
        img.alt = project.title;
        img.className = 'modal-image';

        var desc = document.createElement('p');
        desc.textContent = project.detail_description;

        var br = document.createElement('br');

        var link = document.createElement('a');
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
        };
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    };

    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    });

    // ===== CAROUSEL =====
    function initCarousel() {
        var prevBtn = document.getElementById('carousel-prev');
        var nextBtn = document.getElementById('carousel-next');
        var currentSlide = 0;
        var autoSlideTimer;

        function updateCarousel(slides) {
            if (!slides || slides.length === 0) return;
            slides.forEach(function(slide, index) {
                slide.classList.remove('active');
                if (index === currentSlide) {
                    slide.classList.add('active');
                }
            });
        }

        function nextSlide() {
            var slides = document.querySelectorAll('.carousel-item');
            if (slides.length === 0) return;
            currentSlide = (currentSlide + 1) % slides.length;
            updateCarousel(slides);
        }

        // Auto-advance every 5 seconds
        function startAuto() {
            clearInterval(autoSlideTimer);
            autoSlideTimer = setInterval(nextSlide, 5000);
        }
        startAuto();

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', function() {
                var slides = document.querySelectorAll('.carousel-item');
                if (slides.length === 0) return;
                currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                updateCarousel(slides);
                startAuto();
            });

            nextBtn.addEventListener('click', function() {
                var slides = document.querySelectorAll('.carousel-item');
                if (slides.length === 0) return;
                currentSlide = (currentSlide + 1) % slides.length;
                updateCarousel(slides);
                startAuto();
            });
        }
    }
});

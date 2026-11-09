(function () {
    "use strict";

    const root = document.documentElement;
    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");


    /* =====================================================
       DARK MODE (circular reveal, remembers the choice)
       ===================================================== */

    const themeToggle = $("#theme-toggle");
    const themeColorMeta = $('meta[name="theme-color"]');

    function applyTheme(theme) {
        root.dataset.theme = theme;

        const isDark = theme === "dark";
        themeToggle.setAttribute("aria-pressed", String(isDark));
        themeToggle.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );

        if (themeColorMeta) {
            themeColorMeta.setAttribute("content", isDark ? "#252525" : "#F8F6F2");
        }

        try {
            localStorage.setItem("theme", theme);
        } catch (error) {
            /* storage unavailable, the choice just won't persist */
        }
    }

    applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

    themeToggle.addEventListener("click", function () {
        const next = root.dataset.theme === "dark" ? "light" : "dark";

        if (reducedMotion.matches) {
            applyTheme(next);
            return;
        }

        // Soft cross-fade for browsers without View Transitions
        if (!document.startViewTransition) {
            root.classList.add("theme-transition");
            applyTheme(next);
            setTimeout(function () {
                root.classList.remove("theme-transition");
            }, 600);
            return;
        }

        // Circle expands from the toggle button
        const rect = themeToggle.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transition = document.startViewTransition(function () {
            applyTheme(next);
        });

        transition.ready
            .then(function () {
                root.animate(
                    {
                        clipPath: [
                            "circle(0px at " + x + "px " + y + "px)",
                            "circle(" + radius + "px at " + x + "px " + y + "px)"
                        ]
                    },
                    {
                        duration: 800,
                        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                        pseudoElement: "::view-transition-new(root)"
                    }
                );
            })
            .catch(function () {});
    });


    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    const header = $("header");
    const menuToggle = $("#menu-toggle");
    const navLinks = $("#nav-links");

    function isMenuOpen() {
        return navLinks.classList.contains("open");
    }

    function setMenu(open) {
        navLinks.classList.toggle("open", open);
        header.classList.toggle("menu-open", open);
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute(
            "aria-label",
            open ? "Close navigation" : "Open navigation"
        );
    }

    menuToggle.addEventListener("click", function () {
        setMenu(!isMenuOpen());
    });

    // Close the menu after clicking a link
    $$("a", navLinks).forEach(function (link) {
        link.addEventListener("click", function () {
            setMenu(false);
        });
    });

    // Close with Escape
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && isMenuOpen()) {
            setMenu(false);
            menuToggle.focus();
        }
    });

    // Reset when the window grows to desktop width
    window.matchMedia("(min-width: 769px)").addEventListener("change", function (event) {
        if (event.matches) setMenu(false);
    });


    /* =====================================================
       SCROLL: progress bar + smart header
       ===================================================== */

    const progressBar = $(".scroll-progress");
    let lastScrollY = window.scrollY;
    let scrollTicking = false;

    function handleScroll() {
        const y = window.scrollY;
        const maxScroll = root.scrollHeight - window.innerHeight;

        progressBar.style.setProperty("--progress", maxScroll > 0 ? y / maxScroll : 0);
        header.classList.toggle("scrolled", y > 20);

        // Hide on scroll down, show on scroll up
        const delta = y - lastScrollY;

        if (Math.abs(delta) > 6) {
            if (delta > 0 && y > 200 && !isMenuOpen()) {
                header.classList.add("header-hidden");
            } else if (delta < 0) {
                header.classList.remove("header-hidden");
            }
            lastScrollY = y;
        }

        if (y <= 200) header.classList.remove("header-hidden");

        scrollTicking = false;
    }

    window.addEventListener("scroll", function () {
        if (!scrollTicking) {
            window.requestAnimationFrame(handleScroll);
            scrollTicking = true;
        }
    }, { passive: true });

    handleScroll();


    /* =====================================================
       ACTIVE NAV LINK (scroll spy)
       ===================================================== */

    const linkById = new Map();

    $$("a", navLinks).forEach(function (link) {
        linkById.set(link.getAttribute("href").slice(1), link);
    });

    const spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            linkById.forEach(function (link) {
                link.classList.remove("active");
                link.removeAttribute("aria-current");
            });

            const activeLink = linkById.get(entry.target.id);

            if (activeLink) {
                activeLink.classList.add("active");
                activeLink.setAttribute("aria-current", "true");
            }
        });
    }, { rootMargin: "-45% 0px -50% 0px" });

    linkById.forEach(function (link, id) {
        const section = document.getElementById(id);
        if (section) spy.observe(section);
    });


    /* =====================================================
       SCROLL REVEAL (headings, text, cards, form)
       ===================================================== */

    // Cards animate in row by row with a small stagger
    $$(".skills-container, .projects-container").forEach(function (grid) {
        const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;

        $$(".skill-card, .project-card", grid).forEach(function (card, index) {
            card.setAttribute("data-reveal", "");
            card.style.setProperty("--delay", (index % columns) * 110 + "ms");
        });
    });

    const revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -6% 0px"
    });

    $$("[data-reveal]").forEach(function (element) {
        revealObserver.observe(element);
    });


    /* =====================================================
       HERO PARALLAX (image follows the cursor slightly)
       ===================================================== */

    const hero = $(".hero");
    const heroImage = $(".hero-image");

    if (finePointer.matches && !reducedMotion.matches && hero && heroImage) {
        hero.addEventListener("pointermove", function (event) {
            const rect = hero.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / rect.width - 0.5;
            const ny = (event.clientY - rect.top) / rect.height - 0.5;

            heroImage.style.setProperty("--px", nx * -22 + "px");
            heroImage.style.setProperty("--py", ny * -22 + "px");
        });

        hero.addEventListener("pointerleave", function () {
            heroImage.style.removeProperty("--px");
            heroImage.style.removeProperty("--py");
        });
    }


    /* =====================================================
       MAGNETIC BUTTONS
       ===================================================== */

    if (finePointer.matches && !reducedMotion.matches) {
        $$(".hero-buttons .btn, .contact .btn").forEach(function (button) {
            button.addEventListener("pointermove", function (event) {
                const rect = button.getBoundingClientRect();
                const x = (event.clientX - rect.left - rect.width / 2) * 0.25;
                const y = (event.clientY - rect.top - rect.height / 2) * 0.35;

                button.style.translate = x + "px " + y + "px";
            });

            button.addEventListener("pointerleave", function () {
                button.style.translate = "";
            });
        });
    }


    /* =====================================================
       CARD SPOTLIGHT + 3D TILT
       ===================================================== */

    if (finePointer.matches) {
        const tilt = !reducedMotion.matches;

        $$(".skill-card, .project-card").forEach(function (card) {
            card.addEventListener("pointermove", function (event) {
                const rect = card.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                card.style.setProperty("--mx", x + "px");
                card.style.setProperty("--my", y + "px");

                if (tilt) {
                    card.style.setProperty("--rx", (y / rect.height - 0.5) * -6 + "deg");
                    card.style.setProperty("--ry", (x / rect.width - 0.5) * 6 + "deg");
                }
            });

            card.addEventListener("pointerleave", function () {
                ["--rx", "--ry", "--mx", "--my"].forEach(function (property) {
                    card.style.removeProperty(property);
                });
            });
        });
    }


    /* =====================================================
       CONTACT FORM VALIDATION
       ===================================================== */

    const contactForm = $("#contact-form");
    const formFeedback = $("#form-feedback");
    const nameField = $("#name");
    const emailField = $("#email");
    const messageField = $("#message");
    let feedbackTimer;

    function showFeedback(text, type) {
        clearTimeout(feedbackTimer);

        formFeedback.className = "";
        formFeedback.textContent = text;

        // Force a reflow so the animation replays every time
        void formFeedback.offsetWidth;

        formFeedback.classList.add("visible", type);

        feedbackTimer = setTimeout(function () {
            formFeedback.classList.remove("visible");
        }, 6000);
    }

    function markInvalid(field) {
        field.classList.remove("invalid");
        void field.offsetWidth;
        field.classList.add("invalid");
        field.setAttribute("aria-invalid", "true");
    }

    [nameField, emailField, messageField].forEach(function (field) {
        field.addEventListener("input", function () {
            field.classList.remove("invalid");
            field.removeAttribute("aria-invalid");
        });
    });

    contactForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = nameField.value.trim();
        const email = emailField.value.trim();
        const message = messageField.value.trim();

        if (name === "" || email === "" || message === "") {
            if (name === "") markInvalid(nameField);
            if (email === "") markInvalid(emailField);
            if (message === "") markInvalid(messageField);

            showFeedback("Please fill in all fields.", "error");

            [nameField, emailField, messageField]
                .find(function (field) { return field.value.trim() === ""; })
                .focus();
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            markInvalid(emailField);
            showFeedback("Please enter a valid email address.", "error");
            emailField.focus();
            return;
        }

        showFeedback("Thank you! Your message is ready.", "success");
        contactForm.reset();
    });
})();
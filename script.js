
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

        if (themeToggle) {
            themeToggle.setAttribute("aria-pressed", String(isDark));
            themeToggle.setAttribute(
                "aria-label",
                isDark ? "Switch to light mode" : "Switch to dark mode"
            );
        }

        if (themeColorMeta) {
            themeColorMeta.setAttribute("content", isDark ? "#252525" : "#F8F6F2");
        }

        try {
            localStorage.setItem("theme", theme);
        } catch (error) {
            /* Storage unavailable */
        }
    }

    applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            const next = root.dataset.theme === "dark" ? "light" : "dark";

            if (reducedMotion.matches) {
                applyTheme(next);
                return;
            }

            if (!document.startViewTransition) {
                root.classList.add("theme-transition");
                applyTheme(next);

                setTimeout(function () {
                    root.classList.remove("theme-transition");
                }, 600);

                return;
            }

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
    }


    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    const header = $("header");
    const menuToggle = $("#menu-toggle");
    const navLinks = $("#nav-links");

    function isMenuOpen() {
        return navLinks && navLinks.classList.contains("open");
    }

    function setMenu(open) {
        if (!navLinks || !menuToggle || !header) return;

        navLinks.classList.toggle("open", open);
        header.classList.toggle("menu-open", open);

        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute(
            "aria-label",
            open ? "Close navigation" : "Open navigation"
        );
    }

    if (menuToggle && navLinks && header) {

        menuToggle.addEventListener("click", function () {
            setMenu(!isMenuOpen());
        });

        $$("a", navLinks).forEach(function (link) {
            link.addEventListener("click", function () {
                setMenu(false);
            });
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && isMenuOpen()) {
                setMenu(false);
                menuToggle.focus();
            }
        });

        window.matchMedia("(min-width: 769px)").addEventListener("change", function (event) {
            if (event.matches) setMenu(false);
        });
    }


    /* =====================================================
       SCROLL: progress bar + smart header
       ===================================================== */

    const progressBar = $(".scroll-progress");
    let lastScrollY = window.scrollY;
    let scrollTicking = false;

    function handleScroll() {
        const y = window.scrollY;
        const maxScroll = root.scrollHeight - window.innerHeight;

        if (progressBar) {
            progressBar.style.setProperty(
                "--progress",
                maxScroll > 0 ? y / maxScroll : 0
            );
        }

        if (header) {
            header.classList.toggle("scrolled", y > 20);
        }

        const delta = y - lastScrollY;

        if (Math.abs(delta) > 6) {
            if (delta > 0 && y > 200 && !isMenuOpen()) {
                if (header) header.classList.add("header-hidden");
            } else if (delta < 0) {
                if (header) header.classList.remove("header-hidden");
            }

            lastScrollY = y;
        }

        if (y <= 200 && header) {
            header.classList.remove("header-hidden");
        }

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

    if (navLinks) {
        $$("a", navLinks).forEach(function (link) {
            const href = link.getAttribute("href");

            if (href && href.startsWith("#")) {
                linkById.set(href.slice(1), link);
            }
        });
    }

    if ("IntersectionObserver" in window) {
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
    }


    /* =====================================================
       SCROLL REVEAL
       ===================================================== */

    $$(".skills-container, .projects-container").forEach(function (grid) {
        const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;

        $$(".skill-card, .project-card", grid).forEach(function (card, index) {
            card.setAttribute("data-reveal", "");
            card.style.setProperty("--delay", (index % columns) * 110 + "ms");
        });
    });

    if ("IntersectionObserver" in window) {
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
    } else {
        $$("[data-reveal]").forEach(function (element) {
            element.classList.add("is-visible");
        });
    }


    /* =====================================================
       HERO PARALLAX
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
       CONTACT FORM VALIDATION + FORMSPREE
       ===================================================== */

    const contactForm = $("#contact-form");
    const formFeedback = $("#form-feedback");

    if (contactForm && formFeedback) {

        const nameField = $("#name", contactForm);
        const emailField = $("#email", contactForm);
        const subjectField = $("#subject", contactForm);
        const messageField = $("#message", contactForm);

        const submitButton = $('button[type="submit"]', contactForm);

        let feedbackTimer;

        function showFeedback(text, type) {
            clearTimeout(feedbackTimer);

            formFeedback.className = "";
            formFeedback.textContent = text;

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

        const fields = [
            nameField,
            emailField,
            subjectField,
            messageField
        ].filter(Boolean);

        fields.forEach(function (field) {
            field.addEventListener("input", function () {
                field.classList.remove("invalid");
                field.removeAttribute("aria-invalid");
            });
        });

        contactForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = nameField.value.trim();
            const email = emailField.value.trim();
            const subject = subjectField.value.trim();
            const message = messageField.value.trim();

            const requiredFields = [
                { field: nameField, value: name },
                { field: emailField, value: email },
                { field: subjectField, value: subject },
                { field: messageField, value: message }
            ];

            const emptyFields = requiredFields.filter(function (item) {
                return item.value === "";
            });

            if (emptyFields.length > 0) {
                emptyFields.forEach(function (item) {
                    markInvalid(item.field);
                });

                showFeedback("Please fill in all fields.", "error");

                emptyFields[0].field.focus();
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                markInvalid(emailField);

                showFeedback("Please enter a valid email address.", "error");

                emailField.focus();
                return;
            }

            const originalButtonText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent = "Sending...";

            try {
                const response = await fetch(contactForm.action, {
                    method: "POST",
                    body: new FormData(contactForm),
                    headers: {
                        "Accept": "application/json"
                    }
                });

                if (response.ok) {
                    showFeedback(
                        "Thank you! Your message has been sent successfully.",
                        "success"
                    );

                    contactForm.reset();

                    fields.forEach(function (field) {
                        field.classList.remove("invalid");
                        field.removeAttribute("aria-invalid");
                    });

                } else {
                    showFeedback(
                        "Sorry, your message could not be sent. Please try again.",
                        "error"
                    );
                }

            } catch (error) {
                showFeedback(
                    "Something went wrong. Please check your internet connection and try again.",
                    "error"
                );

            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // HOMEPAGE CONTACT FORM VALIDATION
    

    // HOMEPAGE CONTACT FORM VALIDATION

    const homeContactForm = document.querySelector("#home-contact-form");

    if (homeContactForm) {
        const homeName = homeContactForm.querySelector("#name");
        const homeEmail = homeContactForm.querySelector("#email");
        const homeMessage = homeContactForm.querySelector("#message");
        const homeFeedback = homeContactForm.querySelector("#form-feedback");
        const homeSubmitButton = homeContactForm.querySelector('button[type="submit"]');

        let homeFeedbackTimer;

        function showHomeFeedback(text, type) {
            clearTimeout(homeFeedbackTimer);

            homeFeedback.className = "";
            homeFeedback.textContent = text;

            void homeFeedback.offsetWidth;

            homeFeedback.classList.add("visible", type);

            homeFeedbackTimer = setTimeout(function () {
                homeFeedback.classList.remove("visible");
            }, 6000);
        }

        function markHomeInvalid(field) {
            field.classList.remove("invalid");

            void field.offsetWidth;

            field.classList.add("invalid");
            field.setAttribute("aria-invalid", "true");
        }

        const homeFields = [
            homeName,
            homeEmail,
            homeMessage
        ];

        homeFields.forEach(function (field) {
            field.addEventListener("input", function () {
                field.classList.remove("invalid");
                field.removeAttribute("aria-invalid");
            });
        });

        homeContactForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = homeName.value.trim();
            const email = homeEmail.value.trim();
            const message = homeMessage.value.trim();

            const requiredFields = [
                { field: homeName, value: name },
                { field: homeEmail, value: email },
                { field: homeMessage, value: message }
            ];

            const emptyFields = requiredFields.filter(function (item) {
                return item.value === "";
            });

            if (emptyFields.length > 0) {
                emptyFields.forEach(function (item) {
                    markHomeInvalid(item.field);
                });

                showHomeFeedback("Please fill in all fields.", "error");

                emptyFields[0].field.focus();
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                markHomeInvalid(homeEmail);

                showHomeFeedback("Please enter a valid email address.", "error");

                homeEmail.focus();
                return;
            }

            if (message.length < 10) {
                markHomeInvalid(homeMessage);

                showHomeFeedback("Your message must be at least 10 characters.", "error");

                homeMessage.focus();
                return;
            }

            const originalButtonText = homeSubmitButton.textContent;

            homeSubmitButton.disabled = true;
            homeSubmitButton.textContent = "Sending...";

            try {
                const response = await fetch(homeContactForm.action, {
                    method: "POST",
                    body: new FormData(homeContactForm),
                    headers: {
                        "Accept": "application/json"
                    }
                });

                if (response.ok) {
                    showHomeFeedback(
                        "Thank you! Your message has been sent successfully.",
                        "success"
                    );

                    homeContactForm.reset();

                    homeFields.forEach(function (field) {
                        field.classList.remove("invalid");
                        field.removeAttribute("aria-invalid");
                    });

                } else {
                    showHomeFeedback(
                        "Sorry, your message could not be sent. Please try again.",
                        "error"
                    );
                }

            } catch (error) {
                showHomeFeedback(
                    "Something went wrong. Please check your internet connection and try again.",
                    "error"
                );

            } finally {
                homeSubmitButton.disabled = false;
                homeSubmitButton.textContent = originalButtonText;
            }
        });
    }


})();

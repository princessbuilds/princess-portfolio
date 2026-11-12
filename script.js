
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
            themeColorMeta.setAttribute(
                "content",
                isDark ? "#252525" : "#F8F6F2"
            );
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

        const desktopQuery = window.matchMedia("(min-width: 769px)");

        const handleDesktopChange = function (event) {
            if (event.matches) setMenu(false);
        };

        if (desktopQuery.addEventListener) {
            desktopQuery.addEventListener("change", handleDesktopChange);
        } else if (desktopQuery.addListener) {
            desktopQuery.addListener(handleDesktopChange);
        }
    }


    /* =====================================================
       SCROLL: PROGRESS BAR + SMART HEADER
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
       ACTIVE NAV LINK (SCROLL SPY)
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
                    card.style.setProperty(
                        "--rx",
                        (y / rect.height - 0.5) * -6 + "deg"
                    );
                    card.style.setProperty(
                        "--ry",
                        (x / rect.width - 0.5) * 6 + "deg"
                    );
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
       CONTACT FORMS: VALIDATION + FORMSPREE
       Works with both Home and Contact page forms.
       ===================================================== */

    function setupContactForm(formSelector, settings) {
        const form = $(formSelector);

        if (!form) return;

        const nameField = $("#name", form);
        const emailField = $("#email", form);
        const messageField = $("#message", form);
        const subjectField = settings.hasSubject ? $("#subject", form) : null;
        const feedback = $("#form-feedback", form);
        const submitButton = $('button[type="submit"]', form);

        const fields = [
            nameField,
            emailField,
            ...(settings.hasSubject ? [subjectField] : []),
            messageField
        ];

        if (
            !nameField ||
            !emailField ||
            !messageField ||
            !feedback ||
            !submitButton ||
            fields.some(function (field) {
                return !field;
            })
        ) {
            return;
        }

        let feedbackTimer;

        function showFeedback(message, type) {
            clearTimeout(feedbackTimer);

            feedback.className = "";
            feedback.textContent = message;

            void feedback.offsetWidth;

            feedback.classList.add("visible", type);

            feedbackTimer = setTimeout(function () {
                feedback.classList.remove("visible");
            }, 6000);
        }

        function markInvalid(field) {
            field.classList.remove("invalid");

            void field.offsetWidth;

            field.classList.add("invalid");
            field.setAttribute("aria-invalid", "true");
        }

        function clearInvalid(field) {
            field.classList.remove("invalid");
            field.removeAttribute("aria-invalid");
        }

        fields.forEach(function (field) {
            field.addEventListener("input", function () {
                clearInvalid(field);
            });
        });

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const values = fields.map(function (field) {
                return {
                    field: field,
                    value: field.value.trim()
                };
            });

            const emptyFields = values.filter(function (item) {
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

            const email = emailField.value.trim();

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                markInvalid(emailField);

                showFeedback("Please enter a valid email address.", "error");
                emailField.focus();
                return;
            }

            if (
                settings.minimumMessageLength &&
                messageField.value.trim().length < settings.minimumMessageLength
            ) {
                markInvalid(messageField);

                showFeedback(
                    "Your message must be at least " +
                    settings.minimumMessageLength +
                    " characters.",
                    "error"
                );

                messageField.focus();
                return;
            }

            const originalButtonText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent = "Sending...";

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: {
                        "Accept": "application/json"
                    }
                });

                if (response.ok) {
                    showFeedback(
                        "Thank you! Your message has been sent successfully.",
                        "success"
                    );

                    form.reset();

                    fields.forEach(function (field) {
                        clearInvalid(field);
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

    /* Homepage form: name, email and message */
    setupContactForm("#home-contact-form", {
        hasSubject: false,
        minimumMessageLength: 10
    });

    /* Contact page form: name, email, subject and message */
    setupContactForm("#contact-form", {
        hasSubject: true,
        minimumMessageLength: 0
    });


})();

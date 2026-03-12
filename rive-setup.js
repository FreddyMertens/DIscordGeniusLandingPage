(() => {
    const hasInteractions = Boolean(window.__djInteractionsLoaded) || Boolean(document.querySelector('script[src$="script.js"]'));
    if (!hasInteractions && document.currentScript?.src) {
        const sharedScript = document.createElement('script');
        sharedScript.src = new URL('script.js', document.currentScript.src).toString();
        document.head.appendChild(sharedScript);
    }
})();

// Lazy-load Rive animations: only init when visible, pause when off-screen
document.addEventListener('DOMContentLoaded', () => {
    const canUseRive = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    if (!window.rive || !canUseRive) return;

    // Define all Rive animation targets
    const riveTargets = [
        { canvasId: 'nav-logo', fallbackId: 'nav-logo-fallback', src: '/assets/DiscordGeniusLogo.riv', animations: ['GradientBrainAnimation', 'AtomsAnimations'], alignment: rive.Alignment.Center, fit: rive.Fit.Contain },
        { canvasId: 'nav-title', fallbackId: 'nav-title-fallback', src: '/assets/DiscordGeniusLogoText.riv', stateMachines: null, alignment: rive.Alignment.CenterLeft, fit: rive.Fit.Contain },
        { canvasId: 'footer-logo', fallbackId: 'footer-logo-fallback', src: '/assets/DiscordGeniusLogo.riv', animations: ['GradientBrainAnimation', 'AtomsAnimations'], alignment: rive.Alignment.Center, fit: rive.Fit.Contain },
        { canvasId: 'footer-title', fallbackId: 'footer-title-fallback', src: '/assets/DiscordGeniusLogoText.riv', stateMachines: null, alignment: rive.Alignment.CenterLeft, fit: rive.Fit.Contain },
    ];

    // Track instances: Map<observed element, { canvas, config, instance, initialized }>
    const riveInstances = new Map();

    // Resize handler to ensure Rive canvases update their drawing surface on window resize
    const resizeAll = () => {
        riveInstances.forEach((dataList) => {
            dataList.forEach(data => {
                if (data.instance && data.initialized && data.canvas.style.display !== 'none') {
                    data.instance.resizeDrawingSurfaceToCanvas();
                }
            });
        });
    };

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeAll, 100);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const observed = entry.target;
            const dataList = riveInstances.get(observed);
            if (!dataList) return;

            dataList.forEach(data => {
                const canvas = data.canvas;
                if (entry.isIntersecting || !data.initialized) {
                    if (!data.initialized) {
                        // Lazy-load: create Rive instance on first visibility
                        const cfg = data.config;
                        // canvas is already in data
                        const opts = {
                            src: cfg.src,
                            canvas: canvas,
                            autoplay: false, // Manual control to prevent conflicts
                            fit: cfg.fit,
                            alignment: cfg.alignment,
                            onLoad: () => {
                                const fb = document.getElementById(cfg.fallbackId);
                                if (fb) fb.style.display = 'none';
                                canvas.style.display = 'block';
                                // Ensure canvas size is correct after becoming visible
                                data.instance.resizeDrawingSurfaceToCanvas();

                                // Robust manual playback logic with frame delay
                                requestAnimationFrame(() => {
                                    if (cfg.animations && Array.isArray(cfg.animations)) {
                                        data.instance.play(cfg.animations);
                                    } else if (cfg.stateMachines) {
                                        data.instance.play(cfg.stateMachines);
                                    } else {
                                        data.instance.play();
                                    }
                                });
                            },
                        };
                        if (cfg.stateMachines) opts.stateMachines = cfg.stateMachines;
                        if (cfg.animations) opts.animations = cfg.animations; // Support multiple animations
                        data.instance = new rive.Rive(opts);
                        data.initialized = true;
                    } else if (data.instance) {
                        // Resume: ensure correct animations are playing
                        const cfg = data.config;
                        if (cfg.animations && Array.isArray(cfg.animations)) {
                            data.instance.play(cfg.animations);
                        } else if (cfg.stateMachines) {
                            data.instance.play(cfg.stateMachines);
                        } else {
                            data.instance.play();
                        }
                    }
                } else {
                    // Off-screen: pause to stop rAF loop
                    if (data.instance) {
                        data.instance.pause();
                    }
                }
            }); // end forEach
        });
    }, { threshold: 0.05 });

    // Register all targets — observe the fallback (visible) element, not the hidden canvas
    riveTargets.forEach(cfg => {
        const canvas = document.getElementById(cfg.canvasId);
        const fallback = document.getElementById(cfg.fallbackId);
        if (!canvas) return;
        // Observe the parent (the link/wrapper) which stays visible
        const observeTarget = canvas.parentElement || fallback || canvas;

        let existing = riveInstances.get(observeTarget);
        if (!existing) {
            existing = [];
            riveInstances.set(observeTarget, existing);
        }
        existing.push({ canvas: canvas, config: cfg, instance: null, initialized: false });
        observer.observe(observeTarget);
    });
});

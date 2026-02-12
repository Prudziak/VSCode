function goToSecondScreen() {
    document.getElementById("screen1").classList.remove("active");
    document.getElementById("screen2").classList.add("active");
}

// ---- Notifications setup ----
// Replace with your endpoint (Formspree, IFTTT/Make webhook, Zapier, or your server)
const NOTIFICATION_ENDPOINT = ""; // e.g. https://maker.ifttt.com/trigger/event/with/key/XXXX
// EmailJS configuration (created via your EmailJS account)
const EMAILJS_USER_ID = "PPxp2fZyt45q-XZSU";      // your public key
const EMAILJS_SERVICE_ID = "service_wigo2mm";   // your service id
const EMAILJS_TEMPLATE_ID = "template_oe4pbxo";  // your template id
let _emailjs_initialized = false;

function sendNotification(answer) {
    const payload = {
        answer,
        url: location.href,
        userAgent: navigator.userAgent,
        ts: new Date().toISOString()
    };

    // If EmailJS is configured, use it (client-side email sending)
    if (EMAILJS_USER_ID && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && window.emailjs) {
        try {
            if (!_emailjs_initialized) { emailjs.init(EMAILJS_USER_ID); _emailjs_initialized = true; }
            const templateParams = {
                answer: payload.answer,
                page: payload.url,
                user_agent: payload.userAgent,
                timestamp: payload.ts
            };
            // include public key as 4th arg for compatibility
            return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_USER_ID)
                .then(() => ({ ok: true }))
                .catch(err => {
                    console.error('EmailJS error', err);
                    // show brief in-page message for user
                    try { showTempMessage('Wysłanie e-maila nie powiodło się.'); } catch (e) {}
                    // attempt to log more details if available
                    if (err && err.status) console.error('EmailJS status:', err.status);
                    throw err;
                });
        } catch (e) {
            console.error('EmailJS exception', e);
            try { showTempMessage('Błąd EmailJS. Sprawdź konsolę.'); } catch (e) {}
        }
    }

    // Fallback: POST to a webhook endpoint if provided
    if (NOTIFICATION_ENDPOINT) {
        return fetch(NOTIFICATION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => r.ok ? r : Promise.reject(r)).catch(err => {
            console.error('Notification error', err);
            throw err;
        });
    }

    // Nothing configured: log and resolve
    console.log('Notification (not sent, set EMAILJS_* or NOTIFICATION_ENDPOINT):', payload);
    return Promise.resolve({ ok: false, reason: 'NO_CONFIG' });
}

function showTempMessage(text, timeout = 1800) {
    const m = document.createElement('div');
    m.textContent = text;
    m.style.position = 'fixed';
    m.style.left = '50%';
    m.style.top = '18%';
    m.style.transform = 'translateX(-50%)';
    m.style.background = 'rgba(0,0,0,0.7)';
    m.style.color = 'white';
    m.style.padding = '10px 16px';
    m.style.borderRadius = '12px';
    m.style.zIndex = 10000;
    m.style.fontFamily = 'Poppins, sans-serif';
    m.style.fontSize = '16px';
    document.body.appendChild(m);
    setTimeout(() => { m.style.transition = 'opacity 300ms'; m.style.opacity = '0'; }, timeout - 250);
    setTimeout(() => { if (m.parentElement) m.parentElement.removeChild(m); }, timeout + 150);
}

function answerYes() {
    document.body.innerHTML = `
        <div class="screen active gif-screen">
            <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;">
                <h1 style="color:white;font-size:36px;text-align:center;margin:0;padding:10px;font-family:Poppins;"></h1>
                <img src="https://media.tenor.com/DpJdyKQKgYkAAAAi/cat-jump.gif" alt="celebration gif" />
            </div>
        </div>
    `;
    // send notification (best-effort)
    try { sendNotification('yes'); } catch (e) { /* ignore */ }

    // start confetti after rendering the new content (longer - 30s)
    // slight timeout ensures layout is ready
    setTimeout(() => startConfetti(30000, 220), 50);
}

function moveButton() {
    const button = document.querySelector(".no-btn");

    // viewport measurements (exclude scrollbars)
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const padding = 12; // margin from edges

    const btnW = button.offsetWidth;
    const btnH = button.offsetHeight;

    const maxX = Math.max(0, vw - btnW - padding);
    const maxY = Math.max(0, vh - btnH - padding);

    let x = maxX > 0 ? Math.floor(Math.random() * maxX) + Math.round(padding / 2) : Math.round(padding / 2);
    let y = maxY > 0 ? Math.floor(Math.random() * maxY) + Math.round(padding / 2) : Math.round(padding / 2);

    const rect = button.getBoundingClientRect();
    // Avoid tiny movements by nudging away from current position, but clamp to bounds
    if (Math.abs(rect.left - x) < 60) {
        const candidate = rect.left + (rect.left + 60 + btnW > vw ? -80 : 80);
        x = Math.max(Math.round(padding / 2), Math.min(candidate, maxX));
    }
    if (Math.abs(rect.top - y) < 60) {
        const candidate = rect.top + (rect.top + 60 + btnH > vh ? -80 : 80);
        y = Math.max(Math.round(padding / 2), Math.min(candidate, maxY));
    }

    button.style.position = "fixed";
    button.style.left = x + "px";
    button.style.top = y + "px";
}

// Touch fallback for mobile devices: move the button on touch
document.addEventListener('DOMContentLoaded', () => {
    const noBtn = document.querySelector('.no-btn');
    if (!noBtn) return;

    noBtn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        moveButton();
    }, { passive: false });

    // if user actually manages to click the 'No' button, send a notification
    noBtn.addEventListener('click', function (e) {
        e.preventDefault();
        // notify and show a brief acknowledgement
        sendNotification('no').catch(() => {});
        showTempMessage('Zapisano odpowiedź: Nie 😜');
    });
    // Initialize EmailJS early if available
    if (EMAILJS_USER_ID && window.emailjs && !_emailjs_initialized) {
        try { emailjs.init(EMAILJS_USER_ID); _emailjs_initialized = true; }
        catch (e) { console.warn('EmailJS init failed', e); }
    }
});

// --- Confetti animation ---
function startConfetti(duration = 6000, particleCount = 120) {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W = canvas.width = document.documentElement.clientWidth;
    let H = canvas.height = document.documentElement.clientHeight;

    const colors = ['#ff4d6d', '#ff758f', '#ff8fb4', '#ffd36e', '#ffd1e6', '#ff6f91'];

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * W,
            y: Math.random() * -H, // start above the viewport
            w: 6 + Math.random() * 10,
            h: 8 + Math.random() * 10,
            vx: (Math.random() - 0.5) * 6,
            vy: 2 + Math.random() * 6,
            rot: Math.random() * 360,
            vrot: (Math.random() - 0.5) * 10,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    let rafId = null;
    const start = performance.now();

    function resize() {
        W = canvas.width = document.documentElement.clientWidth;
        H = canvas.height = document.documentElement.clientHeight;
    }

    window.addEventListener('resize', resize);

    function draw(now) {
        ctx.clearRect(0, 0, W, H);
        const t = now - start;

        for (let p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12; // gravity
            p.rot += p.vrot;

            // draw rectangle rotated
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();

            // recycle if out of view
            if (p.y > H + 20 || p.x < -50 || p.x > W + 50) {
                p.x = Math.random() * W;
                p.y = -20 - Math.random() * H * 0.3;
                p.vx = (Math.random() - 0.5) * 6;
                p.vy = 2 + Math.random() * 6;
            }
        }

        if (t < duration) {
            rafId = requestAnimationFrame(draw);
        } else {
            stopConfetti();
        }
    }

    rafId = requestAnimationFrame(draw);

    // store references so we can stop later
    canvas._confetti = { rafId, resizeHandler: resize };
    return canvas;
}

function stopConfetti() {
    const canvas = document.querySelector('.confetti-canvas');
    if (!canvas) return;
    const data = canvas._confetti || {};
    if (data.rafId) cancelAnimationFrame(data.rafId);
    if (data.resizeHandler) window.removeEventListener('resize', data.resizeHandler);
    canvas.parentElement.removeChild(canvas);
}

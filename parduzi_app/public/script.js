// --- INITIALISATION DES PADS DE SIGNATURE ---
const canvasClient = document.getElementById('sigClient');
const canvasTech = document.getElementById('sigTech');

// Fonction pour redimensionner les canvas (Indispensable pour la netteté sur mobile)
function resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}

// On redimensionne au chargement et si on tourne l'écran
window.addEventListener("resize", () => {
    resizeCanvas(canvasClient);
    resizeCanvas(canvasTech);
});
resizeCanvas(canvasClient);
resizeCanvas(canvasTech);

const padClient = new SignaturePad(canvasClient, { penColor: 'black' });
const padTech = new SignaturePad(canvasTech, { penColor: 'black' });

function clearPad(who) {
    if(who === 'client') padClient.clear();
    else padTech.clear();
}

// --- FONCTION GÉOLOCALISATION ---
function getGPS() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ lat: 0, lng: 0 });
        } else {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => {
                    console.warn("GPS non disponible:", err);
                    resolve({ lat: 0, lng: 0 }); // On continue même sans GPS
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    });
}

// --- SOUMISSION DU FORMULAIRE ---
document.getElementById('quitusForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page
    
    // Validation basique
    if (padClient.isEmpty() || padTech.isEmpty()) {
        alert("⚠️ Les deux signatures sont obligatoires pour valider.");
        return;
    }

    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const statusDiv = document.getElementById('statusMessage');

    // Feedback visuel (Chargement)
    btn.disabled = true;
    btnText.textContent = "🛰️ Acquisition GPS & Sécurisation...";
    statusDiv.classList.add('hidden');

    try {
        // 1. Récupération GPS
        const gpsCoords = await getGPS();

        // 2. Construction de l'objet à envoyer
        const payload = {
            // C'est ici qu'on récupère le choix du bailleur fait dans ton HTML
            templateId: document.getElementById('templateSelector').value,

            numeroBon: document.getElementById('numeroBon').value,
            dateInter: document.getElementById('dateInter').value,
            clientName: document.getElementById('clientName').value,
            address: document.getElementById('address').value,
            object: document.getElementById('object').value,
            observations: document.getElementById('observations').value,
            
            // Les images en base64
            signatureClient: padClient.toDataURL(),
            signatureTech: padTech.toDataURL(),
            
            // Les métadonnées de preuve
            gps: gpsCoords,
            timestamp: new Date().toLocaleString('fr-FR')
        };

        // 3. Envoi au serveur Node.js
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            statusDiv.className = "success";
            statusDiv.innerHTML = `
                ✅ <strong>Quitus généré avec succès !</strong><br>
                Fichier : ${result.filename}<br>
                <small>Preuve Hash SHA-256 : ${result.hash.substring(0, 15)}...</small>
            `;
            // Reset du formulaire
            padClient.clear();
            padTech.clear();
            document.getElementById('quitusForm').reset();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        statusDiv.className = "error";
        statusDiv.innerHTML = `❌ Erreur : ${error.message}`;
    } finally {
        btn.disabled = false;
        btnText.textContent = "🔒 Sceller & Envoyer le Quitus";
        statusDiv.classList.remove('hidden');
    }
});
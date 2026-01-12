// Initialisation des Pads de signature
const canvasClient = document.getElementById('sigClient');
const canvasTech = document.getElementById('sigTech');

// Fonction pour redimensionner correctement les canvas (Indispensable sur mobile)
function resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}

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

// Fonction Géolocalisation
function getGPS() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            resolve({ lat: 0, lng: 0 }); // Fallback si pas de GPS
        } else {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => {
                    console.warn("GPS Erreur:", err);
                    resolve({ lat: 0, lng: 0 }); // On ne bloque pas l'app si GPS échoue
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    });
}

// Soumission du formulaire
document.getElementById('quitusForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (padClient.isEmpty() || padTech.isEmpty()) {
        alert("⚠️ Les deux signatures sont obligatoires.");
        return;
    }

    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const statusDiv = document.getElementById('statusMessage');

    // UI Loading
    btn.disabled = true;
    btnText.textContent = "🛰️ Acquisition GPS & Sécurisation...";

    try {
        // 1. Récupération GPS
        const gpsCoords = await getGPS();

        // 2. Préparation des données
        const payload = {
            numeroBon: document.getElementById('numeroBon').value,
            dateInter: document.getElementById('dateInter').value,
            clientName: document.getElementById('clientName').value,
            address: document.getElementById('address').value,
            object: document.getElementById('object').value,
            observations: document.getElementById('observations').value,
            signatureClient: padClient.toDataURL(),
            signatureTech: padTech.toDataURL(),
            gps: gpsCoords,
            timestamp: new Date().toLocaleString('fr-FR')
        };

        // 3. Envoi au serveur
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            statusDiv.className = "success";
            statusDiv.innerHTML = `✅ <strong>Succès !</strong><br>Quitus généré : ${result.filename}<br><small>Hash: ${result.hash}</small>`;
            // Reset
            padClient.clear();
            padTech.clear();
            document.getElementById('quitusForm').reset();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        statusDiv.className = "error";
        statusDiv.textContent = "Erreur : " + error.message;
    } finally {
        btn.disabled = false;
        btnText.textContent = "🔒 Sceller & Envoyer le Quitus";
        statusDiv.classList.remove('hidden');
    }
});
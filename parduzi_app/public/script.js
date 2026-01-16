// --- INITIALISATION SIGNATURES ---
const canvasClient = document.getElementById('sigClient');
const canvasTech = document.getElementById('sigTech');

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

// --- GPS ---
function getGPS() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ lat: 0, lng: 0 });
        } else {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => { resolve({ lat: 0, lng: 0 }); },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    });
}

// --- ENVOI ---
document.getElementById('quitusForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (padClient.isEmpty() || padTech.isEmpty()) {
        alert("⚠️ Signatures manquantes !");
        return;
    }

    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const statusDiv = document.getElementById('statusMessage');

    btn.disabled = true;
    btnText.textContent = "⏳ Envoi en cours...";
    statusDiv.classList.add('hidden');

    try {
        const gpsCoords = await getGPS();

        const payload = {
            // On récupère le bailleur sélectionné
            selectedBailleur: document.getElementById('bailleurSelect').value,
            
            // On récupère le numéro interne
            internalNum: document.getElementById('internalNum').value,
            
            // Le numéro de bon (peut être vide)
            numeroBon: document.getElementById('numeroBon').value,
            
            clientName: document.getElementById('clientName').value,
            clientEmail: document.getElementById('clientEmail').value,
            
            address: document.getElementById('address').value,
            batiment: document.getElementById('batiment').value,
            logement: document.getElementById('logement').value,
            etage: document.getElementById('etage').value,

            object: document.getElementById('object').value,
            observations: document.getElementById('observations').value,
            
            signatureClient: padClient.toDataURL(),
            signatureTech: padTech.toDataURL(),
            gps: gpsCoords
        };

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            statusDiv.className = "success";
            statusDiv.innerHTML = `✅ <strong>Envoyé !</strong><br>Email parti à contact@parduzi.fr`;
            padClient.clear();
            padTech.clear();
            document.getElementById('quitusForm').reset();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        statusDiv.className = "error";
        statusDiv.textContent = `❌ Erreur : ${error.message}`;
    } finally {
        btn.disabled = false;
        btnText.textContent = "📨 Envoyer le Quitus";
        statusDiv.classList.remove('hidden');
    }
});
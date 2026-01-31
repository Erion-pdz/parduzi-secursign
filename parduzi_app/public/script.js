// --- INITIALISATION SIGNATURES ---
const canvasClient = document.getElementById('sigClient');
const canvasTech = document.getElementById('sigTech');
const modalCanvas = document.getElementById('modalCanvas');

let currentSignatureType = null; // 'client' ou 'tech'
let modalPad = null;

function resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}

// Initialiser les canvas cachés
canvasClient.width = 400;
canvasClient.height = 200;
canvasTech.width = 400;
canvasTech.height = 200;

const padClient = new SignaturePad(canvasClient, { penColor: 'black' });
const padTech = new SignaturePad(canvasTech, { penColor: 'black' });

// --- MODAL ---
function openSignatureModal(type) {
    currentSignatureType = type;
    const modal = document.getElementById('signatureModal');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = type === 'client' ? 'Signature Locataire / Client' : 'Signature Technicien';
    modal.style.display = 'block';
    
    // Initialiser le canvas modal
    setTimeout(() => {
        resizeCanvas(modalCanvas);
        modalPad = new SignaturePad(modalCanvas, { 
            penColor: 'black',
            minWidth: 1,
            maxWidth: 3
        });
        
        // Charger la signature existante si elle existe
        const existingPad = type === 'client' ? padClient : padTech;
        if (!existingPad.isEmpty()) {
            const data = existingPad.toDataURL();
            modalPad.fromDataURL(data);
        }
    }, 100);
}

function closeSignatureModal() {
    const modal = document.getElementById('signatureModal');
    modal.style.display = 'none';
    if (modalPad) {
        modalPad.clear();
        modalPad = null;
    }
    currentSignatureType = null;
}

function clearModalPad() {
    if (modalPad) {
        modalPad.clear();
    }
}

function saveSignature() {
    if (!modalPad || modalPad.isEmpty()) {
        alert('⚠️ Veuillez signer avant de valider !');
        return;
    }
    
    const signatureData = modalPad.toDataURL();
    
    if (currentSignatureType === 'client') {
        padClient.fromDataURL(signatureData);
        document.getElementById('btnSignClient').classList.add('signed');
        document.getElementById('statusClient').textContent = '✅ Signé';
    } else if (currentSignatureType === 'tech') {
        padTech.fromDataURL(signatureData);
        document.getElementById('btnSignTech').classList.add('signed');
        document.getElementById('statusTech').textContent = '✅ Signé';
    }
    
    closeSignatureModal();
}

// Fermer le modal en cliquant en dehors
window.onclick = function(event) {
    const modal = document.getElementById('signatureModal');
    if (event.target === modal) {
        closeSignatureModal();
    }
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
            selectedBailleur: document.getElementById('bailleurSelect').value,
            internalNum: document.getElementById('internalNum').value,
            numeroBon: document.getElementById('numeroBon').value,
            
            clientName: document.getElementById('clientName').value,
            
            address: document.getElementById('address').value,
            batiment: document.getElementById('batiment').value,
            logement: document.getElementById('logement').value,
            etage: document.getElementById('etage').value,

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
            
            // Réinitialiser les boutons
            document.getElementById('btnSignClient').classList.remove('signed');
            document.getElementById('statusClient').textContent = '✍️ Cliquer pour signer';
            document.getElementById('btnSignTech').classList.remove('signed');
            document.getElementById('statusTech').textContent = '✍️ Cliquer pour signer';
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
let sessionId = localStorage.getItem('sessionId') || '';
let playerLatitude = null;
let playerLongitude = null;

// Restore session if available
window.onload = () => {
    if (sessionId) {
        document.getElementById('sessionInfo').textContent = `Resumed session: ${sessionId}`;
    }
};

// Fetch available treasure hunts
async function fetchTreasureHunts() {
    try {
        const response = await fetch('https://codecyprus.org/th/api/list');
        const data = await response.json();
        displayTreasureHunts(data.treasureHunts);
    } catch (error) {
        console.error('Error fetching hunts:', error);
    }
}

// Display treasure hunts
function displayTreasureHunts(hunts) {
    const container = document.getElementById('treasureHuntList');
    container.innerHTML = '';
    hunts.forEach(hunt => {
        const huntItem = document.createElement('div');
        huntItem.innerHTML = `
                    <h3>${hunt.name}</h3>
                    <p>${hunt.description}</p>
                    <button onclick="prepareStart('${hunt.uuid}')">Select</button>
                `;
        container.appendChild(huntItem);
    });
}

// Start a selected treasure hunt
async function startHunt() {
    const playerName = document.getElementById('playerName').value;
    if (!playerName) return alert('Please enter your name!');
    if (!window.selectedHunt) return alert('Please select a treasure hunt!');

    try {
        const response = await fetch(`https://codecyprus.org/th/api/start?player=${playerName}&app=MyApp&treasure-hunt-id=${window.selectedHunt}`);
        const data = await response.json();
        if (data.status === 'OK') {
            sessionId = data.session;
            localStorage.setItem('sessionId', sessionId);
            document.getElementById('sessionInfo').textContent = `Session started: ${sessionId}`;
        } else {
            alert('Error starting session: ' + data.errorMessages);
        }
    } catch (error) {
        console.error('Error starting hunt:', error);
    }
}

function prepareStart(uuid) {
    window.selectedHunt = uuid;
    alert(`Selected Hunt: ${uuid}`);
}

// Fetch current question
async function fetchQuestion() {
    if (!sessionId) return alert('Start a session first!');
    try {
        const response = await fetch(`https://codecyprus.org/th/api/question?session=${sessionId}`);
        const data = await response.json();
        document.getElementById('questionArea').textContent = data.questionText || 'No question available.';
    } catch (error) {
        console.error('Error fetching question:', error);
    }
}

// Submit an answer
async function submitAnswer() {
    if (!sessionId) return alert('Start a session first!');
    const answer = document.getElementById('answerInput').value;
    try {
        const response = await fetch(`https://codecyprus.org/th/api/answer?session=${sessionId}&answer=${encodeURIComponent(answer)}`);
        const data = await response.json();
        document.getElementById('answerFeedback').textContent = data.correct ? 'Correct!' : 'Wrong, try again!';
    } catch (error) {
        console.error('Error submitting answer:', error);
    }
}

// Check progress
async function checkProgress() {
    if (!sessionId) return alert('Start a session first!');
    try {
        const response = await fetch(`https://codecyprus.org/th/api/progress?session=${sessionId}`);
        const data = await response.json();
        document.getElementById('progressInfo').textContent = `Completed: ${data.completed}/${data.total}`;
    } catch (error) {
        console.error('Error checking progress:', error);
    }
}

// Geolocation: Get current location
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Show position: This function is called when the geolocation is fetched successfully
function showPosition(position) {
    playerLatitude = position.coords.latitude;
    playerLongitude = position.coords.longitude;

    document.getElementById("geolocation-status").innerHTML = `
                <p>Latitude: ${playerLatitude}</p>
                <p>Longitude: ${playerLongitude}</p>
            `;
}

// Handle errors in geolocation
function showError(error) {
    let message = '';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            message = "The request to get user location timed out.";
            break;
        case error.UNKNOWN_ERROR:
            message = "An unknown error occurred.";
            break;
    }
    document.getElementById("geolocation-status").innerHTML = `<p>Error: ${message}</p>`;
}
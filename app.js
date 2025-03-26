// Global variables
let currentSession = null;
let currentQuestion = null;

// API Base URL
const API_BASE = 'https://codecyprus.org/th/api';

document.getElementById('usernameForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    setCookie('username', username, 365);
    document.getElementById("welcome").style.display = "none";
    document.getElementById("huntSelection").classList.remove("hidden");
    await fetchTreasureHunts();
});

// 2. Fetch available treasure hunts
async function fetchTreasureHunts() {
    try {
        const response = await fetch(`${API_BASE}/list`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        if (data.status === "OK") {
            displayHunts(data.treasureHunts);
        } else {
            alert("Error fetching hunts: " + data.errorMessages);
        }
    } catch (error) {
        alert("Failed to connect to server: " + error);
    }
}

// 3. Display available hunts
function displayHunts(hunts) {
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('huntSelection').classList.remove('hidden');
    document.getElementById('huntsList').innerHTML = '';

    hunts.forEach(hunt => {
        const huntElement = document.createElement('div');
        huntElement.className = 'hunt';
        huntElement.innerHTML = `
            <h3>${hunt.name}</h3>
            <p>Starts: ${new Date(hunt.startsOn).toLocaleString()}</p>
            <p>Ends: ${new Date(hunt.endsOn).toLocaleString()}</p>
            <button onclick="startHunt('${hunt.uuid}')">Start Hunt</button>
        `;
        document.getElementById('huntsList').appendChild(huntElement);
    });
}

// 4. Start a treasure hunt
async function startHunt(huntId) {
    const username = getCookie('username');
    document.getElementById("huntSelection").style.display = "none";
    document.getElementById("mainTreasureHunt").classList.remove("hidden");
    document.getElementById("scannerButton").classList.remove("hidden");
    document.getElementById("scannerContainer").classList.remove("hidden");
    if (!username) {
        alert("Username is not set. Please enter your username.");
        return;
    }
    const params = new URLSearchParams({
        player: username,
        app: 'team-f-treasure-hunt',
        'treasure-hunt-id': huntId
    });

    try {
        const response = await fetch(`${API_BASE}/start?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        if (data.status === "OK") {
            currentSession = data.session;
            document.getElementById('totalQuestions').textContent = data.numOfQuestions;
            await fetchQuestion();
        } else {
            alert("Error starting hunt: " + data.errorMessages);
        }
    } catch (error) {
        alert("Failed to start hunt: " + error);
    }
}

// 5. Fetch current question
async function fetchQuestion() {
    const params = new URLSearchParams({ session: currentSession });
    try {
        const response = await fetch(`${API_BASE}/question?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        if (data.status === "OK") {
            currentQuestion = data;

            // If question requires location, get and send it
            if (data.requiresLocation) {
                try {
                    const position = await getLocation();
                    await sendLocation(position.coords.latitude, position.coords.longitude);
                } catch (error) {
                    console.error("Error getting/sending location:", error);
                    alert("This question requires your location, but we couldn't access it. Please enable location services.");
                }
            }

            displayQuestion(data);
        } else {
            alert("Error fetching question: " + data.errorMessages);
        }
    } catch (error) {
        alert("Failed to fetch question: " + error);
    }
}

// 6. Display question
function displayQuestion(question) {
    document.getElementById('questionText').innerHTML = question.questionText;
    document.getElementById('currentQuestion').textContent = question.currentQuestionIndex + 1;
    const answerOptions = document.getElementById('answerOptions');
    answerOptions.innerHTML = '';

    switch(question.questionType) {
        case 'BOOLEAN':
            answerOptions.innerHTML = `
                <button class="answerOptions" onclick="submitAnswer('true')">True</button>
                <button class="answerOptions" onclick="submitAnswer('false')">False</button>
            `;
            break;
        case 'MCQ':
            answerOptions.innerHTML = `
                <button class="answerOptions" onclick="submitAnswer('A')">A</button>
                <button class="answerOptions" onclick="submitAnswer('B')">B</button>
                <button class="answerOptions" onclick="submitAnswer('C')">C</button>
                <button class="answerOptions" onclick="submitAnswer('D')">D</button>
            `;
            break;
        case 'TEXT':
            answerOptions.innerHTML = `
                <input class="answer-option-input" type="text" id="text-answer" placeholder="Enter your answer">
                <button class="answerOptions" onclick="submitAnswer(document.getElementById('text-answer').value)">Submit</button>
            `;
            break;
        case 'INTEGER':
        case 'NUMERIC':
            answerOptions.innerHTML = `
                <input class="answer-option-input" type="number" id="numeric-answer" placeholder="Enter number">
                <button class="answerOptions" onclick="submitAnswer(document.getElementById('numeric-answer').value)">Submit</button>
            `;
            break;
    }
}

// 7. Submit answer
async function submitAnswer(answer) {
    // If question requires location, verify we have it first
    if (currentQuestion.requiresLocation) {
        try {
            const position = await getLocation();
            await sendLocation(position.coords.latitude, position.coords.longitude);
        } catch (error) {
            alert("This question requires your location. Please enable location services and try again.");
            return; // Don't submit answer if we can't get location
        }
    }

    const params = new URLSearchParams({ session: currentSession, answer });
    try {
        const response = await fetch(`${API_BASE}/answer?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        if (data.status === "OK") {
            if (data.completed) {
                showResults();
            } else {
                await fetchQuestion();
            }
        } else {
            alert("Error submitting answer: " + data.errorMessages);
        }
    } catch (error) {
        alert("Failed to submit answer: " + error);
    }
}

document.getElementById('skipButton').addEventListener('click', async function() {
    const params = new URLSearchParams({ session: currentSession });
    try {
        const response = await fetch(`${API_BASE}/skip?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        if (data.status === "OK") {
            if (data.completed) {
                showResults();
            } else {
                await fetchQuestion();
            }
        } else {
            alert("Error skipping question: " + data.errorMessages);
        }
    } catch (error) {
        alert("Failed to skip question: " + error);
    }
});

async function showResults() {
    const params = new URLSearchParams({ session: currentSession });
    document.getElementById("mainTreasureHunt").style.display = "none";
    document.getElementById("resultsScreen").classList.remove("hidden");

    try {
        // Get final score
        const scoreResponse = await fetch(`${API_BASE}/score?${params}`);
        if (!scoreResponse.ok) throw new Error(`HTTP error! Status: ${scoreResponse.status}`);
        const scoreData = await scoreResponse.json();

        if (scoreData.status === "OK") {
            document.getElementById('finalScore').textContent = scoreData.score;

            // Automatically fetch and display leaderboard
            const lbParams = new URLSearchParams({
                session: currentSession,
                sorted: true,
                limit: 10
            });

            const lbResponse = await fetch(`${API_BASE}/leaderboard?${lbParams}`);
            if (!lbResponse.ok) throw new Error(`HTTP error! Status: ${lbResponse.status}`);
            const lbData = await lbResponse.json();

            if (lbData.status === "OK") {
                displayLeaderboard(lbData.leaderboard);
            }
        } else {
            alert("Error getting results: " + scoreData.errorMessages);
        }
    } catch (error) {
        alert("Failed to get results: " + error);
    }
}

function displayLeaderboard(leaderboard) {
    const leaderboardBody = document.getElementById('leaderboardBody');
    leaderboardBody.innerHTML = '';

    leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');

        // Highlight current player's row
        const currentUsername = getCookie('username');
        if (entry.player === currentUsername) {
            row.style.fontWeight = 'bold';
            row.style.backgroundColor = '#e6f7ff';
        }

        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;

        const playerCell = document.createElement('td');
        playerCell.textContent = entry.player;

        const scoreCell = document.createElement('td');
        scoreCell.textContent = entry.score;

        row.appendChild(rankCell);
        row.appendChild(playerCell);
        row.appendChild(scoreCell);

        leaderboardBody.appendChild(row);
    });
}

function getCookie(cookieName) {
    const name = cookieName + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function getLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => resolve(position),
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            reject(new Error("Geolocation is not supported by this browser."));
        }
    });
}

async function sendLocation(latitude, longitude) {
    const params = new URLSearchParams({
        session: currentSession,
        latitude ,
        longitude
    });

    try {
        const response = await fetch(`${API_BASE}/location?${params}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        if (data.status !== "OK") {
            console.error("Location error:", data.errorMessages);
        }
    } catch (error) {
        console.error("Failed to send location:", error);
    }
}

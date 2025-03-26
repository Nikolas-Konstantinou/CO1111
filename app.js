const API = 'https://codecyprus.org/th/api';

document.getElementById('usernameForm').addEventListener('submit', async function()
{
    const username = document.getElementById('username').value;
    setCookie('username', username, 365);
    document.getElementById("welcome").style.display = "none";
    document.getElementById("huntSelection").classList.remove("hidden");
    await fetchTreasureHunts();
});

//Function to fetch the available treasure hunts from the API list
async function fetchTreasureHunts()
{
    const response = await fetch(`${API}/list`);
    const data = await response.json();
    if (data.status === "OK")
    {
        displayHunts(data.treasureHunts);
    }
    else
    {
        alert("Error fetching hunts: " + data.errorMessages);
    }
}

//Function to display the available treasure hunts received from the API
function displayHunts(hunts)
{
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('huntSelection').classList.remove('hidden');

    hunts.forEach(hunt =>
    {
        const huntElement = document.createElement('div');
        huntElement.className = 'hunt';
        huntElement.innerHTML =
        `
            <h3>${hunt.name}</h3>
            <p>Starts: ${new Date(hunt.startsOn).toLocaleString()}</p>
            <p>Ends: ${new Date(hunt.endsOn).toLocaleString()}</p>
            <button onclick="startHunt('${hunt.uuid}')">Start Hunt</button>
        `;
        document.getElementById('huntsList').appendChild(huntElement);
    });
}

//Function to begin the treasure hunt by hiding the previous elements and fetching the questions from the API
async function startHunt(huntId)
{
    const username = getCookie('username');
    document.getElementById("huntSelection").style.display = "none";
    document.getElementById("mainTreasureHunt").classList.remove("hidden");
    document.getElementById("scannerButton").classList.remove("hidden");
    document.getElementById("scannerContainer").classList.remove("hidden");

    const params = new URLSearchParams({
        player: username,
        app: 'team-f-treasure-hunt',
        'treasure-hunt-id': huntId
    });

    const response = await fetch(`${API}/start?${params}`);
    const data = await response.json();
    if (data.status === "OK")
    {
        currentSession = data.session;
        document.getElementById('totalQuestions').textContent = data.numOfQuestions;
        await fetchQuestion();
    }
    else
    {
        alert("Error starting hunt: " + data.errorMessages);
    }

}

// 5. Fetch current question
async function fetchQuestion()
{
    const params = new URLSearchParams({ session: currentSession });
    const response = await fetch(`${API}/question?${params}`);
    const data = await response.json();
    if (data.status === "OK")
    {
        currentQuestion = data;
        if (data.requiresLocation)
        {
            const position = await getLocation();
            await sendLocation(position.coords.latitude, position.coords.longitude);
        }
        displayQuestion(data);
    }
    else
    {
        alert("Error fetching question: " + data.errorMessages);
    }
}

// 6. Display question
function displayQuestion(question)
{
    document.getElementById('questionText').innerHTML = question.questionText;
    document.getElementById('currentQuestion').textContent = question.currentQuestionIndex + 1;
    const answerOptions = document.getElementById('answerOptions');

    switch(question.questionType)
    {
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

//Function that handles the submission of the player's answers
async function submitAnswer(answer)
{

    if (currentQuestion.requiresLocation)
    {
        const position = await getLocation();
        await sendLocation(position.coords.latitude, position.coords.longitude);
    }

    const params = new URLSearchParams({ session: currentSession, answer });
    const response = await fetch(`${API}/answer?${params}`);
    const data = await response.json();
    if (data.status === "OK")
    {
        if (data.completed)
        {
            showResults();
        }
        else
        {
            await fetchQuestion();
        }
    }
    else
    {
        alert("Error submitting answer: " + data.errorMessages);
    }
}

//Function that handles skipping questions
document.getElementById('skipButton').addEventListener('click', async function()
{
    const params = new URLSearchParams({ session: currentSession });
    const response = await fetch(`${API}/skip?${params}`);
    const data = await response.json();
    if (data.status === "OK")
    {
        if (data.completed)
        {
            showResults();
        }
        else
        {
            await fetchQuestion();
        }
    }
    else
    {
        alert("Error skipping question: " + data.errorMessages);
    }
});

//Function responsible for printing out the result of the treasure hunt and the leaderboard
async function showResults()
{
    const params = new URLSearchParams({ session: currentSession });
    document.getElementById("mainTreasureHunt").style.display = "none";
    document.getElementById("resultsScreen").classList.remove("hidden");

    const scoreResponse = await fetch(`${API}/score?${params}`);
    const scoreData = await scoreResponse.json();
    if (scoreData.status === "OK")
    {
        document.getElementById('finalScore').textContent = scoreData.score;
        const lbParams = new URLSearchParams({
            session: currentSession,
            sorted: true,
            limit: 10
        });
        const lbResponse = await fetch(`${API}/leaderboard?${lbParams}`);
        const lbData = await lbResponse.json();
        if (lbData.status === "OK")
        {
            displayLeaderboard(lbData.leaderboard);
        }
    }
    else
    {
        alert("Error getting results: " + scoreData.errorMessages);
    }
}

//Function responsible for the display of the leaderboard
function displayLeaderboard(leaderboard)
{
    const leaderboardBody = document.getElementById('leaderboardBody');
    leaderboard.forEach((entry, index) =>
    {
        const row = document.createElement('tr');
        const currentUsername = getCookie('username');
        if (entry.player === currentUsername)
        {
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

//Function responsible for the gathering of cookies
function getCookie(cookieName)
{
    const name = cookieName + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++)
    {
        let c = ca[i];
        while (c.charAt(0) == ' ')
        {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0)
        {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

//Function responsible for location gathering
function getLocation()
{
    return new Promise((resolve, reject) =>
    {
        if (navigator.geolocation)
        {
            navigator.geolocation.getCurrentPosition(
                position => resolve(position),
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }
        else
        {
            reject(new Error("Geolocation is not supported by this browser."));
        }
    });
}

//Function that sends the location back to the API in case of a location sensitive question
async function sendLocation(latitude, longitude)
{
    const params = new URLSearchParams({
        session: currentSession,
        latitude ,
        longitude
    });
    const response = await fetch(`${API}/location?${params}`);
    const data = await response.json();
    if (data.status !== "OK")
    {
        console.error("Location error:", data.errorMessages);
    }
}

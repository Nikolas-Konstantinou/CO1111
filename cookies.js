function setCookie(cookieName, cookieValue, expireDays)
{
    let date = new Date();
    date.setTime(date.getTime() + (expireDays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + date.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
}

document.getElementById('usernameForm').addEventListener('submit', function(event)
{
    event.preventDefault();
    let username = document.getElementById('username').value;
    setCookie('username', username, 365);
});
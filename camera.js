function setupScanner()
{
    const opts = {
        continuous: true,
        video: document.getElementById('preview'),
        mirror: true,
        captureImage: false
    };
    const scanner = new Instascan.Scanner(opts);
    scanner.addListener('scan', function(content)
    {
        alert("Hint: " + content);
        const textInput = document.getElementById('text-answer');
        if (textInput)
        {
            textInput.value = content;
        }
    });

    return scanner;
}

let scanner = null;

document.getElementById('scannerButton').addEventListener('click', function()
{
    const container = document.getElementById('scannerContainer');
    container.style.display = 'block';
    if (!scanner)
    {
        scanner = setupScanner();
        Instascan.Camera.getCameras().then(function(cameras)
        {
            if (cameras.length > 0)
            {
                scanner.start(cameras[0]);
            }
            else
            {
                alert('No cameras found');
                container.style.display = 'none';
            }
        }).catch(function(e)
        {
            console.error(e);
            container.style.display = 'none';
        });
    }
});

document.getElementById('scannerClose').addEventListener('click', function()
{
    if (scanner)
    {
        scanner.stop();
    }
    document.getElementById('scannerContainer').style.display = 'none';
});
fetch('http://localhost:3000/create-video-with-audio', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        audioFile: 'public/audio/trimmed.mp3'
    })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
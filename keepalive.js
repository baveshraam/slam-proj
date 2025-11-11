// Keep backend awake by pinging every 10 minutes
setInterval(() => {
    if (window.BACKEND_URL && !window.BACKEND_URL.includes('localhost')) {
        fetch(`${window.BACKEND_URL}/health`)
            .then(res => console.log('Backend keepalive ping'))
            .catch(err => console.log('Backend sleeping'));
    }
}, 10 * 60 * 1000); // 10 minutes

// Also ping on page load
if (window.BACKEND_URL && !window.BACKEND_URL.includes('localhost')) {
    fetch(`${window.BACKEND_URL}/health`).catch(() => {});
}

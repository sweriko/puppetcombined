document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('process-form');
    const urlInput = document.getElementById('url');
    const statusDiv = document.getElementById('status');
    const screenshotResult = document.getElementById('screenshot-result');
    const screenshotImage = document.getElementById('screenshot-image');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const url = urlInput.value.trim();
        if (!url) {
            statusDiv.textContent = 'Please enter a valid URL.';
            screenshotResult.style.display = 'none';
            return;
        }

        statusDiv.textContent = 'Processing...';
        screenshotResult.style.display = 'none';
        screenshotImage.src = '';
        screenshotImage.alt = 'Screenshot will appear here';

        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (data.success) {
                statusDiv.textContent = 'Processing completed successfully!';
                screenshotImage.src = data.screenshotUrl;
                screenshotImage.alt = 'Screenshot';
                screenshotResult.style.display = 'block';
            } else {
                statusDiv.textContent = `Error: ${data.message}`;
                screenshotResult.style.display = 'none';
            }
        } catch (error) {
            console.error('Error:', error);
            statusDiv.textContent = 'An error occurred while processing your request.';
            screenshotResult.style.display = 'none';
        }
    });
});

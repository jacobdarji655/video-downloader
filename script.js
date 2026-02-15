// Update this with your Render URL after deployment
const BACKEND_URL = "http://127.0.0.1:8000"; // Will change to https://your-app.onrender.com later

document.getElementById('get-info').addEventListener('click', getVideoInfo);
document.getElementById('download-video-btn').addEventListener('click', downloadVideo);
document.getElementById('download-mp3-btn').addEventListener('click', downloadMP3);

// Also allow Enter key in input
document.getElementById('video-url').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getVideoInfo();
    }
});

async function getVideoInfo() {
    const url = document.getElementById('video-url').value.trim();
    
    if (!url) {
        showError('Please paste a video URL');
        return;
    }
    
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('video-preview').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    try {
        const response = await fetch(`${BACKEND_URL}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get video info');
        }
        
        const data = await response.json();
        displayVideoInfo(data);
        
    } catch (error) {
        showError(error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayVideoInfo(data) {
    document.getElementById('video-thumbnail').src = data.thumbnail;
    document.getElementById('video-title').textContent = data.title;
    document.getElementById('video-uploader').textContent = `Uploader: ${data.uploader || 'Unknown'}`;
    
    if (data.duration) {
        const minutes = Math.floor(data.duration / 60);
        const seconds = data.duration % 60;
        document.getElementById('video-duration').textContent = `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Populate format options
    const formatSelect = document.getElementById('format-options');
    formatSelect.innerHTML = '';
    
    // Filter for video formats
    const videoFormats = data.formats.filter(f => f.format_note && f.filesize);
    
    if (videoFormats.length > 0) {
        videoFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.format_id;
            
            let filesize = '';
            if (format.filesize) {
                const sizeInMB = (format.filesize / (1024 * 1024)).toFixed(2);
                filesize = ` (${sizeInMB} MB)`;
            }
            
            option.textContent = `${format.format_note} - ${format.ext}${filesize}`;
            formatSelect.appendChild(option);
        });
    } else {
        // If no filtered formats, show all available
        data.formats.forEach(format => {
            if (format.format_note && format.format_note !== 'audio only') {
                const option = document.createElement('option');
                option.value = format.format_id;
                option.textContent = `${format.format_note || format.format_id} - ${format.ext}`;
                formatSelect.appendChild(option);
            }
        });
    }
    
    document.getElementById('video-preview').style.display = 'block';
}

function downloadVideo() {
    const url = document.getElementById('video-url').value.trim();
    const formatId = document.getElementById('format-options').value;
    
    if (!url || !formatId) {
        showError('Please select a format');
        return;
    }
    
    document.getElementById('downloading').style.display = 'block';
    
    // Create download link
    const downloadUrl = `${BACKEND_URL}/download?url=${encodeURIComponent(url)}&format_id=${formatId}`;
    window.location.href = downloadUrl;
    
    // Hide downloading message after 3 seconds
    setTimeout(() => {
        document.getElementById('downloading').style.display = 'none';
    }, 3000);
}

function downloadMP3() {
    const url = document.getElementById('video-url').value.trim();
    
    if (!url) {
        showError('Please enter a URL');
        return;
    }
    
    document.getElementById('downloading').style.display = 'block';
    
    const downloadUrl = `${BACKEND_URL}/download-mp3?url=${encodeURIComponent(url)}`;
    window.location.href = downloadUrl;
    
    setTimeout(() => {
        document.getElementById('downloading').style.display = 'none';
    }, 3000);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
}
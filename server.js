import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import PuppeteerController from './controllers/puppeteerController.js';
import validator from 'validator';

const { isURL } = validator;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const USER_DATA_DIR = process.env.USER_DATA_DIR || './puppeteer_data';

const puppeteerController = new PuppeteerController({ userDataDir: USER_DATA_DIR });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

// Initialize Puppeteer
puppeteerController.init().catch(error => {
    console.error('Failed to initialize Puppeteer:', error);
    process.exit(1);
});

app.post('/api/process', async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || !isURL(url, { protocols: ['http','https'], require_protocol: true })) {
        return res.status(400).json({ success: false, message: 'Invalid URL provided.' });
    }

    try {
        let screenshotUrl;
        if (url.includes('twitter.com') || url.includes('x.com')) {
            screenshotUrl = await puppeteerController.takeTwitterScreenshot(url);
        } else {
            screenshotUrl = await puppeteerController.searchWithImage(url);
        }

        return res.status(200).json({ success: true, screenshotUrl });
    } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Start screen recording
app.post('/api/start-recording', (req, res) => {
    puppeteerController.startScreenRecording();
    return res.status(200).json({ success: true, message: 'Screen recording started.' });
});

// Stop screen recording
app.post('/api/stop-recording', (req, res) => {
    puppeteerController.stopScreenRecording();
    return res.status(200).json({ success: true, message: 'Screen recording stopped.' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const gracefulShutdown = () => {
    console.log('\nShutting down gracefully...');
    puppeteerController.close().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error during shutdown:', error);
        process.exit(1);
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

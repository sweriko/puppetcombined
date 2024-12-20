import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// For __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

class PuppeteerController {
    constructor(options) {
        this.userDataDir = options.userDataDir;
        this.browser = null;
        this.page = null;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized'
            ],
            userDataDir: this.userDataDir
        });

        const context = this.browser.defaultBrowserContext();

        // For Google Lens, we want to allow clipboard permissions
        await context.overridePermissions('https://lens.google.com', [
            'clipboard-read',
            'clipboard-write',
        ]);

        const pages = await this.browser.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });

        // Set a user-agent to mimic a real browser
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

        console.log('Puppeteer initialized. If using Twitter functionality, please ensure you are logged into your X (Twitter) account.');
        console.log('If not logged in, please manually log in through the opened browser window (which should have appeared).');

        try {
            // Attempt to visit Twitter home to ensure login (not mandatory if you only do image tasks)
            await this.waitForLogin();
            console.log('Twitter login is detected. Ready to process both Twitter and image URLs.');
        } catch (err) {
            console.log('Twitter login not detected. You can still process image URLs. If you need Twitter screenshots, please log in manually.');
        }
    }

    async waitForLogin(timeout = 60000) {
        console.log('Attempting to verify Twitter login...');
        await this.page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
        await this.page.waitForSelector('div[data-testid="primaryColumn"]', { timeout });
        console.log('Twitter login confirmed.');
    }

    /**
     * Takes a screenshot of a Twitter URL.
     * @param {string} url - The Twitter URL to screenshot.
     * @returns {Promise<string>} - The path to the saved screenshot.
     */
    async takeTwitterScreenshot(url) {
        console.log(`Processing Twitter URL: ${url}`);

        const newPage = await this.browser.newPage();
        await newPage.setViewport({ width: 1920, height: 1080 });
        await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
        await newPage.goto(url, { waitUntil: 'networkidle2' });

        // Wait a bit for the page to stabilize
        await new Promise((resolve) => setTimeout(resolve, 3000));


        const screenshotsDir = path.join(__dirname, '..', 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir);
        }

        const filename = `screenshot_twitter_${Date.now()}.png`;
        const filepath = path.join(screenshotsDir, filename);
        await newPage.screenshot({ path: filepath, fullPage: false });
        await newPage.close();

        console.log(`Twitter screenshot saved as ${filename}`);
        return `/screenshots/${filename}`;
    }

    /**
     * Searches an image on Google Lens by copying it from a given image URL.
     * @param {string} imageUrl - The URL of the image to copy and search.
     * @returns {Promise<string>} - The path to the saved screenshot.
     */
    async searchWithImage(imageUrl) {
        console.log(`Processing image URL for Google Lens: ${imageUrl}`);

        // Open the image URL in a new tab
        const imagePage = await this.browser.newPage();
        await imagePage.goto(imageUrl, { waitUntil: 'networkidle2' });

        // Ensure the page has focus, then copy the image (Ctrl+C)
        await imagePage.click('body');
        await imagePage.keyboard.down('Control');
        await imagePage.keyboard.press('C');
        await imagePage.keyboard.up('Control');
        console.log('Image copied to clipboard.');

        await imagePage.close();

        // Open Google Lens
        await this.page.goto('https://lens.google.com/search?p', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 200));

        // Paste the image (Ctrl+V)
        await this.page.click('body');
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('V');
        await this.page.keyboard.up('Control');
        console.log('Image pasted into Google Lens. Waiting for results...');

        // Wait for results to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        const screenshotDir = path.join(__dirname, '..', 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir);
        }

        const filename = `screenshot_lens_${Date.now()}.png`;
        const screenshotPath = path.join(screenshotDir, filename);
        await this.page.screenshot({ path: screenshotPath });
        console.log(`Google Lens screenshot saved: ${screenshotPath}`);

        return `/screenshots/${filename}`;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('Browser closed.');
        }
    }
}

export default PuppeteerController;

const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("Starting PDF generation...");

    // Launch browser with optimized settings for high-fidelity rendering
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Helps prevent memory issues on some systems
            '--font-render-hinting=none' // Improves font consistency across platforms
        ]
    });

    const page = await browser.newPage();

    // Use the same viewport as the target poster page.
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
    });

    const filePath = `file://${path.join(__dirname, 'index.html')}`;

    // networkidle0 ensures all fonts, SVGs, and images are fully downloaded and rendered
    await page.goto(filePath, { waitUntil: 'networkidle0' });

    // Wait for web fonts before measuring the poster.
    await page.evaluateHandle('document.fonts.ready');

    // Keep the PDF 16:9, but scale the rendered poster down if its content
    // overflows 1920x1080. This avoids clipping while preserving the target page size.
    await page.evaluate(() => {
        const targetWidth = 1920;
        const targetHeight = 1080;
        const poster = document.querySelector('.poster') || document.body;
        const rect = poster.getBoundingClientRect();
        const contentWidth = Math.max(rect.width, poster.scrollWidth, document.documentElement.scrollWidth);
        const contentHeight = Math.max(rect.height, poster.scrollHeight, document.documentElement.scrollHeight);
        const scale = Math.min(targetWidth / contentWidth, targetHeight / contentHeight, 1);

        document.documentElement.style.width = `${targetWidth}px`;
        document.documentElement.style.height = `${targetHeight}px`;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.width = `${targetWidth}px`;
        document.body.style.height = `${targetHeight}px`;
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';

        poster.style.transformOrigin = 'top left';
        poster.style.transform = `scale(${scale})`;
        poster.style.width = `${contentWidth}px`;
        poster.style.height = `${contentHeight}px`;
    });

    // Use screen media for the PDF so the local browser view and PDF render match.
    await page.emulateMediaType('screen');

    // Generate the PDF
    await page.pdf({
        path: 'poster.pdf',
        width: '1920px',
        height: '1080px',
        printBackground: true, // Force background colors and gradients to render
        margin: { top: 0, right: 0, bottom: 0, left: 0 }, // CRUCIAL: Remove default browser print margins
        pageRanges: '1',
        preferCSSPageSize: false,
        scale: 1
    });

    await browser.close();
    console.log("✨ PDF generated successfully at poster.pdf");
})();
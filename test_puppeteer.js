const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
    });

    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
    });

    page.on('requestfailed', request => {
        console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        console.log('Navigating to http://localhost:8080/');
        await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
        console.log('Page loaded. Clicking "Feed" tab...');

        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.nav-tab');
            if (tabs.length > 1) {
                tabs[1].click();
            } else {
                console.log("Feed tab not found.");
            }
        });

        await new Promise(r => setTimeout(r,1000));
        console.log('Checking active page...');
        const activePageId = await page.evaluate(() => {
            const active = document.querySelector('.page.active');
            return active ? active.id : null;
        });
        console.log('Active page is:', activePageId);

    } catch (e) {
        console.error('Script Error:', e);
    } finally {
        await browser.close();
    }
})();

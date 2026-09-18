const puppeteer = require('puppeteer');
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

async function convertHtmlToPptx() {
  console.log("Launching Puppeteer to capture HTML slides...");

  const htmlPath = path.join(__dirname, '..', '..', 'Contact_Finder_Presentation.html');
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  const totalSlides = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log(`Found ${totalSlides} slides in HTML presentation.`);

  const tempDir = path.join(__dirname, 'temp_slides');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Contact Finder OSINT Engine Presentation';

  for (let i = 0; i < totalSlides; i++) {
    console.log(`Capturing slide ${i + 1} / ${totalSlides}...`);
    
    await page.evaluate((idx) => {
      if (typeof showSlide === 'function') {
        showSlide(idx);
      }
    }, i);

    await page.evaluate(() => {
      const controls = document.querySelector('div[style*="position: fixed"]');
      if (controls) controls.style.display = 'none';
      const pBar = document.getElementById('progressBar');
      if (pBar) pBar.style.display = 'none';
    });

    await new Promise(r => setTimeout(r, 200));

    const imgPath = path.join(tempDir, `slide_${i + 1}.png`);
    await page.screenshot({ path: imgPath, type: 'png' });

    const pptxSlide = pptx.addSlide();
    pptxSlide.addImage({
      path: imgPath,
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5
    });
  }

  await browser.close();

  const primaryPptx = path.join(__dirname, '..', '..', 'Contact_Finder_Slides.pptx');
  const fallbackPptx = path.join(__dirname, '..', '..', 'Contact_Finder_Presentation.pptx');

  console.log(`Writing PPTX file to ${primaryPptx}...`);
  await pptx.writeFile({ fileName: primaryPptx });
  
  try {
    await pptx.writeFile({ fileName: fallbackPptx });
  } catch (e) {
    console.log("Contact_Finder_Presentation.pptx was locked, created Contact_Finder_Slides.pptx instead.");
  }

  console.log("Conversion complete! PPTX file successfully created.");

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

convertHtmlToPptx().catch(err => {
  console.error("Error converting HTML to PPTX:", err);
  process.exit(1);
});

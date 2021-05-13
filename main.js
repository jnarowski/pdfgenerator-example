const chromium = require('chrome-aws-lambda');
const pdflib = require('pdf-lib');
const fs = require('fs');

(async () => {
  try {
    const PDFDocument = pdflib.PDFDocument
    const pdfPath = `report.pdf`
    const chromiumOptions = {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
      pipe: true
    };
    
    try {
      fs.unlinkSync(pdfPath)
    } catch (err) {

    }
  
    const browser = await chromium.puppeteer.launch(chromiumOptions);
    const coverPage = await browser.newPage();
    const page = await browser.newPage();

    const headerTemplate = '<span style="font-size: 20px; width: 200px; background-color: black; color: white; margin: 20px;">Header</span>';
    const footerTemplate = '<span style="font-size: 20px; width: 200px; background-color: black; color: white; margin: 20px;">Footer <span class="pageNumber"></span></span>';
    
    const coverHtml = `<html>
      <body>
        <div style="page-break-after: always;"><h1>Cover Page</h1></div>
      </body>
    </html>`;

    const html = `<html>
      <body>
        <div style="page-break-after: always;"><h1>Page 1</h1></div>
        <div style="page-break-after: always;"><h1>Page 2</h1></div>
        <div style="page-break-after: always;"><h1>Page 3</h1></div>
      </body>
    </html>`;
  
    await coverPage.setContent(coverHtml, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    await coverPage.emulateMediaType('screen')
    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    await page.emulateMediaType('screen')

    
    const options = {
      format: 'A4',
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm',
      },
    };
  
    const page1 = await coverPage.pdf({
      ...options,
      displayHeaderFooter: false,
      headerTemplate: '',
      footerTemplate: '',
    });
  
    const page2 = await page.pdf({
      ...options,
      headerTemplate,
      footerTemplate,
    });
  
    const documents = [page1, page2];
    const mergedPdf = await PDFDocument.create();
  
    for (let document of documents) {
      document = await PDFDocument.load(document);
  
      const copiedPages = await mergedPdf.copyPages(document, document.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));    
    }
    
    const pdfBytes = await mergedPdf.save();
      
    await page.close()
    await browser.close()

    try {
      fs.writeFileSync(pdfPath, Buffer.from(pdfBytes))
    } catch (err) {
      console.error(err)
    }
  
    // Buffer for https response in my case
    return Buffer.from(pdfBytes)  
  } catch (err) {
    console.log('[ERROR]', err);
  }
 })()
 
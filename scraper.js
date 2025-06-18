// scraper.js
// Prototype scraper for SPAR, DM and now Lidl leaflets 
// Node.js + puppeteer + cheerio + MongoDB native driver

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { connectToDatabase } from './db.js';

// Parse YYMMDD → UTC date at midnight
function parseDateFromSegment(seg) {
const year  = 2000 + parseInt(seg.slice(0, 2), 10);
const month = parseInt(seg.slice(2, 4), 10) - 1;
const day   = parseInt(seg.slice(4, 6), 10);

// Use Date.UTC so it's stored as 2025-06-16T00:00:00.000Z
return new Date(Date.UTC(year, month, day));
}

// Fetch page HTML via Puppeteer
async function fetchPageHtml(url, browser) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const html = await page.content();
  await page.close();
  return html;
}

// Scrape SPAR leaflets
async function scrapeSparInterspar(db, browser) {
  const baseUrl = 'https://www.spar.hr/letci-i-katalozi/';
  console.log('Fetching SPAR/Interspar main page…');
  let html;
  try {
    html = await fetchPageHtml(baseUrl, browser);
  } catch (err) {
    console.error('Failed to fetch SPAR/Interspar page:', err.message);
    return;
  }

  const $ = cheerio.load(html);
  const links = new Set();

  // grab all links to SPAR/Interspar leaflets/katalogi
  $('a[href*="aktualni-letci-"], a[href*="aktualni-katalozi-"]').each((_, el) => {
    let href = $(el).attr('href');
    if (!href) return;

    // normalize to absolute
    href = new URL(href, baseUrl).toString();

    // SKIP any .ashx endpoints (getPdf, ViewPdf, etc)
    if (/\.ashx$/i.test(href)) {
      return;
    }

    links.add(href);
  });

  console.log(`Found ${links.size} SPAR/Interspar leaflet URLs`);
  const leaflets = db.collection('leaflets');
  const now      = new Date();

  for (const url of links) {
    // parse the 6-digit date segment, e.g. "250618"
    const m = url.match(/\/(\d{6})[-/]/);
    if (!m) {
      console.warn('Skipping unrecognized URL:', url);
      continue;
    }

    const validFrom = parseDateFromSegment(m[1]);
    const validTo   = new Date(validFrom);
    validTo.setDate(validFrom.getDate() + 7);

    const chain = url.includes('interspar') ? 'Interspar' : 'SPAR';

    try {
      await leaflets.updateOne(
        { url },
        {
          $set: {
            url,
            validFrom,
            validTo,
            chain,
            scrapedAt: now
          }
        },
        { upsert: true }
      );
      console.log(`Upserted ${chain} leaflet:`, url);
    } catch (err) {
      console.error('Error upserting leaflet', url, err);
    }
  }
}

// Scrape DM leaflets
// Scrape DM leaflets by waiting for the katalog.dm.hr link in the live page
async function scrapeDm(db, browser) {
  const dmUrl = 'https://www.dm.hr/dm-katalog-470900';
  console.log('Loading DM katalog page…');
  const page = await browser.newPage();

  try {
    await page.goto(dmUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (err) {
    console.error('Failed to load DM page:', err.message);
    await page.close();
    return;
  }

  // 1) Wait for the katalog.dm.hr link to show up
  try {
    await page.waitForSelector('a[href*="katalog.dm.hr"]', { timeout: 15000 });
  } catch {
    console.error('Timed out waiting for katalog.dm.hr link');
    await page.close();
    return;
  }

  // 2) Grab all such links, pick the one ending in "-web"
  const allLinks = await page.$$eval(
    'a[href*="katalog.dm.hr"]',
    els => els.map(a => a.href)
  );
  await page.close();

  const flyerUrl = allLinks.find(u => u.endsWith('-web'));
  if (!flyerUrl) {
    console.error('No katalog.dm.hr/*-web link found among:', allLinks);
    return;
  }

  // 3) Parse date range from URL, e.g. "..._16_6-30_6_2025-web"
  //    Captures: [ full, d1, M1, d2, M2, YYYY ]
  const dateRegex = /_(\d{1,2})_(\d{1,2})-(\d{1,2})_(\d{1,2})_(\d{4})-web$/;
  const m = flyerUrl.match(dateRegex);

  const now = new Date();
  let validFrom, validTo;

  if (m) {
    const d1  = parseInt(m[1], 10);
    const M1  = parseInt(m[2], 10) - 1;
    const d2  = parseInt(m[3], 10);
    const M2  = parseInt(m[4], 10) - 1;
    const YY  = parseInt(m[5], 10);

    // create at UTC midnight so no timezone shift
    validFrom = new Date(Date.UTC(YY, M1, d1));
    validTo   = new Date(Date.UTC(YY, M2, d2));
  } else {
    // fallback to a 7-day span at UTC midnight
    validFrom = new Date();
    validFrom.setUTCHours(0,0,0,0);
    validTo   = new Date(validFrom.getTime() + 7*24*60*60*1000);
  }

  // 4) Upsert into Mongo like SPAR/Interspar
  const leaflets = db.collection('leaflets');
  try {
    await leaflets.updateOne(
      { url: flyerUrl },
      {
        $set: {
          url:        flyerUrl,
          validFrom,
          validTo,
          chain:     'DM',
          scrapedAt: now
        }
      },
      { upsert: true }
    );
    console.log('Upserted DM leaflet:', flyerUrl);
  } catch (err) {
    console.error('Error upserting DM leaflet', flyerUrl, err);
  }
}


// Scrape Lidl leaflets (one doc per flyer URL)
async function scrapeLidl(db, browser) {
  const base = 'https://www.lidl.hr/c/online-katalog/s10027538';
  console.log('Fetching Lidl online katalog page via Puppeteer...');
  let html;
  try {
    html = await fetchPageHtml(base, browser);
  } catch (err) {
    console.error('Failed to fetch Lidl katalog page:', err.message);
    return;
  }

  const $ = cheerio.load(html);
  const links = new Set();

  // collect all "/l/hr/letak/..." links
  $('a[href*="/l/hr/letak/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      links.add(new URL(href, base).toString());
    }
  });

  console.log(`Found ${links.size} Lidl flyer URLs`);
  const leaflets = db.collection('leaflets');
  const now = new Date();

  for (const url of links) {
    // parse "vrijedi-od-18-06-do-21-06" from the URL
    const dateRegex = /vrijedi-od-(\d{2})-(\d{2})-do-(\d{2})-(\d{2})/;
    const m = url.match(dateRegex);

    let validFrom = now;
    let validTo = new Date(now);
    if (m) {
      const year = new Date().getFullYear();
       // create at UTC midnight so no off-by-one on storage
    validFrom = new Date(
        Date.UTC(
            year,
            parseInt(m[2], 10) - 1,
            parseInt(m[1], 10)
    )
    );
    
    validTo = new Date(
        Date.UTC(
            year,
            parseInt(m[4], 10) - 1,
            parseInt(m[3], 10)
    ));
    }

    try {
      await leaflets.updateOne(
        { url },
        {
          $set: {
            url,
            validFrom,
            validTo,
            chain: 'Lidl',
            scrapedAt: now
          }
        },
        { upsert: true }
      );
      console.log('Upserted Lidl leaflet:', url);
    } catch (err) {
      console.error('Error upserting Lidl leaflet', url, err);
    }
  }
}

// Scrape Eurospin leaflets
// Scrape Eurospin leaflets by code‐param
async function scrapeEurospin(db, browser) {
  // 1) This is the PDF‐serving URL
  const flyerUrl = 'https://www.eurospin.hr/katalog/promotion?code=P162025HR';
  console.log('Processing Eurospin flyer:', flyerUrl);

  // 2) Pull out the `code=` part
  const codeParam = new URL(flyerUrl).searchParams.get('code') || '';
  //    codeParam === 'P162025HR'

  // 3) Extract page/month/year from it
  //    P1 → page 1 (we ignore), 6 → June, 2025 → year
  const m = codeParam.match(/^P\d+(\d{1,2})(\d{4})HR$/i);
  let validFrom, validTo;
  const now = new Date();

  if (m) {
    const month = parseInt(m[1], 10);
    const year  = parseInt(m[2], 10);

    // per your note: “valid from the 20th”
    validFrom = new Date(Date.UTC(year, month - 1, 20));
    validTo   = new Date(Date.UTC(year, month - 1, 20 + 7));
  } else {
    // fallback to a 7-day window starting today
    validFrom = new Date();
    validFrom.setUTCHours(0, 0, 0, 0);
    validTo   = new Date(validFrom.getTime() + 7 * 24*60*60*1000);
  }

  // 4) Upsert into Mongo just like the others
  const leaflets = db.collection('leaflets');
  try {
    await leaflets.updateOne(
      { url: flyerUrl },
      {
        $set: {
          url:        flyerUrl,
          validFrom,
          validTo,
          chain:     'Eurospin',
          scrapedAt: now
        }
      },
      { upsert: true }
    );
    console.log('Upserted Eurospin leaflet:', flyerUrl);
  } catch (err) {
    console.error('Error upserting Eurospin leaflet', flyerUrl, err);
  }
}


// Main execution
async function main() {
  const { db, client } = await connectToDatabase();
  
  // testing only
  // wipe all existing leaflet docs
  await db.collection('leaflets').deleteMany({});
  console.log('Cleared leaflets collection.');

  // Optionally drop legacy index once
  try {
    await db.collection('leaflets').dropIndex('store_1_validFrom_1');
    console.log('Dropped legacy index');
  } catch (e) {
    // ignore
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    //await scrapeSparInterspar(db, browser);
    //await scrapeDm(db, browser);
    //await scrapeLidl(db, browser);
    await scrapeEurospin(db, browser);
  } catch (err) {
    console.error('Scraper error:', err);
  } finally {
    await browser.close();
    await client.close();
  }
}

main().catch(console.error);

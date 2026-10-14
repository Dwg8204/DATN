import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

test('original homepage slider keeps six images, dots and automatic transitions on desktop/mobile', async () => {
  const bundle = await build({ stdin: { resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx', contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,useLocation} from 'react-router-dom';
import i18n from './src/i18n/index.js';import {useTranslation} from 'react-i18next';
import FeatureShowcase from './src/components/shared/FeatureShowcase/FeatureShowcase.jsx';import {HOME_FEATURES} from './src/pages/homeFeatures.js';
i18n.changeLanguage('vi');window.changeFeatureLanguage=language=>i18n.changeLanguage(language);
function CurrentRoute(){const location=useLocation();return <output data-testid='route'>{location.pathname}</output>}
function App(){const {t}=useTranslation();return <MemoryRouter><FeatureShowcase sectionTitle={t('home.keyFeatures')}
features={HOME_FEATURES.map(feature=>({...feature,...t('home.features.flows.'+feature.id,{returnObjects:true})}))}/><CurrentRoute/></MemoryRouter>};
createRoot(document.getElementById('root')).render(<App/>);` }, bundle: true, write: false, outfile: 'features.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  const globalCss = await readFile(new URL('../src/assets/styles/global.css', import.meta.url), 'utf8');
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      await page.route('**/*', route => route.request().url() === 'http://features-ui.test/'
        ? route.fulfill({ contentType: 'text/html', body: '<html data-theme="light"><body><div id="root"></div></body></html>' })
        : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#607d8b"/></svg>' }));
      await page.goto('http://features-ui.test/');
      await page.addStyleTag({ content: globalCss + bundle.outputFiles.find(f => f.path.endsWith('.css')).text });
      await page.addScriptTag({ content: bundle.outputFiles.find(f => f.path.endsWith('.js')).text });
      const viewport = page.locator('[class*="_carouselViewport"]');
      await viewport.waitFor();
      const slides = viewport.locator(':scope > a');
      assert.equal(await slides.count(), 6);
      assert.equal(await viewport.locator('img').count(), 6);
      assert.equal(await page.locator('[class*="_dots"] > div').count(), 6);
      assert.equal(await page.getByRole('tab').count(), 0, 'no replacement tab layout');
      assert.equal(await page.getByRole('link').count(), 6, 'each original slide is a link');
      const sources = await viewport.locator('img').evaluateAll(images => images.map(image => image.src));
      assert.equal(new Set(sources).size, 6);
      assert.ok(sources.every(source => source.startsWith('https://images.unsplash.com/') && !source.includes('expires_30_days')));
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
      await page.clock.runFor(3100);
      await page.waitForFunction(() => document.querySelector('[class*="_dotActive"]')?.previousElementSibling !== null);
      // Pause the virtual clock while checking every slide manually.
      const destinations = ['/listening/overview', '/reading', '/writing/overview', '/speaking/overview', '/grammar-vocab/overview', '/dictation'];
      for (let i = 0; i < 6; i++) {
        await viewport.evaluate((element, index) => element.scrollTo({ left: element.clientWidth * index, behavior: 'instant' }), i);
        await page.waitForFunction(index => {
          const dots = [...document.querySelector('[class*="_dots"]').children];
          return dots[index].className.includes('_dotActive');
        }, i);
        assert.equal(await slides.nth(i).locator('img').getAttribute('width'), '1200');
        assert.equal(await slides.nth(i).getAttribute('href'), destinations[i]);
        assert.equal(await slides.nth(i).evaluate(element => getComputedStyle(element).cursor), 'pointer');
        await slides.nth(i).locator('img').click();
        assert.equal(await page.getByTestId('route').textContent(), destinations[i]);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      if (width === 1280) {
        await page.locator('button').last().click();
        await page.waitForFunction(() => document.querySelector('[class*="_dots"]').firstElementChild.className.includes('_dotActive'));
      }
      await page.evaluate(() => window.changeFeatureLanguage('en'));
      await page.getByText('Listen closely. Understand clearly.', { exact: true }).waitFor();
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await slides.first().focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.getByTestId('route').textContent(), '/listening/overview');
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});

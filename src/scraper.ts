import 'ts-polyfill/lib/es2019-array';

import puppeteer, { Browser } from 'puppeteer';
import dbs from './sources/atm/dbs';
import ocbc from './sources/atm/ocbc';
import blackball from './sources/boba/blackball';
import eachACup from './sources/boba/each-a-cup';
import koi from './sources/boba/koi';
import liho from './sources/boba/liho';
import sharetea from './sources/boba/sharetea';
import gongCha from './sources/boba/gong-cha';

import { Boba } from './sources/boba/model';
import { ATM } from './sources/atm/model';

import * as Sentry from '@sentry/node';
import { readStore, writeStore } from './output';

const { NODE_ENV, SENTRY_DSN } = process.env;

const isProduction = NODE_ENV === 'production';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
  });
}

async function atm(browser: Browser) {
  const tempFunc = async (
    bankName: string,
    workFunc: (browser: Browser) => Promise<ATM[]>
  ) => {
    const data = readStore('banks.json');
    writeStore('banks.json', {
      ...data,
      [bankName]: await workFunc(browser),
    });
  };

  await Promise.all([tempFunc('DBS', dbs), tempFunc('OCBC', ocbc)]);
}

async function boba(browser: Browser) {
  const tempFunc = async (
    chainName: string,
    workFunc: (browser: Browser) => Promise<Boba[]>
  ) => {
    const data = readStore('boba.json');
    writeStore('boba.json', {
      ...data,
      [chainName]: await workFunc(browser),
    });
  };

  await Promise.all([
    tempFunc('BlackBall', blackball),
    tempFunc('Each-A-Cup', eachACup),
    tempFunc('Gong Cha', gongCha),
    tempFunc('Koi', koi),
    tempFunc('LiHO', liho),
    tempFunc('ShareTea', sharetea),
  ]);
}

async function scraper() {
  const browser = await puppeteer.launch({
    headless: isProduction,
    defaultViewport: null,
    args: isProduction ? ['--no-sandbox'] : [],
  });

  await atm(browser);
  await boba(browser);

  await browser.close();
}

scraper()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    Sentry?.captureException(e);
    process.exit(1);
  });

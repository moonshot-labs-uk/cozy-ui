#!/usr/bin/env node

let puppeteer
try {
  puppeteer = require('puppeteer')
} catch (e) {
  console.error(e)
  console.log(
    'Could not import puppeteer, you should install it if you want to take screenshots'
  )
  process.exit(1)
}
const path = require('path')
const fs = require('fs')
const sortBy = require('lodash/sortBy')
const { ArgumentParser } = require('argparse')

const emptyDirectory = directory => {
  for (const filename of fs.readdirSync(directory)) {
    fs.unlinkSync(path.join(directory, filename))
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Screenshot a component to the screenshot directory, taking care of
 * resizing the viewport before-hand so that the viewport fits the
 * component.
 */
const screenshotComponent = async (page, { link, name }, screenshotDir) => {
  await page.goto(link, { waitUntil: 'load', timeout: 0 })
  await sleep(100)

  console.log(`Screenshotting ${name}`)
  await page.screenshot({
    path: path.join(screenshotDir, `${name}.png`),
    fullPage: true
  })
}

/**
 * Fetch all available components on the styleguide and returns an array
 * of { name, link } describing each component.
 * Components are sorted by name.
 */
const fetchAllComponents = async (page, styleguideIndexURL) => {
  console.log(`Opening page ${styleguideIndexURL}`)
  await page.goto(styleguideIndexURL, {
    waitUntil: 'load',
    timeout: 0
  })

  console.log('Extracting links')
  const links = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll('h2 + * [title="Open isolated"]')
    ).map(x => x.href)
  })

  return sortBy(
    links.map(link => ({
      link,
      name: link.split('/').slice(-1)[0]
    })),
    x => x.name
  )
}

/**
 * Ensure directories are ready for taking screenshots.
 *
 * - Throws if styleguide has not been built
 * - Creates the screenshot dir if it does not exist
 * - Empties the screenshot dir if it exists
 *
 */
const prepareFS = async (styleguideDir, screenshotDir) => {
  if (!fs.existsSync(styleguideDir)) {
    throw new Error(
      `Styleguide does not seem to have been built (searching in ${styleguideDir}). Please run yarn build:doc:react.`
    )
  }

  if (!fs.existsSync(screenshotDir)) {
    console.log(`Creating screenshot directory ${screenshotDir}`)
    fs.mkdirSync(screenshotDir)
  } else {
    console.log(`Emptying screenshot directory ${screenshotDir}`)
    emptyDirectory(screenshotDir)
  }
}

/**
 * Opens and configure browser and page.
 * Returns { browser, page }
 */
const prepareBrowser = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  // Put Argos in user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36; Argos'
  )
  await page.setDefaultNavigationTimeout(0)
  console.log('Browser opened and set up')
  return { browser, page }
}

const pathArgument = p => {
  if (p.startsWith('/')) {
    return p
  } else {
    return path.join(process.cwd(), p)
  }
}

/**
 * Fetches all components from styleguide and takes a screenshot of each.
 */
const main = async () => {
  const parser = new ArgumentParser()

  parser.addArgument('--screenshot-dir', {
    required: true,
    dest: 'screenshotDir',
    type: pathArgument
  })
  parser.addArgument('--styleguide-dir', {
    required: true,
    dest: 'styleguideDir',
    type: pathArgument
  })
  parser.addArgument('--component')

  const args = parser.parseArgs()

  await prepareFS(args.styleguideDir, args.screenshotDir)
  const { browser, page } = await prepareBrowser()

  const styleguideIndexURL = `file://${path.join(
    args.styleguideDir,
    '/index.html'
  )}`
  const components = (await fetchAllComponents(
    page,
    styleguideIndexURL
  )).filter(
    args.component ? component => component.name === args.component : () => true
  )

  console.log('Screenshotting components')
  for (const component of components) {
    await screenshotComponent(page, component, args.screenshotDir)
  }

  await browser.close()
}

if (require.main === module) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}

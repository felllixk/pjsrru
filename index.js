import puppeteer from 'puppeteer';
import * as fs from "node:fs";
import EventEmitter from 'node:events';
import express from 'express';
import bodyParser from 'body-parser';

const xpathButton = "//div[@class=\"search-result-list__item bottom-border\"]"
    + "/div[@class=\"search-result-list__domain-data-right\"]"
    + "/*/*/button";

const xpathSearch = "//div[@class=\"search-result-list__item bottom-border\"]";

const xpathAuthButton = "//button[@class=\"ds-button hat__rounded-button b-header__user-button i-auth__open-login-tab qa-auth-btn ds-button_color_blue-500 ds-button-depressed ds-button-depressed_size_medium\"]";

const xpathOrderButton = "//button[@class=\"ds-button right-bar-search-checkout__button ds-button_color_blue-500 ds-button_block ds-button-depressed ds-button-depressed_size_medium\"]";
const xpathOrderList =
    "//div[@class=\"right-bar order-summary__desktop\"]"
    + "//div[@class=\"show-more right-bar-content l-padding_bottom-tiny\"]"
    + "/div[@class=\"item l-margin_bottom-small\"]"
    + "//div[@class=\"item__icon-wrapper\"]";
const xpathBuyButton = "//div[@class=\"right-bar order-summary__desktop\"]"
    + "//button[@class=\"ds-button ds-button_color_blue-500 ds-button_block ds-button-depressed ds-button-depressed_size_medium\"]"
const xpathPayLinks =
    "//div[@class=\"paytypes-list-item\"]"


const xpathCardInput = "//input[@name=\"cardNumber\"]";
const xpathExpiryInput = "//input[@name=\"cardExpiration\"]";
const xpathCodeInput = "//input[@name=\"cardCvc\"]";
const xpathCardEmail = "//input[@name=\"userEmail\"]";
const xpathSubmitPayment = "//button[@type=\"submit\"]";
const xpathTuiInput = "//input[@class=\"tui-input__input\"]";

const cardNumber = '5536914097621829';
const expiry = '0130';
const code = '256';
const email = 'felllixk@gmail.com';

//const domainFind = 'tfire.ru';
const domainFind = 'drafter.ru';

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

const url = `https://www.reg.ru/buy/domains/?query=${domainFind}&place_of_order=header-search`;

let IsRunning = false;

let emitter = new EventEmitter();

let mainInterval = null;

let timeoutRunInterval = null;

let timeoutResolveFunction = null;

async function waitingCode() {
    clearInterval(timeoutRunInterval);
    console.log('Запуск процедуры получения кода');
    return new Promise((resolve, reject) => {
        emitter.on('code', (code) => {
            console.log('Получил код в waitingCode: ' + code);
            timeoutResolveFunction()
            resolve(code);
        })
    })
}

async function run() {
    IsRunning = true;
    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    let result = [];
    try {
        result = fs.readFileSync("./cookies.json", { encoding: "utf-8" });
        result = JSON.parse(result);
    }
    catch (e) {
        console.log(e);
    }

    const page = await browser.newPage();
    await page.setViewport({
        width: 1280,
        height: 1024,
        deviceScaleFactor: 1,
    });

    await page.setCookie(...result);
    await page.goto(url);

    await page.waitForXPath(xpathSearch, { timeout: 0 });
    await delay(2000);

    await cookieSave(page); // делаем здесь сейв куков

    let notAuth = (await page.$x(xpathAuthButton)).length;
    if (notAuth) {
        console.log('Не авторизован');
    } else if (await canBuy(page)) {
        console.log('Домен доступен для покупки.');
        await order(page);
    } else {
        console.log('Домен занят');
    }

    browser.close();
    IsRunning = false;
}

function runCycle() {

    const app = express();
    app.use(bodyParser.raw());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.post("/code", function (req, res) {
        console.log(req.body);
        let message = req.body['message'] ?? '';
        if (!message) {
            return;
        }
        const codeRegex = /\d+/g;
        const codeMatches = message.match(codeRegex);
        let code = codeMatches[0] ?? '';
        if (!code) {
            return;
        }
        emitter.emit('code', code);
        res.send('1');
        return;
    });

    app.get('*', function (req, res) {
        res.send('0');
        return;
    });

    console.log('Запуск сервиса получения кода');
    app.listen(3000, '0.0.0.0');

    mainInterval = setInterval(() => {
        if (!IsRunning) {
            runWithTimeout()
        }
    }, 20000);
}

async function runWithTimeout() {
    const timeoutPromise = new Promise((resolve, reject) => {
        timeoutResolveFunction = resolve;
        timeoutRunInterval = setTimeout(() => {
            reject(new Error('Timeout exceeded'));
        }, 45000); // timeout after 20 seconds
    });

    const longRunningPromise = run();

    try {
        await Promise.race([timeoutPromise, longRunningPromise]);
        // continue execution if the long running function completes within the timeout period
    } catch (error) {
        // handle the timeout error
        console.log(error);
    }
}

async function order(page) {
    console.log('Запуск процедуры покупки домена');

    console.log('Останова цикла повторного запроса');
    clearInterval(mainInterval);


    await page.waitForXPath(xpathButton, { timeout: 0 });
    const b = (await page.$x(xpathButton))[0]
    b.click();
    await screenshot(page);

    await delay(1000);

    await page.waitForXPath(xpathOrderButton, { timeout: 0 });
    const b2 = (await page.$x(xpathOrderButton))[0]
    b2.click()
    await screenshot(page);

    await delay(2000);

    let list = null;
    while (true) {
        list = (await page.$x(xpathOrderList))
        if (list.length < 2) {
            break;
        }
        for (let index = 1; index < list.length; index++) {
            list[index].click();
        }
        await delay(500);
    }

    await page.waitForXPath(xpathBuyButton, { timeout: 0 });
    let buyButton = (await page.$x(xpathBuyButton))
    buyButton[0].click()


    await page.waitForNavigation({ 'waitUntil': 'networkidle0' });
    await page.waitForXPath(xpathPayLinks, { timeout: 0 });
    let payLinks = (await page.$x(xpathPayLinks))
    await screenshot(page);
    payLinks[0].click();



    await page.waitForNavigation({ 'waitUntil': 'networkidle0' });

    console.log('Ввожу номер карты...');
    await inputType(page, xpathCardInput, cardNumber);

    console.log('Ввожу месяца карты...');
    await inputType(page, xpathExpiryInput, expiry);

    console.log('Ввожу код карты...');
    await inputType(page, xpathCodeInput, code);

    console.log('Ввожу email...');
    await inputType(page, xpathCardEmail, email);

    await screenshot(page);


    await (await page.$x(xpathSubmitPayment))[0].click();
    await page.waitForNavigation({ 'waitUntil': 'networkidle0' });
    await screenshot(page);

    const smsCode = await waitingCode();
    console.log('Получен код: ' + smsCode);

    await inputType(page, xpathTuiInput, smsCode);
    await page.waitForNavigation({ 'waitUntil': 'networkidle0' });
    delay(1000);
    await screenshot(page);
    console.log('Домен успешно куплен.Завершение процесса ');
    return process.exit(0);
}



async function inputType(page, xpath, value) {
    await page.waitForXPath(xpath, { timeout: 0 });
    await (await page.$x(xpath))[0].type(value);
}

async function canBuy(page) {
    await delay(1000); // Время на подумать
    let nodes = (await page.$x(xpathButton))
    return nodes.length;
}

async function cookieSave(page) {
    const cookies = await page.cookies();
    fs.writeFileSync('./cookies.json', JSON.stringify(cookies));
}

async function screenshot(page) {
    const d = +new Date()
    await page.screenshot({
        path: `scr/scr-${d}.png`
    });
}

runCycle();
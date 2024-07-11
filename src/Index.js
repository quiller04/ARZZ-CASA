const fs = require('fs');
const puppeteer = require('puppeteer');
const loginInfo = require('./login');
const loginQualitor = require('./LoginQualitor');
const LoginNdd = require('./LoginNdd');
const { checkLoginQualitor, checkPermissionDenied, checkForSpecificPhrase, getFullNameAndCCID, checkLoginNdd } = require('./Actions');

const logFilePath = "C:/Users/gaalencar/AREZZO INDUSTRIA E COMERCIO S.A/IT CORPORATIVO - CB ES SP - Documentos/General/TI - SP/registro automação/Registro.txt";
let lastVisitedURL = ''; // Definição global de lastVisitedURL
let loggedMessages = {}; // Definição global de loggedMessages

function logMessage(message, action = '', type = 'generic') {
  const log = `${new Date().toLocaleString()} - ${action}: ${message}\n`;
  const logKey = `${action}-${lastVisitedURL}-${message}`; // Usando a URL visitada como parte da chave

  // Verifica se a mensagem já foi registrada para evitar repetições
  if (!loggedMessages[logKey]) {
    fs.appendFileSync(logFilePath, log); // Salva no arquivo de log
    loggedMessages[logKey] = true; // Marca a mensagem como registrada

    console.log(`${action}: ${message}`); // Exibe no terminal
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();
  await loginQualitor(page, loginInfo.arezzo.username, loginInfo.arezzo.password);

  const loginPage = await browser.newPage();
  await LoginNdd(loginPage, loginInfo.nddPrint.company, loginInfo.nddPrint.email, loginInfo.nddPrint.password);

  //defini por qual numero de chamado ele começa a pesquisar
  let currentNumber = 610895;

  while (true) {
    await page.bringToFront();
    const nextURL = `https://casa.arezzo.com.br/html/hd/hdchamado/cadastro_chamado.php?cdchamado=${currentNumber}`;
    logMessage(`Navegando para a URL: ${nextURL}`, currentNumber);

    await page.goto(nextURL);
    lastVisitedURL = nextURL; // Atualiza lastVisitedURL para a URL atual

    //verifica se tem que fazer login no qualitor novamente
    const tempoexcedidoqualitor = await checkLoginQualitor(page);
    if (tempoexcedidoqualitor) {
      logMessage('Tempo de login do qualitor excedido. Realizando login novamente...');
      await loginQualitor(page, loginInfo.arezzo.username, loginInfo.arezzo.password);
      continue;
    }

    const checkAndPressEnter = async () => {
      const elementHandle = await page.evaluateHandle(() => {
        const elements = Array.from(document.querySelectorAll('div[style="height:auto;"]'));
        return elements.find(el =>
          el.innerHTML.includes('Este incidente está sendo visualizado pelo(s) seguinte(s) usuário(s):') &&
          el.innerHTML.includes('Deseja visualizar o incidente?') &&
          el.querySelector('strong')
        );
      });

      if (elementHandle) {
        await page.keyboard.press('Enter');
      }
    };

    const checkAndClick = async () => {
      const elementHandle = await page.$('.recaptcha-checkbox-checkmark[role="presentation"]');
      if (elementHandle) {
        await elementHandle.click();
        logMessage('Elemento clicado.');
      } else {
        logMessage('Elemento não encontrado.');
      }
    };

    // Verifica se precisa fazer login no NDD novamente
    const tempoexcedidoNdd = await checkLoginNdd(loginPage);
    if (tempoexcedidoNdd) {
      logMessage('Tempo de login do NDD excedido. Realizando login novamente...');
      await LoginNdd(loginPage, loginInfo.nddPrint.company, loginInfo.nddPrint.email, loginInfo.nddPrint.password);
      await checkAndClick();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await LoginNdd(loginPage, loginInfo.nddPrint.company, loginInfo.nddPrint.email, loginInfo.nddPrint.password);
      continue;
    }

    const isPermissionDenied = await checkPermissionDenied(page);
    if (isPermissionDenied) {
      logMessage('Permissão negada encontrada. Recarregando página...', currentNumber, 'permissionDenied');
      await page.reload();
      continue;
    }

    const hasSpecificPhrase = await checkForSpecificPhrase(page);
    logMessage(`Chamado de pin encontrado: ${hasSpecificPhrase}`);

    await checkAndPressEnter();

    if (!hasSpecificPhrase) {
      logMessage('Frase específica não encontrada. Navegando para a próxima URL...');
      currentNumber++;
      continue;
    }

    const { fullName, ccid } = await getFullNameAndCCID(page);
    logMessage(`Chamado de pin encontrado. Nome completo do usuário: ${fullName}, CCID: ${ccid}`);

    await checkAndPressEnter();
    await page.bringToFront();
    await page.click('#XMLTababa_atendimento');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.waitForSelector('#btnStart', { visible: true });
    await page.click('#btnStart');
    await new Promise(resolve => setTimeout(resolve, 4000));

    await loginPage.bringToFront();
    await loginPage.goto('https://360.nddprint.com/users');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verifica se precisa fazer login no NDD novamente
    const tempoexcedidoNdd1 = await checkLoginNdd(loginPage);
    if (tempoexcedidoNdd1) {
      logMessage('Tempo de login do NDD excedido. Realizando login novamente...');
      await LoginNdd(loginPage, loginInfo.nddPrint.company, loginInfo.nddPrint.email, loginInfo.nddPrint.password);
      continue;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    await loginPage.waitForSelector('.ndd-ng-grid-filter__input', { visible: true });
    await loginPage.type('.ndd-ng-grid-filter__input', fullName);
    await loginPage.keyboard.press('Enter');

    // Função para comparar se o texto do título do contém o mesmo nome do fullName
    const compareNames = (selector, fullName) => {
      const element = document.querySelector(selector);
      if (element) {
        const spanText = element.getAttribute('title');
        return spanText.trim().toLowerCase() === fullName.toLowerCase();
      }
      return false;
    };

    await loginPage.waitForFunction(compareNames, {}, '.ndd-ng-grid__column--preserve-white-space', fullName);
    await loginPage.waitForSelector('.ndd-ng-grid__column__link', { visible: true });
    await loginPage.evaluate(() => {
      document.querySelector('.ndd-ng-grid__column__link').click();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    await loginPage.evaluate(() => {
      const element = document.querySelector('.ndd-ng-tab#ndd-ng-tab-user-account a.ndd-ng-tab__link');
      if (element) {
        element.click();
      } else {
        console.error('Elemento não encontrado');
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const userWithoutAccount = await loginPage.evaluate(() => {
      const span = document.querySelector('.ndd-ng-data-item__value.ndd-ng-data-item__truncate');
      return span && span.innerText.includes('O usuário não pertence a nenhuma conta.');
    });

    if (userWithoutAccount) {
      logMessage('O usuário não pertence a nenhuma conta.');

      await new Promise(resolve => setTimeout(resolve, 2000));
      await loginPage.evaluate(() => {
        const actionButton = document.querySelector('#ndd-ng-button-action');
        if (actionButton) {
          actionButton.disabled = false;
          actionButton.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      await loginPage.evaluate(() => {
        const label = document.querySelector('.ndd-ng-form-internal-label');
        if (label) {
          label.disabled = false;
          label.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      await loginPage.keyboard.press('ArrowDown');
      await loginPage.keyboard.press('Tab');
      await loginPage.keyboard.press('Tab');
      await loginPage.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loginPage.keyboard.press('Tab');
      await loginPage.type('.ndd-tree-grid-filter__input', ccid);
      await loginPage.keyboard.press('Enter');

      await new Promise(resolve => setTimeout(resolve, 2000));
      await loginPage.evaluate((ccid) => {
        const td = Array.from(document.querySelectorAll('td[role="gridcell"]')).find(td => td.textContent.trim() === ccid);
        if (td) td.click();
      }, ccid);

      await loginPage.evaluate(() => {
        const confirmButton = document.querySelector('#ndd-ng-button-confirm');
        if (confirmButton) {
          confirmButton.disabled = false;
          confirmButton.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 4000));

      await loginPage.evaluate(() => {
        const saveButton = document.querySelector('#ndd-ng-button-save');
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.click();
        }
      });
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    await loginPage.evaluate(() => {
      document.querySelector('.ndd-ng-tab__link[href*="authentication-info"]').click();
    });

    let existingPin = await loginPage.evaluate(() => {
      const pinElement = document.querySelector('.ndd-ng-data-item__value');
      return pinElement ? pinElement.innerText.trim() : null;
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    if (existingPin && existingPin.length > 0) {
      logMessage(`PIN existente encontrado: ${existingPin}`);
    //} else {
      logMessage('Gerando novo PIN...');
      await loginPage.evaluate(() => {
        const generatePinButton = document.querySelector('#userauth-btn-generateandsend-pin');
        if (generatePinButton) {
          generatePinButton.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const modalText = await loginPage.evaluate(() => {
        const modal = document.querySelector('.ndd-ng-dialog__body.container');
        if (modal) {
          const message = modal.querySelector('.ndd-ng-dialog__info__message span');
          if (message && message.innerText.includes('Não é possível gerar e enviar código PIN, pois o usuário não possui um e-mail cadastrado.')) {
            return true;
          }
        }
        return false;
      });

      if (modalText) {
        logMessage('Modal de atenção encontrado. Simulando Enter.');
        await loginPage.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loginPage.evaluate(() => {
          const generatePinButton = document.querySelector('#userauth-btn-generateandsend-pin');
          if (generatePinButton) {
            generatePinButton.click();
          }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      await loginPage.keyboard.press('Tab');
      await loginPage.keyboard.type('5');
      await loginPage.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loginPage.reload();
      await loginPage.waitForSelector('.ndd-ng-data-item__value', { visible: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
      existingPin = await loginPage.evaluate(() => {
        const pinElement = document.querySelector('.ndd-ng-data-item__value');
        return pinElement ? pinElement.textContent.trim() : null;
      });

      if (existingPin && existingPin.length > 0) {
        logMessage(`Novo PIN gerado: ${existingPin}`);
      } else {
        logMessage('Falha ao gerar novo PIN.');
      }
    }

    await page.bringToFront();
    await new Promise(resolve => setTimeout(resolve, 1000));

    //verifica se tem que fazer login no qualitor novamente
    const tempoexcedidoqualitor1 = await checkLoginQualitor(page);
    if (tempoexcedidoqualitor1) {
      logMessage('Tempo de login do qualitor excedido . Realizando login novamente...');
      await loginQualitor(page, loginInfo.arezzo.username, loginInfo.arezzo.password);
      continue;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.waitForSelector('#dsacompanhamento', { visible: true });
    await page.type('#dsacompanhamento', 'PIN encaminhado para o e-mail cadastrado, por favor esperar aproximadamente 30 minutos para replicar em nosso sistema');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.click('#btnClose');
    await new Promise(resolve => setTimeout(resolve, 3000));
    logMessage('PIN encaminhado e chamado encerrado.');

    lastVisitedURL = nextURL;

    const permissionDenied = await checkPermissionDenied(page);
    if (permissionDenied) {
      logMessage(`Permissão negada na URL ${nextURL}. Tentando novamente...`);
      continue;
    }

    currentNumber++;
  }
})();

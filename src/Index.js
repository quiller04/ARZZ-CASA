const puppeteer = require('puppeteer');
const loginInfo = require('./login');
const loginQualitor = require('./LoginQualitor');
const LoginNdd = require('./LoginNdd');
const { checkLoginQualitor, checkPermissionDenied, checkForSpecificPhrase, getFullNameAndCCID, checkLoginNdd } = require('./Actions');

(async () => {
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();
  await loginQualitor(page, loginInfo.arezzo.username, loginInfo.arezzo.password);

  const loginPage = await browser.newPage();
  await LoginNdd(loginPage, loginInfo.nddPrint.company, loginInfo.nddPrint.email, loginInfo.nddPrint.password);

  //defini por qual numero de chamado ele começa a pesquisar
  let currentNumber = 610508;
  let lastVisitedURL = '';

  while (true) {
    await page.bringToFront();
    const nextURL = `https://casa.arezzo.com.br/html/hd/hdchamado/cadastro_chamado.php?cdchamado=${currentNumber}`;
    console.log(`Navegando para a URL: ${nextURL}`);

    await page.goto(nextURL);

    //verifica se tem que fazer login no qualitor novamente
    const tempoexcedidoqualitor = await checkLoginQualitor(page);
    if (tempoexcedidoqualitor) {
      console.log('Tempo de login do qualitor excedido . Realizando login novamente...');
      await loginQualitor(page, loginInfo.arezzo.username, loginInfo.arezzo.password);
      continue;
    }

    // Verifica se precisa fazer login no NDD novamente
    const tempoexcedidoNdd = await checkLoginNdd(loginPage);
    if (tempoexcedidoNdd) {
      console.log('Tempo de login do NDD excedido. Realizando login novamente...');
      await LoginNdd(loginPage, loginInfo.nddPrint.company, loginInfo.nddPrint.email, loginInfo.nddPrint.password);
      continue;
    }

    const isPermissionDenied = await checkPermissionDenied(page);
    if (isPermissionDenied) {
      console.log('Permissão negada encontrada. Recarregando página...');
      await page.reload();
      continue;
    }

    const hasSpecificPhrase = await checkForSpecificPhrase(page);
    console.log(`Frase específica encontrada: ${hasSpecificPhrase}`);

    if (!hasSpecificPhrase) {
      console.log('Frase específica não encontrada. Navegando para a próxima URL...');
      currentNumber++;
      continue;
    }

    const { fullName, ccid } = await getFullNameAndCCID(page);
    console.log(`Frase específica encontrada. Nome completo do usuário: ${fullName}, CCID: ${ccid}`);

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
      console.log('Tempo de login do NDD excedido. Realizando login novamente...');
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
      console.log('O usuário não pertence a nenhuma conta.');

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
      console.log(`PIN existente encontrado: ${existingPin}`);
    //} else {
      console.log('Gerando novo PIN...');
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
        console.log('Modal de atenção encontrado. Simulando Enter.');
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
        console.log(`Novo PIN gerado: ${existingPin}`);
      } else {
        console.log('Falha ao gerar novo PIN.');
      }
    }

    await page.bringToFront();
    await new Promise(resolve => setTimeout(resolve, 1000));

    //verifica se tem que fazer login no qualitor novamente
    const tempoexcedidoqualitor1 = await checkLoginQualitor(page);
    if (tempoexcedidoqualitor1) {
      console.log('Tempo de login do qualitor excedido . Realizando login novamente...');
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
    console.log('PIN encaminhado e chamado encerrado.');

    lastVisitedURL = nextURL;

    const permissionDenied = await checkPermissionDenied(page); // Corrigido para passar 'page' como argumento
    if (permissionDenied) {
      console.log(`Permissão negada na URL ${nextURL}. Tentando novamente...`);
      continue;
    }

    currentNumber++;
  }
})();

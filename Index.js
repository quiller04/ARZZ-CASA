const puppeteer = require('puppeteer');
const loginInfo = require('./login');
const loginQualitor = require('./LoginQualitor');
const LoginNdd = require('./LoginNdd');
const { checkLoginQualitor, checkPermissionDenied, checkForSpecificPhrase, getFullNameAndCCID } = require('./Actions');

(async () => {
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();
  await loginQualitor(page, loginInfo.arezzo.username, loginInfo.arezzo.password);

  const loginPage = await browser.newPage();
  await LoginNdd(loginPage, loginInfo.nddPrint.company, loginInfo.nddPrint.email, loginInfo.nddPrint.password);

  let currentNumber = 545015;
  let lastVisitedURL = '';

  while (true) {
    await page.bringToFront();
    const nextURL = `https://casahml.arezzo.com.br/html/hd/hdchamado/cadastro_chamado.php?cdchamado=${currentNumber}`;
    console.log(`Navegando para a URL: ${nextURL}`);

    await page.goto(nextURL);

    const tempoexcedido = await checkLoginQualitor(page);
    if(tempoexcedido){
      console.log('tempo de login foi batido, fazendo login novamente')
      await loginQualitor(page, loginInfo.arezzo.username, loginInfo.arezzo.password);
      continue;
    }

    const isPermissionDenied = await checkPermissionDenied(page);
    if (isPermissionDenied) {
      console.log('Permissão negada encontrada. Recarregando página...');
      await page.reload();
      continue;
    }

    const hasSpecificPhrase = await checkForSpecificPhrase(page);
    if (hasSpecificPhrase) {
      const { fullName, ccid } = await getFullNameAndCCID(page);
      console.log(`Frase específica encontrada. Nome completo do usuário: ${fullName}, CCID: ${ccid}`);

      await loginPage.bringToFront();
      await loginPage.goto('https://360.nddprint.com/users');
      await loginPage.waitForSelector('.ndd-ng-grid-filter__input', { visible: true });
      await loginPage.type('.ndd-ng-grid-filter__input', fullName);
      await loginPage.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 4000));
      await loginPage.waitForSelector('.ndd-ng-grid__column__link', { visible: true });
      await loginPage.evaluate(() => {
        document.querySelector('.ndd-ng-grid__column__link').click();
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      await loginPage.evaluate(() => {
        const element = document.querySelector('.ndd-ng-tab#ndd-ng-tab-user-account a.ndd-ng-tab__link');
        if (element) {
          element.click();
        } else {
          console.error('Element not found');
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

      await new Promise(resolve => setTimeout(resolve, 10000));

      if (!existingPin || existingPin === '0000') {
        console.log('PIN inexistente ou inválido. Gerando novo PIN...');
        await loginPage.evaluate(() => {
          const resetButton = document.querySelector('button.ndd-ng-button--small');
          if (resetButton) {
            resetButton.click();
          }
        });

        await new Promise(resolve => setTimeout(resolve, 4000));

        const modalText = await loginPage.evaluate(() => {
          const modal = document.querySelector('.ndd-ng-modal__content');
          if (modal) {
            return modal.textContent.trim();
          }
          return null;
        });

        console.log(`Texto do modal: ${modalText}`);
        await loginPage.evaluate(() => {
          const confirmButton = document.querySelector('.ndd-ng-button.ndd-ng-dialog__button-action');
          if (confirmButton) {
            confirmButton.click();
          }
        });

        await new Promise(resolve => setTimeout(resolve, 10000));

        const updatedPin = await loginPage.evaluate(() => {
          const pinElement = document.querySelector('.ndd-ng-data-item__value');
          return pinElement ? pinElement.innerText.trim() : null;
        });

        console.log(`PIN gerado: ${updatedPin}`);
      }
    }

    currentNumber++;
  }
})();

const puppeteer = require('puppeteer');
const loginInfo = require('./login');

(async () => {
  const browser = await puppeteer.launch({ headless: false });

  const loginCasaArezzo = async (page) => {
    console.log('Acessando a página de login...');
    await page.goto('https://casa.arezzo.com.br/login.php?cdlingua=');

    console.log('Esperando o campo de usuário ficar visível...');
    await page.waitForSelector('#cdusuario', { visible: true });

    console.log('Limpando e preenchendo o campo de usuário...');
    await page.focus('#cdusuario');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#cdusuario', loginInfo.arezzo.username);

    console.log('Esperando o campo de senha ficar visível...');
    await page.waitForSelector('#cdsenha', { visible: true });

    console.log('Habilitando e preenchendo o campo de senha...');
    await page.evaluate(() => {
      document.querySelector('#cdsenha').removeAttribute('disabled');
    });
    await page.focus('#cdsenha');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#cdsenha', loginInfo.arezzo.password);

    console.log('Submetendo o formulário de login...');
    await Promise.all([
      page.click('#btnLogin'),
      page.waitForNavigation(),
    ]);

    console.log('Login realizado com sucesso!');
  };

  const loginNDDPrint = async (loginPage) => {
    console.log('Acessando a página de login do NDD Print...');
    await loginPage.goto('https://360.nddprint.com/login/company');
    await loginPage.waitForSelector('#login-company-input-company', { visible: true });

    console.log('Preenchendo os dados de login do NDD Print...');
    await loginPage.type('#login-company-input-company', loginInfo.nddPrint.company);
    await loginPage.type('#login-company-input-logon', loginInfo.nddPrint.email);
    await loginPage.type('#login-company-input-password', loginInfo.nddPrint.password);
    await loginPage.click('#login-button-submit');
    await loginPage.waitForNavigation();

    console.log('Login no NDD Print realizado com sucesso!');
  };

  const checkPermissionDenied = async (page) => {
    const permissionDeniedMessage = await page.evaluate(() => {
      const div = document.querySelector('div[style="font: bold 10px verdana, arial, sens-serif; background: #F2F2D9; border: 1px solid #DFDF9F; padding: 3px 5px;"]');
      return div ? div.textContent.trim() : null;
    });
    return permissionDeniedMessage !== null && permissionDeniedMessage.includes('Permissão negada');
  };

  const checkForSpecificPhrase = async (page) => {
    const inputText = await page.evaluate(() => {
      const input = document.querySelector('#nmtitulochamado');
      return input ? input.value.trim() : null;
    });
    return inputText === 'Solicitar PIN de Impressão';
  };

  const getFullNameAndCCID = async (page) => {
    const result = await page.evaluate(() => {
      const textarea = document.querySelector('#dschamado');
      const content = textarea ? textarea.textContent.trim() : '';
      const fullNameMatch = content.match(/\(TI\) Nome Completo do Usuário :\s*-\s*(.*)/);
      const ccidInput = document.querySelector('#vlinformacaoadicional1240');
      const ccid = ccidInput ? ccidInput.value.trim() : null;
      return {
        fullName: fullNameMatch ? fullNameMatch[1].trim() : null,
        ccid: ccid
      };
    });
    return result;
  };

  const page = await browser.newPage();
  await loginCasaArezzo(page);

  const loginPage = await browser.newPage();
  await loginNDDPrint(loginPage);

  let currentNumber = 602635;
  let lastVisitedURL = '';

  while (true) {
    await page.bringToFront();
    const nextURL = `https://casa.arezzo.com.br/html/hd/hdchamado/cadastro_chamado.php?cdchamado=${currentNumber}`;
    console.log(`Navegando para a URL: ${nextURL}`);

    await page.goto(nextURL);

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

      await new Promise(resolve => setTimeout(resolve, 1000));
      if (existingPin && existingPin.length > 0) {
        console.log(`PIN existente encontrado: ${existingPin}`);
        //} else {
        console.log('Gerando novo PIN...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loginPage.evaluate(() => {
          const generatePinButton = document.querySelector('#userauth-btn-generateandsend-pin');
          if (generatePinButton) {
            generatePinButton.click();
          }
        });

        const modalText = await loginPage.evaluate(() => {
          const modal = document.querySelector('.ndd-ng-dialog__body.container');
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

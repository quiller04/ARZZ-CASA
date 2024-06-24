const loginQualitor = async (page, username, password) => {
    console.log('Acessando a página de login...');
    await page.goto('https://casahml.arezzo.com.br/login.php');
  
    console.log('Esperando o campo de usuário ficar visível...');
    await page.waitForSelector('#cdusuario', { visible: true });
  
    console.log('Limpando e preenchendo o campo de usuário...');
    await page.focus('#cdusuario');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#cdusuario', username);
  
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
    await page.type('#cdsenha', password);
  
    console.log('Submetendo o formulário de login...');
    await Promise.all([
      page.click('#btnLogin'),
      page.waitForNavigation(),
    ]);
  
    console.log('Login realizado com sucesso!');
  };
  
  module.exports = loginQualitor;
  
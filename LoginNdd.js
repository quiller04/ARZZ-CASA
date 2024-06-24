const LoginNdd = async (page, company, email, password) => {
    console.log('Acessando a página de login do NDD Print...');
    await page.goto('https://360.nddprint.com/login/company');
    await page.waitForSelector('#login-company-input-company', { visible: true });
  
    console.log('Preenchendo os dados de login do NDD Print...');
    await page.type('#login-company-input-company', company);
    await page.type('#login-company-input-logon', email);
    await page.type('#login-company-input-password', password);
    await page.click('#login-button-submit');
    await page.waitForNavigation();
  
    console.log('Login no NDD Print realizado com sucesso!');
  };
  
  module.exports = LoginNdd;
  
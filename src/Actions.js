//ação para verificar se apareceu o erro de limite de chamados
const checkPermissionDenied = async (page) => {
  const permissionDeniedMessage = await page.evaluate(() => {
    const div = document.querySelector('div[style="font: bold 10px verdana, arial, sens-serif; background: #F2F2D9; border: 1px solid #DFDF9F; padding: 3px 5px;"]');
    return div ? div.textContent.trim() : null;
  });
  return permissionDeniedMessage !== null && permissionDeniedMessage.includes('Permissão negada');
};

//verifica se o titulo do chamado é um dos que estou procurando
const checkForSpecificPhrase = async (page) => {
  const inputText = await page.evaluate(() => {
    const input = document.querySelector('#nmtitulochamado');
    return input ? input.value.trim() : null;
  });
  return inputText === 'Solicitar PIN de Impressão' || inputText === 'REALIZAR SOLICITAÇÃO SOLICITAR PIN DE IMPRESSÃO';
};

//copia os dados do chamado como nome e cc
const getFullNameAndCCID = async (page) => {
  const result = await page.evaluate(() => {
    const normalizeString = (str) => {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    const textarea = document.querySelector('#dschamado');
    const content = textarea ? textarea.textContent.trim() : '';
    const fullNameMatch = content.match(/\(TI\) Nome Completo do Usuário :\s*-\s*(.*)/);
    
    const ccidInput = document.querySelector('#vlinformacaoadicional1240');
    const ccid = ccidInput ? ccidInput.value.trim() : null;

    // Procura o nome completo no método novo de chamado do qualitor
    const fullNameInput = document.querySelector('#vlinformacaoadicional1226');
    const fullNameFromInput = fullNameInput ? fullNameInput.value.trim() : null;
    
    let fullName = fullNameMatch ? fullNameMatch[1].trim() : null;

    if (fullNameFromInput) {
      fullName = fullNameFromInput;
    }

    if (fullName) {
      fullName = normalizeString(fullName);
    }

    return {
      fullName: fullName,
      ccid: ccid
    };
  });
  return result;
};


//campos que verifica se está na pagina de login do qualitor
const checkLoginQualitor = async (page) => {
  const buttonExists = await page.evaluate(() => {
    const button = document.querySelector('button[name="btnLogin"][id="btnLogin"]');
    return button !== null;
  });

  return buttonExists;
};

//campos que verifica se está na pagina de login do ndd
const checkLoginNdd = async (page) => {
  const buttonExists = await page.evaluate(() => {
    const button = document.querySelector('button[name="login-button-submit"][id="login-button-submit"], button[name="login-button-password"][id="login-button-password"]');
    return button !== null;
  });

  return buttonExists;
};

module.exports = {
  checkPermissionDenied,
  checkForSpecificPhrase,
  getFullNameAndCCID,
  checkLoginQualitor,
  checkLoginNdd
};

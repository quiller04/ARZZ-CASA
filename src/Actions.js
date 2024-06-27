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
  return inputText === 'Solicitar PIN de Impressão' || inputText === 'REALIZAR SOLICITAÇÃO SOLICITAR PIN DE IMPRESSÃO';
};

const getFullNameAndCCID = async (page) => {
  const result = await page.evaluate(() => {
    const textarea = document.querySelector('#dschamado');
    const content = textarea ? textarea.textContent.trim() : '';
    const fullNameMatch = content.match(/\(TI\) Nome Completo do Usuário :\s*-\s*(.*)/);
    
    const ccidInput = document.querySelector('#vlinformacaoadicional1240');
    const ccid = ccidInput ? ccidInput.value.trim() : null;

    //procura o nome completo no metodo novo de chamado do qualitor
    const fullNameInput = document.querySelector('#vlinformacaoadicional1226');
    const fullNameFromInput = fullNameInput ? fullNameInput.value.trim() : null;
    
    let fullName = fullNameMatch ? fullNameMatch[1].trim() : null;

    if (fullNameFromInput) {
      fullName = fullNameFromInput;
    }

    return {
      fullName: fullName,
      ccid: ccid
    };
  });
  return result;
};


const checkLoginQualitor = async (page) => {
  const buttonExists = await page.evaluate(() => {
    const button = document.querySelector('button[name="btnLogin"][id="btnLogin"]');
    return button !== null;
  });

  return buttonExists;
};

module.exports = {
  checkPermissionDenied,
  checkForSpecificPhrase,
  getFullNameAndCCID,
  checkLoginQualitor
};

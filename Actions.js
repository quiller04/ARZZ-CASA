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

  const checkLoginQualitor = async (page) => {
    const buttonExists = await page.evaluate(() => {
      const button = document.querySelector('button[name="btnLogin"][id="btnLogin"]');
      return button !== null;
    });
  
    return buttonExists;
  };
  
  
  module.exports = {
    checkLoginQualitor,
    checkPermissionDenied,
    checkForSpecificPhrase,
    getFullNameAndCCID
  };
  
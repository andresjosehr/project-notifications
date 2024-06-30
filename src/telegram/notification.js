async function sendTelegramNotification(text, user){
  await fetch(`http://api.callmebot.com/text.php?user=${user}&text=${text}`, {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "sec-ch-ua": "\"Chromium\";v=\"104\", \" Not A;Brand\";v=\"99\", \"Microsoft Edge\";v=\"104\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "x-requested-with": "XMLHttpRequest"
    },
    "referrer": `http://api.callmebot.com/text.php?user=${user}&text=${text}`,
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "omit"
    }).catch(function (err) {
      console.error('Ha ocurrido un error inesperado: ');
      console.error(err);
    });
}

module.exports = {sendTelegramNotification};
const moment = require('moment');
const asciichart = require ('asciichart');

const config = {
    colors: [
        asciichart.green
    ],
    offset: 7,
    padding: '       ',
    height: 15,
    format: function (x, i) {return ('  ' + x.toFixed(18))}
}

function print(
  isTrading,
  assetToTrade,
  amountToTrade,
  execATTPriceInATR,
  assetToReceive,
  amountToReceive,
  execATRPriceInATT,
  prices
  ) {
  console.clear();
  if (isTrading == 'trade') {
    console.log('\nCareful : trading ACTIVATED ! \n');
  } else {
    console.log('\nCareful : trading NOT ACTIVATED ! \n');
  }
  console.log('-----------------------------------------------');
  console.log(`You want to trade your : ${amountToTrade} ${assetToTrade} for ${amountToReceive} ${assetToReceive}`); 
  console.log('-----------------------------------------------');
  console.log(`${moment().toISOString()} -- Execution price: ${amountToTrade} ${assetToTrade} = ${execATTPriceInATR*amountToTrade} ${assetToReceive} || 1 ${assetToReceive} = ${execATRPriceInATT} ${assetToTrade}`);
  console.log('\n Price graph: \n');
  console.log(asciichart.plot([prices], config));
}

module.exports = { print };
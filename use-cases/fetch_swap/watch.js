const constants = require('./constants/constants_mainnet');
const Watcher = require('./Watcher');
const Swapper = require('./Swapper');
const Ethers = require('ethers');

const wallet = require(`../../wallets/${constants.WALLET}`);
const passphrase = constants.PASSPHRASE;

// Command args
const assetToTrade = process.argv[2].toLowerCase();
const amountToTrade = process.argv[3];
const assetToReceive = process.argv[4].toLowerCase();
const amountToReceive = process.argv[5];
const isTrading = process.argv[6];

async function start() {
  if ((assetToTrade != 'eth') && (assetToReceive != 'eth')) {
    console.log(' ! Use "eth" in either one of the sides of the trade ! ');
    process.exit();
  }

  if (isTrading == 'trade') {
    console.log('\nCareful : trading ACTIVATED ! \n');
    console.log('You have 3 seconds to cancel...');
    await new Promise(r => setTimeout(r, 3000));
  } else {
    console.log('\nCareful : trading NOT ACTIVATED ! \n');
  }

  const providerEthers = 
    new Ethers.providers.InfuraProvider(
      constants.INFURA_CHAIN, 
      constants.INFURA_KEY);
  const swapper = new Swapper(wallet, passphrase);
  const watcher = new Watcher(
    providerEthers, 
    swapper
  );
  watcher.watch(
    constants.TOKEN_ADDRESS,
    assetToTrade,
    amountToTrade,
    assetToReceive,
    amountToReceive,
    isTrading)
  .catch((err) => {
    console.log(err);
  });

};

start();

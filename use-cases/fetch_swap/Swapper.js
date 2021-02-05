const constants = require('./constants/constants_mainnet');
const Web3 = require('web3');
const axios = require('axios');
const moment = require('moment');

class Swapper {
  /** 
  * Swapper constructor
  * @param web3
  * @param wallet
  **/
  constructor(wallet, passphrase) {
    this._web3 = this._connect();
    this._wallet = this._web3.eth.accounts.wallet.decrypt(wallet, passphrase);
  }

  /**
  * Connector to web3 ws with options for reconnecting
  * 
  **/
  _connect() {
    const options = {
      reconnect: {
        auto: true,
        delay: 1000, // ms
        maxAttempts: 5,
        onTimeout: false
      }
    };
    const providerWeb3 = 
      new Web3.providers.WebsocketProvider(constants.INFURA_WS, options);
    return new Web3(providerWeb3);
  }

  /**
  * Create eth -> tokens transaction
  * @param amountIn
  * @param amountOutMin
  * @param recipient
  * @param WETHContractAddress
  * @param tokenContractAddressToBuy
  * @param gasPriceGwei
  * @returns transaction object
  **/
  _createSwapExactETHForTokensTransaction(
    amountIn,
    amountOutMin,
    recipient,
    WETHContractAddress,
    tokenContractAddressToBuy,
    gasPriceGwei) {

    let msgData = [];

    const methodString = 'swapExactETHForTokens(uint256,address[],address,uint256)';
    const methodStringHex = this._web3.utils.sha3(methodString).substring(0, 10);
    msgData.push(methodStringHex);

    // minimum tokens to get from the trade
    let amountOutMinHex = this._web3.utils.toWei(amountOutMin, 'ether');
    amountOutMinHex = this._web3.utils.toHex(amountOutMinHex).substring(2);
    msgData.push('0'.repeat(64 - amountOutMinHex.length) + amountOutMinHex);

    // offset in bytes where the arguments of the array start
    const offset = this._web3.utils.toHex(128).substring(2);
    msgData.push('0'.repeat(64 - offset.length) + offset);

    const recipientAddress = recipient.substring(2);
    msgData.push('0'.repeat(64 - recipientAddress.length) + recipientAddress);

    const deadline = String(moment().unix() + 3600).substring(0, 10);
    const deadlineHex = this._web3.utils.toHex(deadline).substring(2);
    msgData.push('0'.repeat(64 - deadlineHex.length) + deadlineHex);

    // length of array
    msgData.push(`${'0'.repeat(63)}2`);

    const path1 = WETHContractAddress.substring(2);
    msgData.push('0'.repeat(64 - path1.length) + path1);

    const path2 = tokenContractAddressToBuy.substring(2);
    msgData.push('0'.repeat(64 - path2.length) + path2);

    msgData = msgData.join('');

    return {
      to: constants.UNISWAP_ROUTER_V2,
      data: msgData,
      value: this._web3.utils.toWei(amountIn, 'ether'),
      gasPrice: this._web3.utils.toWei(gasPriceGwei, 'gwei'),
      gas: 250000,
      chain: constants.WEB3JS_CHAIN,
      hardfork: constants.WEB3JS_HARDFORK,
    };
  }

  /** 
  * Create tokens -> eth transaction
  * @param amountIn
  * @param amountOutMin
  * @param recipient
  * @param WETHContractAddress
  * @param tokenContractAddressToSell
  * @param gasPriceGwei
  * @returns transaction object
  **/
  _createswapExactTokensForETHTransaction(
    amountIn,
    amountOutMin,
    recipient,
    WETHContractAddress,
    tokenContractAddressToSell,
    gasPriceGwei) {

    let msgData = [];

    const methodString = 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)';
    const methodStringHex = this._web3.utils.sha3(methodString).substring(0, 10);
    msgData.push(methodStringHex);

    // tokens being sold
    let amountInHex = this._web3.utils.toWei(amountIn, 'ether');
    amountInHex = this._web3.utils.toHex(amountInHex).substring(2);
    msgData.push('0'.repeat(64 - amountInHex.length) + amountInHex);

    // minimum eth to get from the trade
    let amountOutMinHex = this._web3.utils.toWei(amountOutMin, 'ether');
    amountOutMinHex = this._web3.utils.toHex(amountOutMinHex).substring(2);
    msgData.push('0'.repeat(64 - amountOutMinHex.length) + amountOutMinHex);

    // offset in bytes where the arguments of the array start
    const offset = this._web3.utils.toHex(160).substring(2);
    msgData.push('0'.repeat(64 - offset.length) + offset);

    const recipientAddress = recipient.substring(2);
    msgData.push('0'.repeat(64 - recipientAddress.length) + recipientAddress);

    const deadline = String(moment().unix() + 3600).substring(0, 10);
    const deadlineHex = this._web3.utils.toHex(deadline).substring(2);
    msgData.push('0'.repeat(64 - deadlineHex.length) + deadlineHex);

    // length of array
    msgData.push(`${'0'.repeat(63)}2`);

    const path1 = tokenContractAddressToSell.substring(2);
    msgData.push('0'.repeat(64 - path1.length) + path1);

    const path2 = WETHContractAddress.substring(2);
    msgData.push('0'.repeat(64 - path2.length) + path2);

    msgData = msgData.join('');

    return {
      to: constants.UNISWAP_ROUTER_V2,
      data: msgData,
      value: '',
      gasPrice: this._web3.utils.toWei(gasPriceGwei, 'gwei'),
      gas: 250000,
      chain: constants.WEB3JS_CHAIN,
      hardfork: constants.WEB3JS_HARDFORK,
    };
  }

  /** 
  * Decode logs
  * @param logs
  * @param assetToTrade
  * @param assetToReceive
  **/
  _decodeLogs(logs, assetToTrade, assetToReceive) {
    // data received from receipt can be of length n if several paths in trade
    let indexOut;
    if (assetToTrade == 'eth') {
      indexOut = 2;
    } else {
      indexOut = logs.length-1;
    }
    const amountInHex = logs[0].data;
    const amountOutHex = logs[indexOut].data;
    const amountInWei = this._web3.utils.toBN(amountInHex);
    const amountOutWei =this._web3.utils.toBN(amountOutHex);
    const amountIn = this._web3.utils.fromWei(amountInWei, 'ether');
    const amountOut = this._web3.utils.fromWei(amountOutWei, 'ether');
    console.log(`${moment().toISOString()} -- Amount in : ${amountIn} ${assetToTrade}`);
    console.log(`${moment().toISOString()} -- Amount out: ${amountOut} ${assetToReceive}`);

  }

  /**
  * Get gas price (etherscan.io api)
  *
  **/
  async _getGasPrice() {
    const res = await axios.get(constants.ETHERSCAN_URL);
    return res.data.result.FastGasPrice;
  }

  /**
   * Gets amount of ETH left in wallet
   * @param address address of the wallet
   * @returns string eth amount in Wei
   */
  _getEthAmountLeft(address) {
    return this._web3.eth.getBalance(address);
  }

  /** 
  * Send transaction
  * @param transaction
  * @param assetToTrade
  * @param assetToReceive
  **/
  async _send(transaction, assetToTrade, assetToReceive) {
    this._web3.eth.accounts.signTransaction(
      transaction,
      this._wallet[0].privateKey
    )
    .then((result) => {
      console.log(`${moment().toISOString()} -- Transaction is signed. Sending...`);
      this._web3.eth.sendSignedTransaction(result.rawTransaction)
      .on('transactionHash', (hash) => {
        console.log(`${moment().toISOString()} -- SENT. Tx hash: ${hash}`);
      })
      .on('receipt', (receipt) => {
        console.log(`${moment().toISOString()} -- Tx receipt: received!`);
        this._decodeLogs(receipt.logs, assetToTrade, assetToReceive);
        process.exit();
      })
      .on('error', console.error);
    })
    .catch((err) => console.error(err));
  }

  /** 
  * Swap (entry from Watcher)
  * @param assetToTrade
  * @param amountToTrade
  * @param assetToReceive
  * @param amountToReceive
  **/
  async swap(assetToTrade, amountToTrade, assetToReceive, amountToReceive) {
    const gasPriceGwei = await this._getGasPrice();
    console.log(`${moment().toISOString()} -- Fast Gas price: ${gasPriceGwei} wei`);

    // Decide which tx to create
    const amountToReceiveSlp = (amountToReceive*constants.SLIPPAGE).toString();
    let tradeTransaction;
    if (assetToTrade == 'eth') {
      console.log(`${moment().toISOString()} -- Swaping exact ETH for tokens`);
      tradeTransaction = this._createSwapExactETHForTokensTransaction(
        amountToTrade,
        amountToReceiveSlp,
        this._wallet[0].address,
        constants.WETH,
        constants.TOKEN_ADDRESS,
        gasPriceGwei
      );
    } else {
      console.log(`${moment().toISOString()} -- Swaping exact tokens for ETH`);
      tradeTransaction = this._createswapExactTokensForETHTransaction(
        amountToTrade,
        amountToReceiveSlp,
        this._wallet[0].address,
        constants.WETH,
        constants.TOKEN_ADDRESS,
        gasPriceGwei);
    }

    // Send tx
    this._send(tradeTransaction, assetToTrade, assetToReceive)
      .catch((err) => {
        console.log(err);
      });

  }

}

module.exports = Swapper;

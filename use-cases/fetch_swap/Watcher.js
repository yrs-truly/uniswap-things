const constants = require('./constants/constants_mainnet');
const Printer = require('./Printer');
const moment = require('moment');
const UNISWAP = require('@uniswap/sdk');

class Watcher {
  /**
  * Watcher constructor
  * @param providerEthers
  * @param swapper
  * @param chainId
  * @param Token
  * @param Fetcher
  * @param WETH
  * @param Route
  * @param Trade
  * @param TokenAmount
  * @param TradeType
  * @param stables
  */
  constructor(providerEthers, swapper) {
    this._providerEthers = providerEthers;
    this._swapper = swapper;
    this._chainId = constants.CHAIN_ID;
    this._Token = UNISWAP.Token;
    this._Fetcher = UNISWAP.Fetcher;
    this._WETH = UNISWAP.WETH;
    this._Route = UNISWAP.Route;
    this._Trade = UNISWAP.Trade;
    this._TokenAmount = UNISWAP.TokenAmount;
    this._TradeType = UNISWAP.TradeType;
    this._stables = ['usdc', 'usdt', 'dai'];
  }

  /**
  * Watches on Uniswap the price of a given pair 
  * @param tokenAddress
  * @param assetToTrade
  * @param amountToTrade
  * @param assetToReceive
  * @param amountToReceive
  * @param isTrading
  */
  async watch(
    tokenAddress, 
    assetToTrade, 
    amountToTrade, 
    assetToReceive, 
    amountToReceive,
    isTrading,
  ) {
    const tokenData = await this._Fetcher.fetchTokenData(
      this._chainId, tokenAddress, this._providerEthers
    );
    let assetAgainst;
    if (assetToTrade == 'eth') {
      assetAgainst = this._WETH[this._chainId];
    } else {
      assetAgainst = tokenData;
    }
    // USDT and USDC have 6  decimals... spent hours figuring this out...............
    const amountToTradeDecimals = amountToTrade*10**assetAgainst.decimals;

    var prices = [];
    let stopWatching = false;
    while (!stopWatching) {
      const pairData = await this._Fetcher.fetchPairData(
        tokenData, this._WETH[this._chainId], this._providerEthers
      );
      const route = new this._Route([pairData], assetAgainst);
      const tokenAmount = new this._TokenAmount(
        assetAgainst, 
        amountToTradeDecimals
      );
      const trade = new this._Trade(
        route, 
        tokenAmount, 
        this._TradeType.EXACT_INPUT
      );

      // ATT: Asset to trade | ATR: Asset to receive
      let execATTPriceInATR = trade.executionPrice.toSignificant(6);
      let execATRPriceInATT = trade.executionPrice
        .invert()
        .toSignificant(6);

      // Prints ETH/STABLE graph when trading with stables
      // Prints TOKEN/ETH graph when trading with tokens
      if (assetToTrade == 'eth') {
        if (this._stables.includes(assetToReceive)) {
          prices.push(+execATTPriceInATR);
        } else {
          prices.push(+execATRPriceInATT);  
        }
      } else {
        if (this._stables.includes(assetToTrade)) {
          prices.push(+execATRPriceInATT);
        } else {
          prices.push(+execATTPriceInATR);
        }
      }
      // Delete first element of array. Limits the size of graph
      if (prices.length >= 61) {
        prices.shift();
      }

      Printer.print(
        isTrading, 
        assetToTrade, 
        amountToTrade,
        execATTPriceInATR,
        assetToReceive, 
        amountToReceive,
        execATRPriceInATT,
        prices);

      // Execute trade if conditions are met
      if (execATTPriceInATR*amountToTrade >= amountToReceive && isTrading == 'trade') {
        console.log(`${moment().toISOString()} -- LIMIT PRICE REACHED. Swaping now...`);
        this._swapper.swap(
          assetToTrade, 
          amountToTrade,  
          assetToReceive, 
          amountToReceive
        );

        stopWatching = true;
        break;
      }

      //sleep for 3 seconds
      await new Promise(r => setTimeout(r, 3000));

    }
  }
}

module.exports = Watcher;

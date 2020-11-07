/** Network responses are untyped. Disable some linting rules to accomodate. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Candle from './candle'
import CandleProvider from './candle-provider'
import * as WebRequest from 'web-request'
import HttpResponseCode from './http-response-code'
import { Utils } from '@tacoinfra/harbinger-lib'

/** User agent for requests to the API. */
const USER_AGENT = 'harbinger-signer'

/** Kraken REST API base URL */
const KRAKEN_API_BASE_URL = 'https://api.kraken.com/0/public/Ticker'

/** Scale to report prices in. */
const SCALE = 6

/** Provides candles from the Kraken API. */
export default class KrakenCandleProvider implements CandleProvider {
  /**
   * Get a description of the CandleProvider's backing service.
   *
   * @returns A string describing where the candles are pulled from.
   */
  public getProviderName(): string {
    return KRAKEN_API_BASE_URL
  }

  /**
   * Retrieves a candle from the Kraken API.
   *
   * @param assetName The assetName to retrieve. For instance, "XTZ-USD".
   */
  public async getCandle(assetName: string): Promise<Candle> {
    // Kraken ommits dashes in their API.
    const normalizedAssetName = assetName.replace('-', '')

    // Query the Kraken API.
    const apiURL = KRAKEN_API_BASE_URL

    const response = await WebRequest.get(apiURL, {
      body: { pair: normalizedAssetName },
      headers: {
        'User-Agent': USER_AGENT,
        accept: 'json',
      },
    })

    // Throw an error if API returned something other than a 200.
    if (response.statusCode !== HttpResponseCode.ok) {
      throw new Error(response.content)
    }

    // Krakens returns an object with Key/Value pairs for the pair.
    // [
    //     [
    //       1604696040,
    //       '1.7196',
    //       '1.7196',
    //       '1.7196',
    //       '1.7196',
    //       '0.0000',
    //       '0.00000000',
    //       0
    //     ],
    // ]
    //     <pair_name> = pair name
    //     array of array entries(<time>, <open>, <high>, <low>, <close>, <vwap>, <volume>, <count>)

    const candles: Array<Array<number>> = JSON.parse(response.content)

    // Grab and destructure the first candle, which is the most recent.
    const candleArray = candles[candles.length - 1]
    const startTimestamp = candleArray[0]
    const open = candleArray[1]
    const high = candleArray[2]
    const low = candleArray[3]
    const close = candleArray[4]
    const volume = candleArray[6]

    // Return the data formatted as an {@link Candle}.
    return {
      assetName,
      // Kraken uses milliseconds instead of microseconds.
      startTimestamp: Math.round(startTimestamp / 1000),
      endTimestamp: Math.round(startTimestamp / 1000) + 60,
      low: Utils.scale(low, SCALE),
      high: Utils.scale(high, SCALE),
      open: Utils.scale(open, SCALE),
      close: Utils.scale(close, SCALE),
      volume: Utils.scale(volume, SCALE),
    }
  }
}
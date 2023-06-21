/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { Asset } from '@alephium/sdk'
import { TokenList } from '@alephium/token-list'
import { FungibleTokenMetaData, NFTMetaData } from '@alephium/web3'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { uniq } from 'lodash'

import client from '@/api/client'
import { FungibleTokenMetadataStored, isFungibleTokenMetadata, isNFTMetadata, NFTMetadataStored } from '@/types/assets'

export const syncNetworkFungibleTokensInfo = createAsyncThunk('assets/syncNetworkTokensInfo', async () => {
  let metadata = undefined
  const network = client.networkType

  if (network) {
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/alephium/token-list/master/tokens/${network}.json`
      )
      metadata = (await response.json()) as TokenList
    } catch (e) {
      console.warn('No metadata for network ', network)
    }
  }

  return metadata
})

export const syncUnknownAssetsInfo = createAsyncThunk(
  'assets/syncUnknownTokensInfo',
  async (
    unknownTokenIds: Asset['id'][]
  ): Promise<{ fungibleTokens: FungibleTokenMetadataStored[]; nfts: NFTMetadataStored[] }> => {
    const filteredTokens = uniq(unknownTokenIds)

    const results = await Promise.allSettled(
      filteredTokens.map(async (id) => {
        const tokenStd = await client.node.guessStdTokenType(id)

        let fungibleTokenMetadata: Partial<FungibleTokenMetaData> = {}
        let NFTMetadata: Partial<NFTMetaData> = {}

        if (tokenStd === 'fungible') {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { totalSupply, ...rest } = await client.node.fetchFungibleTokenMetaData(id)
          fungibleTokenMetadata = rest
        } else if (tokenStd === 'non-fungible') {
          NFTMetadata = await client.node.fetchNFTMetaData(id)
        }

        return { id, verified: false, ...fungibleTokenMetadata, ...NFTMetadata }
      })
    )

    return (
      results.filter(({ status }) => status === 'fulfilled') as PromiseFulfilledResult<
        FungibleTokenMetadataStored | NFTMetadataStored
      >[]
    ).reduce(
      (acc, v) => {
        if (isFungibleTokenMetadata(v.value)) {
          return { ...acc, fungibleTokens: [...acc.fungibleTokens, v.value] }
        } else if (isNFTMetadata(v.value)) {
          return { ...acc, nfts: [...acc.nfts, v.value] }
        } else {
          return acc
        }
      },
      { fungibleTokens: [] as FungibleTokenMetadataStored[], nfts: [] as NFTMetadataStored[] }
    )
  }
)

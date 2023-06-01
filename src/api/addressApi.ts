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

import { ExplorerProvider } from '@alephium/web3'

import { AddressDataResult, AddressHash, AddressTransactionsResult } from '@/types/addresses'

export const fetchAddressData = async (
  client: ExplorerProvider,
  addressHash: AddressHash
): Promise<AddressDataResult> => {
  const balances = await client.addresses.getAddressesAddressBalance(addressHash)
  const txNumber = await client.addresses.getAddressesAddressTotalTransactions(addressHash)
  const tokenIds = await client.addresses.getAddressesAddressTokens(addressHash)

  const tokens = await Promise.all(
    tokenIds.map((id) =>
      client.addresses.getAddressesAddressTokensTokenIdBalance(addressHash, id).then((data) => ({
        id,
        ...data
      }))
    )
  )

  return {
    hash: addressHash,
    details: {
      ...balances,
      txNumber
    },
    tokens
  }
}

export const fetchAddressTransactions = async (
  client: ExplorerProvider,
  addressHash: AddressHash,
  page: number
): Promise<AddressTransactionsResult> => {
  const transactions = await client.addresses.getAddressesAddressTransactions(addressHash, { page })

  return {
    addressHash,
    transactions
  }
}

# Media
Pixie NFT contracts compatible with ERC721 and ERC1155

# Contract Address
Pixie Official Public Testing Contract
https://scan.chain.pixie.xyz/address/0xA335dD6f64EC53E0035786C020e1f187c790db42

## Architecture

This protocol is an extension of the ERC-721 NFT standard, intended to
provide a metadata migrated schema for NFTs and future storage technique.
This protocol refers to NFTs as `Media`.

In the event that the URI that point to the data must be changed(for instance, to IPFS), this protocol offers the ability to update them.
Recall that when minting tokens, sha256 hashes of the content are provided for integrity checks. As a result, anyone is able to
check the integrity of the media if the URI change.


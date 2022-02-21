// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * @title Interface for Pixie Protocol's Media1155
 */
interface IMedia1155 {

    /**
     * @notice get the creator of given token id if the token has been minted
     * @return the creator of the token
     */
    function creatorOf(uint256 tokenId) external view returns (address);

    /**
     * @notice get the tokenId given the content_hash if the token has been minted
     * @return the tokenId of the token
     */
    function getTokenIdByContentHash(bytes32 contentHash) external view returns (uint256);

    /**
     * @notice Creates `amount` tokens of token type `tokenId`, and assigns them to `account`.
     * A SHA256 hash of the content pointed to by final uri
     */
    function mintForCreator(address creator, uint256 tokenId, bytes32 contentHash, uint256 amount) external;

    /**
     * @notice Revoke the approvals for sender. The provided `setApprovalForAll` function is not sufficient
     * for this protocol, as it does not allow an approved address to revoke it's own approval.
     * In instances where a 3rd party is interacting on a user's behalf via `permit`, they should
     * revoke their approval once their task is complete as a best practice.
     */
    function revokeApprovalForAll() external;

    /**
     * @notice Sets a new URI for all token types, by relying on the token type ID
     * substitution mechanism
     * @dev only callable by contract creator
     */
    function setURI(string calldata _uri) external;
}

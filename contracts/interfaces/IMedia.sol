// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * @title Interface for Pixie Protocol's Media
 */
interface IMedia {
    struct EIP712Signature {
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct MediaData {
        // A valid URI of the content represented by this token
        string tokenURI;
        // A SHA256 hash of the content pointed to by tokenURI
        bytes32 contentHash;
    }

    event TokenURIUpdated(uint256 indexed _tokenId, address owner, string _uri);

    /**
     * @notice Mint new media for msg.sender.
     */
    function mint(uint256 tokenId, MediaData calldata data) external;

    /**
     * @notice Mint new media for creator.
     */
    function mintForCreator(address creator, uint256 tokenId, MediaData calldata data) external;

    /**
     * @notice EIP-712 mintWithSig method. Mints new media for a creator given a valid signature.
     */
    function mintWithSig(address creator, uint256 tokenId, MediaData calldata data, EIP712Signature calldata sig) external;

    /**
     * @notice Revoke approval for a piece of media
     */
    function revokeApproval(uint256 tokenId) external;

    /**
     * @notice Update the token URI
     */
    function updateTokenURI(uint256 tokenId, string calldata tokenURI) external;

    /**
     * @notice EIP-712 permit method. Sets an approved spender given a valid signature.
     */
    function permit(address spender, uint256 tokenId, EIP712Signature calldata sig) external;

    /**
     * @notice finalize this contract and can not mint any more.
     */
    function finalize() external;
}

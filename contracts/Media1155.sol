// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ERC1155Burnable} from "./ERC1155Burnable.sol";
import {ERC1155} from "./ERC1155.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Decimal} from "./Decimal.sol";
import "./interfaces/IMedia1155.sol";

/**
 * @title A media value system, with perpetual equity to creators
 * @notice This contract provides an interface to mint media with a market
 * owned by the creator.
 */
contract Media1155 is IMedia1155, ERC1155Burnable, ReentrancyGuard {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    /* *******
     * Globals
     * *******
     */

    // To record the contract creator address
    address private _contractCreator;

    // Enumerable mapping from token ids to their creators
    EnumerableMap.UintToAddressMap private _tokenCreators;

    // Mapping from creator address to their (enumerable) set of created tokens
    mapping(address => EnumerableSet.UintSet) private _creatorTokens;

    // Mapping from token id to sha256 hash of content
    mapping(uint256 => bytes32) public tokenContentHashes;

    struct tokenID {
        uint256 value;
        bool isValid;
    }

    // Mapping from contentHash to tokenId
    mapping(bytes32 => tokenID) private _contentHashes;

    // Mapping from account to operators
    mapping(address => EnumerableSet.AddressSet) private _approvedOperators;

    /* *********
     * Modifiers
     * *********
     */

    /**
     * @notice Require that the sender must be the contract creator
     */
    modifier onlyContractCreatorCall() {
        require(msg.sender == _contractCreator, "Media: not contract creator call");
        _;
    }

    /**
     * @notice Require that the token has not been burned and has been minted
     */
    modifier onlyExistingToken(uint256 tokenId) {
        require(exists(tokenId), "Media: nonexistent token");
        _;
    }

    /**
     * @notice Require that the token has had a content hash set
     */
    modifier onlyTokenWithContentHash(uint256 tokenId) {
        require(
            tokenContentHashes[tokenId] != 0,
            "Media: token does not have hash of created content"
        );
        _;
    }
    
    /**
     * @notice Ensure that the provided URI is not empty
     */
    modifier onlyValidURI(string memory uri) {
        require(
            bytes(uri).length != 0,
            "Media: specified uri must be non-empty"
        );
        _;
    }

    /**
     */
    constructor() ERC1155("") {
       _contractCreator = msg.sender;
    }
    
    /* **************
     * View Functions
     * **************
     */

    /**
     * @notice see IMedia1155
     */
    function creatorOf(uint256 tokenId) external override view returns (address) {
        return _tokenCreators.get(tokenId);
    }

    /**
     * @notice get the tokenId given the content_hash if the token has been minted
     * @return the tokenId of the token
     */
    function getTokenIdByContentHash(bytes32 contentHash) external override view returns (uint256)
    {
        require(
            _contentHashes[contentHash].isValid == true,
            "This token has not been minted."
        );
        return _contentHashes[contentHash].value;
    }


    /* ****************
     * Public Functions
     * ****************
     */

    /**
     * @notice see IMedia1155
     */
    function mintForCreator(address creator, uint256 tokenId, bytes32 contentHash, uint256 amount) public override
        nonReentrant
    {
        _mintForCreator(creator, tokenId, contentHash, amount);
    }

    /**
     * @notice see IMedia1155
     */
    function revokeApprovalForAll() external override 
        nonReentrant 
    {
        address sender = _msgSender();
        for(uint i=0; i<_approvedOperators[sender].length(); i++)
            _operatorApprovals[sender][_approvedOperators[sender].at(i)] = false;   
    }

    /**
     * @notice see IMedia1155
     * @dev only callable by contract creator
     */
    function setURI(string calldata _uri) external override
        nonReentrant
        onlyContractCreatorCall
    {
        _setURI(_uri);
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        super.setApprovalForAll(operator, approved);

        if(!_approvedOperators[_msgSender()].contains(operator))
            _approvedOperators[_msgSender()].add(operator);   
    }

    /* *****************
     * Private Functions
     * *****************
     */

    /**
     * @notice see IMedia
     *
     * On mint, also set the sha256 hashes of the content for integrity
     * checks, along with the token URIs to point to the content. Attribute
     * the token ID to the creator, mark the content hash as used.
     *
     * Note that the content hash must be unique for future mints to prevent duplicate media.
     */
    function _mintForCreator(address creator, uint256 tokenId, bytes32 contentHash, uint256 amount) internal {
        require(msg.sender == _contractCreator, "Media: Only contract creator can mint");
        require(contentHash != 0, "Media: content hash must be non-zero");
        require(
            _contentHashes[contentHash].isValid == false,
            "Media: a token has already been created with this content hash"
        );
        require(
            exists(tokenId) == false,
            "Media: existent tokenId"
        );

        _mint(creator, tokenId, amount, "");
        _setTokenContentHash(tokenId, contentHash);
        EnumerableSet.add(_creatorTokens[creator], tokenId);
        _contentHashes[contentHash].value = tokenId;
        _contentHashes[contentHash].isValid = true;

        _tokenCreators.set(tokenId, creator);
    }

    function _setTokenContentHash(uint256 tokenId, bytes32 contentHash) internal virtual
        onlyExistingToken(tokenId)
    {
        tokenContentHashes[tokenId] = contentHash;
    }
}

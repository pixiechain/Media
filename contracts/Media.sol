// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ERC721Burnable} from "./ERC721Burnable.sol";
import {ERC721} from "./ERC721.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Decimal} from "./Decimal.sol";
import "./interfaces/IMedia.sol";

/**
 * @title A media value system, with perpetual equity to creators
 * @notice This contract provides an interface to mint media with a market
 * owned by the creator.
 */
contract Media is IMedia, ERC721Burnable, ReentrancyGuard {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    /* *******
     * Globals
     * *******
     */

    // To record the contract creator address
    address private _contractCreator;

    // Address for the market
    //address public marketContract;

    // Mapping from token to previous owner of the token
    //mapping(uint256 => address) public previousTokenOwners;

    // Mapping from token id to creator address
    mapping(uint256 => address) public tokenCreators;

    // Mapping from creator address to their (enumerable) set of created tokens
    mapping(address => EnumerableSet.UintSet) private _creatorTokens;

    // Mapping from token id to sha256 hash of content
    mapping(uint256 => bytes32) public tokenContentHashes;

    // Mapping from contentHash to bool
    // mapping(bytes32 => bool) private _contentHashes;

    struct tokenID {
        uint256 value;
        bool isValid;
    }

    mapping(bytes32 => tokenID) private _contentHashes;

    //keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x49ecf333e5b8c95c40fdafc95c1ad136e8914a8fb55e9dc8bb01eaa83a2df9ad;

    //keccak256("MintWithSig(bytes32 contentHash,bytes32 metadataHash,uint256 creatorShare,uint256 nonce,uint256 deadline)");
    //bytes32 public constant MINT_WITH_SIG_TYPEHASH =
    //    0x2952e482b8e2b192305f87374d7af45dc2eafafe4f50d26a0c02e90f2fdbe14b;

    //keccak256("MintWithSig(bytes32 contentHash,uint256 nonce,uint256 deadline)");
    bytes32 public constant MINT_WITH_SIG_TYPEHASH =
        0x7540a87a6f5a3ca71228cbcf292e92bad63a56d2f56ffabd2c53ec29c9f4671f;

    // Mapping from address to token id to permit nonce
    mapping(address => mapping(uint256 => uint256)) public permitNonces;

    // Mapping from address to mint with sig nonce
    mapping(address => uint256) public mintWithSigNonces;

    /* *********
     * Modifiers
     * *********
     */

    /**
     * @notice Require that the token has not been burned and has been minted
     */
    modifier onlyExistingToken(uint256 tokenId) {
        require(_exists(tokenId), "Media: nonexistent token");
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
     * @notice Ensure that the provided spender is the approved or the owner of
     * the media for the specified tokenId
     */
    modifier onlyApprovedOrOwner(address spender, uint256 tokenId) {
        require(
            _isApprovedOrOwner(spender, tokenId),
            "Media: Only approved or owner"
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
     * @notice On deployment, set the market contract address and register the
     * ERC721 metadata interface
     */
    // constructor(address marketContractAddr) public ERC721("Pixie", "PIXIE") {
    //     marketContract = marketContractAddr;
    //     _registerInterface(_INTERFACE_ID_ERC721_METADATA);
    // }
    constructor() ERC721("Pixie", "PIXIE") {
       _contractCreator = msg.sender;
    }
    
    /* **************
     * View Functions
     * **************
     */

    /**
     * @notice return the URI for a particular piece of media with the specified tokenId
     * @dev This function is an override of the base OZ implementation because we
     * will return the tokenURI even if the media has been burned. In addition, this
     * protocol does not support a base URI, so relevant conditionals are removed.
     * @return the URI for a token
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        onlyExistingToken(tokenId)
        returns (string memory)
    {
        string memory _tokenURI = _tokenURIs[tokenId];

        return _tokenURI;
    }

    /**
     * @notice get the tokenId given the content_hash if the token has been minted
     * @return the tokenId of the token
     */
    function getTokenIdByContentHash(bytes32 contentHash)
        public
        view
        returns (uint256)
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
     * @notice see IMedia
     */
    //function mint(MediaData memory data, IMarket.BidShares memory bidShares)
    function mint(uint256 tokenId, MediaData memory data)
        public
        override
        nonReentrant
    {
        //_mintForCreator(msg.sender, data, bidShares);
        _mintForCreator(msg.sender, tokenId, data);
    }

    /**
     * @notice see IMedia
     */
    //function mintForCreator(address creator, MediaData memory data, IMarket.BidShares memory bidShares)
    function mintForCreator(address creator, uint256 tokenId, MediaData memory data)
        public
        override
        nonReentrant
    {
        //_mintForCreator(creator, data, bidShares);
        _mintForCreator(creator, tokenId, data);
    }

    /**
     * @notice see IMedia
     */
    function mintWithSig(
        address creator,
        uint256 tokenId,
        MediaData memory data,
        //IMarket.BidShares memory bidShares,
        EIP712Signature memory sig
    ) public override nonReentrant {
        require(
            sig.deadline == 0 || sig.deadline >= block.timestamp,
            "Media: mintWithSig expired"
        );

        bytes32 domainSeparator = _calculateDomainSeparator();

        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    domainSeparator,
                    keccak256(
                        abi.encode(
                            MINT_WITH_SIG_TYPEHASH,
                            data.contentHash,
                            //bidShares.creator.value,
                            mintWithSigNonces[creator]++,
                            sig.deadline
                        )
                    )
                )
            );

        address recoveredAddress = ecrecover(digest, sig.v, sig.r, sig.s);

        require(
            recoveredAddress != address(0) && creator == recoveredAddress,
            "Media: Signature invalid"
        );

        //_mintForCreator(recoveredAddress, data, bidShares);
        _mintForCreator(recoveredAddress, tokenId, data);
    }

    /**
     * @notice Burn a token.
     * @dev Only callable if the media owner is also the creator.
     */
    function burn(uint256 tokenId)
        public
        override
        nonReentrant
        onlyExistingToken(tokenId)
        onlyApprovedOrOwner(msg.sender, tokenId)
    {
        address owner = ownerOf(tokenId);

        require(
            tokenCreators[tokenId] == owner,
            "Media: owner is not creator of media"
        );

        _burn(tokenId);
    }

    /**
     * @notice Revoke the approvals for a token. The provided `approve` function is not sufficient
     * for this protocol, as it does not allow an approved address to revoke it's own approval.
     * In instances where a 3rd party is interacting on a user's behalf via `permit`, they should
     * revoke their approval once their task is complete as a best practice.
     */
    function revokeApproval(uint256 tokenId) external override nonReentrant {
        require(
            msg.sender == getApproved(tokenId),
            "Media: caller not approved address"
        );
        _approve(address(0), tokenId);
    }

    /**
     * @notice see IMedia
     * @dev only callable by approved or owner
     */
    function updateTokenURI(uint256 tokenId, string calldata _tokenURI)
        external
        override
        nonReentrant
        onlyApprovedOrOwner(msg.sender, tokenId)
        onlyTokenWithContentHash(tokenId)
        onlyValidURI(_tokenURI)
    {
        _setTokenURI(tokenId, _tokenURI);
        emit TokenURIUpdated(tokenId, msg.sender, _tokenURI);
    }

    /**
     * @notice See IMedia
     * @dev This method is loosely based on the permit for ERC-20 tokens in  EIP-2612, but modified
     * for ERC-721.
     */
    function permit(
        address spender,
        uint256 tokenId,
        EIP712Signature memory sig
    ) public override nonReentrant onlyExistingToken(tokenId) {
        require(
            sig.deadline == 0 || sig.deadline >= block.timestamp,
            "Media: Permit expired"
        );
        require(spender != address(0), "Media: spender cannot be 0x0");
        bytes32 domainSeparator = _calculateDomainSeparator();

        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    domainSeparator,
                    keccak256(
                        abi.encode(
                            PERMIT_TYPEHASH,
                            spender,
                            tokenId,
                            permitNonces[ownerOf(tokenId)][tokenId]++,
                            sig.deadline
                        )
                    )
                )
            );

        address recoveredAddress = ecrecover(digest, sig.v, sig.r, sig.s);

        require(
            recoveredAddress != address(0) &&
                ownerOf(tokenId) == recoveredAddress,
            "Media: Signature invalid"
        );

        _approve(spender, tokenId);
    }

    /* *****************
     * Private Functions
     * *****************
     */

    /**
     * @notice Creates a new token for `creator`. Its token ID will be automatically
     * assigned (and available on the emitted {IERC721-Transfer} event), and the token
     * URI autogenerated based on the base URI passed at construction.
     *
     * See {ERC721-_safeMint}.
     *
     * On mint, also set the sha256 hashes of the content for integrity
     * checks, along with the initial URIs to point to the content. Attribute
     * the token ID to the creator, mark the content hash as used, and set the bid shares for
     * the media's market.
     *
     * Note that the content hash must be unique for future mints to prevent duplicate media.
     */
    function _mintForCreator(
        address creator,
        uint256 tokenId,
        MediaData memory data
        //IMarket.BidShares memory bidShares
    ) internal onlyValidURI(data.tokenURI) {
        require(msg.sender == _contractCreator, "Meida: Only contract creator can mint");
        require(data.contentHash != 0, "Media: content hash must be non-zero");
        require(
            _contentHashes[data.contentHash].isValid == false,
            "Media: a token has already been created with this content hash"
        );
        require(
            _exists(tokenId) == false,
            "Media: existent tokenId"
        );

        _safeMint(creator, tokenId);
        _setTokenContentHash(tokenId, data.contentHash);
        _setTokenURI(tokenId, data.tokenURI);
        EnumerableSet.add(_creatorTokens[creator], tokenId);
        _contentHashes[data.contentHash].value = tokenId;
        _contentHashes[data.contentHash].isValid = true;

        tokenCreators[tokenId] = creator;
        //previousTokenOwners[tokenId] = creator;
        //IMarket(marketContract).setBidShares(tokenId, bidShares);
    }

    function _setTokenContentHash(uint256 tokenId, bytes32 contentHash)
        internal
        virtual
        onlyExistingToken(tokenId)
    {
        tokenContentHashes[tokenId] = contentHash;
    }

    /**
     * @notice Destroys `tokenId`.
     * @dev We modify the OZ _burn implementation to
     * maintain metadata and to remove the
     * previous token owner from the piece
     */
    function _burn(uint256 tokenId) internal override {
        string memory _tokenURI = _tokenURIs[tokenId];

        super._burn(tokenId);

        if (bytes(_tokenURI).length != 0) {
            _tokenURIs[tokenId] = _tokenURI;
        }

        //delete previousTokenOwners[tokenId];
    }

    /**
     * @notice transfer a token and remove the ask for it.
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        //IMarket(marketContract).removeAsk(tokenId);

        super._transfer(from, to, tokenId);
    }

    /**
     * @dev Calculates EIP712 DOMAIN_SEPARATOR based on the current contract and chain ID.
     */
    function _calculateDomainSeparator() public view returns (bytes32) {
        uint256 chainID;
        /* solium-disable-next-line */
        assembly {
            chainID := chainid()
        }

        return
            keccak256(
                abi.encode(
                    keccak256(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                    ),
                    keccak256(bytes("Pxbee")),
                    keccak256(bytes("1")),
                    chainID,
                    address(this)
                )
            );
    }

    function exists(uint256 tokenId) public view returns (bool) 
    {
        return _exists(tokenId);
    }

    function creatorOf(uint256 tokenId) public view returns (address) 
    {
        return tokenCreators[tokenId];
    }
}

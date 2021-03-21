// SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "./ERC721Base.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";

contract SimpleERC721 is ERC721Base, IERC721Metadata {
    /// @notice A descriptive name for a collection of NFTs in this contract
    function name() external pure override returns (string memory) {
        return "Simple ERC721 Token";
    }

    /// @notice An abbreviated name for NFTs in this contract
    function symbol() external pure override returns (string memory) {
        return "SIMPLE";
    }

    function tokenURI(uint256 id) public view virtual override returns (string memory) {
        address owner = _ownerOf(id);
        require(owner != address(0), "NOT_EXISTS");
        return _tokenURI(id);
    }

    function supportsInterface(bytes4 id) public pure virtual override(ERC721Base, IERC165) returns (bool) {
        return ERC721Base.supportsInterface(id) || id == 0x5b5e139f;
    }

    function mint(address to, uint256 id) external payable returns (uint256) {
        _mint(id, to);
        return id;
    }

    function burn(uint256 id) external {
        _burn(id);
    }

    function _tokenURI(uint256 id) internal pure returns (string memory) {
        return string(abi.encodePacked("ipfs://bafybei", hash2base32(id), "/metadata.json"));
    }

    bytes32 private constant base32Alphabet = 0x6162636465666768696A6B6C6D6E6F707172737475767778797A323334353637;

    function hash2base32(uint256 hash) private pure returns (string memory) {
        uint256 num = uint256(hash);
        uint256 k = 52;
        bytes memory bstr = new bytes(k);
        bstr[--k] = base32Alphabet[uint8((num % 8) << 2)]; // uint8 s = uint8((256 - skip) % 5);  // (num % (2**s)) << (5-s)
        num /= 8;
        while (k > 0) {
            bstr[--k] = base32Alphabet[num % 32];
            num /= 32;
        }
        return string(bstr);
    }
}

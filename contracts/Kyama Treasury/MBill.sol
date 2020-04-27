pragma solidity >=0.4.21 <0.6.0;

// OpenZeppelin's implementation of the ERC20 token protocol
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

/// @title Contract that instantiates the M-Bill (KYM) and stores application Ether
/// @dev Kyama-Project

contract MBill is ERC20, ERC20Detailed {
    // Mapping of addresses that have call access to token data
    mapping (address => bool) public callAccess;

    // Setup M-Bill name and symbol
    constructor() ERC20Detailed("Kyama", "KYM", 18) public {
        // Add deploying address to call access mapping
        callAccess[msg.sender] = true;
    }

    // Payable fallback
    function () external payable isApproved {
        // Accept funds
    }

    // Modifier to ensure that address is approved to call into token data
    modifier isApproved() {
        require(callAccess[msg.sender] == true, "Token data access denied.");
        _;
    }

    // Function to approve address for call access
    function approveAddress(address _toApproveAddress) external isApproved {
        callAccess[_toApproveAddress] = true;
    }

    // Function to revoke address from call access
    function revokeAddress(address _toRevokeAddress) external isApproved {
        callAccess[_toRevokeAddress] = false;
    }

    // Functon to facilitate the minting of M-Bill(s)
    function mintM_Bill(address _accountAddress, uint256 _tokenValue) external isApproved {
        require(_accountAddress != address(0), "Address provided for M-Bill minting is invalid.");
        require(_tokenValue > 0, "Token value provided for M-Bill minting is invalid.");

        // Mint M-Bill token(s)
        _mint(_accountAddress, _tokenValue);
    }

    // Function to facilitate burning of M-Bill(s)
    function burnM_Bill(address _accountAddress, uint256 _tokenValue) external isApproved {
        require(_accountAddress != address(0), "Address provided for M-Bill burning is invalid.");
        require(_tokenValue > 0, "Token value provided for M-Bill burning is invalid.");

        // Burn M-Bill token(s)
        _burn(_accountAddress, _tokenValue);
    }

    // Function to facilitate transfer of M-Bill(s)
    function transferM_Bill(address _accountAddress, address _recipientAddress, uint256 _tokenValue) external isApproved {
        require(_accountAddress != address(0), "Address provided for M-Bill burning is invalid.");
        require(_recipientAddress != address(0), "Recipient address provided for M-Bill burning is invalid.");
        require(_tokenValue > 0, "Token value provided for M-Bill burning is invalid.");

        // Transfer M-Bill token(s)
        _transfer(_accountAddress, _recipientAddress, _tokenValue);
    }

    // Function to facilitate the issuance of ether to a payable address
    function issueEther(address payable _payableAddress, uint256 _issueAmount) external isApproved {
        require(_payableAddress != address(0), "Address provided for ether issuance is invalid.");
        require(_issueAmount > 0, "Ether issue amount is invalid.");

        // Transfer ether
        _payableAddress.transfer(_issueAmount);
    }
}
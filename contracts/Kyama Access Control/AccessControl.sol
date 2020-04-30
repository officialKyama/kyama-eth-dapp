pragma solidity >=0.4.21;

/// @title Contract that controls how privileges are assigned to different administrators in the Kyama project
/// @dev Kyama-Project

contract AccessControl {
    // Declaration of addresses that will have administrator privileges
    // All administrators have the ability to pause contracts
    // CEO handles the assignment and re-assignment of other admin role addresses
    // CEO handles the unpausing of contracts
    address public ceoAddress;
    // CFO handles application sensitive treasury operations ...
    // Including the opening and closing of the auction and the withdrawal of Kyama gained interest funds
    address public cfoAddress;

    // Boolean that determines the operational status of application logic contracts
    bool public isOperational;

    // Modifier to ensure that address is CEO
    modifier requireIsCEO() {
        require(msg.sender != address(0), "CEO address provided is invalid.");
        require(msg.sender == ceoAddress, "Address must be that of the CEO.");
        _;
    }

    // Modifier to ensure that address is CFO
    modifier requireIsCFO() {
        require(msg.sender != address(0), "CFO address provided is invalid.");
        require(msg.sender == cfoAddress, "Address must be that of the CFO.");
        _;
    }

    // Modifier to ensure that address is administrator
    modifier requireIsAdmin() {
        require(msg.sender != address(0), "Administrator address provided is invalid.");
        require(msg.sender == ceoAddress ||
                msg.sender == cfoAddress, "Address must be that of an administrator.");
        _;
    }

    // Modifier to ensure that contracts are operational
    modifier requireIsOperational() {
        require(isOperational == true, "Contracts are currently paused.");
        _;
    }

    // Modifier to ensure that contracts are paused
    modifier requireIsNotOperational() {
        require(isOperational == false, "Contracts are currently active.");
        _;
    }

    // Constructor function to set the administrator CEO address and operational status
    constructor() public {
        // Set the CEO address to the address that deployed the contract
        // The CEO address can then set other admin role addresses at will but cannot perfom their functions
        ceoAddress = msg.sender;

        // Set application operational status to active
        isOperational = true;
    }

    // Function to set a new CEO address
    function setCEO(address _newCEO) external requireIsCEO {
        require(_newCEO != address(0), "New CEO address provided must be valid.");
        require(_newCEO != ceoAddress && _newCEO != cfoAddress, "New CEO address must not be a current administrator.");

        ceoAddress = _newCEO;
    }

    // Function to set a new CFO address
    function setCFO(address _newCFO) external requireIsCEO {
        require(_newCFO != address(0), "New CFO address provided must be valid.");
        require(_newCFO != ceoAddress && _newCFO != cfoAddress, "New CFO address must not be a current administrator.");

        cfoAddress = _newCFO;
    }

    // Function to pause application contracts
    function pause() external requireIsAdmin requireIsOperational {
        isOperational = false;
    }

    // Function to unpause application contracts
    function resume() external requireIsCEO requireIsNotOperational {
        isOperational = true;
    }
}
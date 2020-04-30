pragma solidity >=0.4.21;

// Kyama Access Control contract
import "../Kyama Access Control/AccessControl.sol";
// Kyama M-Bill
import "./MBill.sol";
// Kyama Base contract
import "../Kyama Base/Base.sol";

// OpenZeppelin's SafeMath library
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title Contract that handles Kyama's M-Bill auctioning operations
/// @dev Kyama-Project

contract Auction is AccessControl {
    // Base contract reference
    Base public base;
    // MBill contract reference
    MBill public mBill;
    // MBill payable contract address
    address payable mBillPayableAddress;

    using SafeMath for uint256;

    // Event called when auction is opened
    event AuctionOpened(bool _auctionStatus);
    // Event called when auction is closed
    event AuctionClosed(bool _auctionStatus);
    // Event called when M-Bill is invested
    event MInvest(address _investor, uint256 _amountInvested, uint256 _shareCapital, uint256 _pps);

    // Boolean that signifies whether auction is active
    bool public isAuctioning;

    // Constructor to set initial values
    constructor(address _baseAddress, address _mBillAddress) public {
        // Initialize contracts
        base = Base(_baseAddress);
        mBillPayableAddress = address(uint160(_mBillAddress));
        mBill = MBill(mBillPayableAddress);

        isAuctioning = false;
    }

    // Function to handle opening of an auction
    function openAuction() external requireIsOperational requireIsCFO {
        require(isAuctioning == false, "Auction currently open.");

        isAuctioning = true;

        emit AuctionOpened(isAuctioning);
    }

    // Function to close an auction
    function closeAuction() external requireIsOperational requireIsCFO {
        require(isAuctioning == true, "Auction currently closed.");

        isAuctioning = false;

        emit AuctionClosed(isAuctioning);
    }

    // Function to issue an M-Bill (KYM)
    function issueBond() external payable requireIsOperational {
        require(isAuctioning == true, "Auction has to be opened.");
        require(base.isUserRegistered(msg.sender) == false, "User is already registered.");

        // Store current pps
        uint256 investmentPPS = base.currentMPPS();
        // Get the amount invested by a member
        uint256 amountInvested = msg.value;

        require(amountInvested > investmentPPS, "Ether amount is too low for this transaction.");

        // Get the price-divisible amount invested.
        // This technique prevents potential solidity floating point calculation errors.
        // However, this should not lead to any share capital buy in loss on the investor.
        uint256 priceDivisibleInvestment = amountInvested - (amountInvested.mod(investmentPPS));

        // Create an account for the investor
        base.createAccount(msg.sender, amountInvested);

        // Transfer funds to MBill contract
        mBillPayableAddress.transfer(msg.value);

        // Increment Kyama's total capital
        base.incrementTotalCapital(amountInvested);

        // Calculate investment share capital
        uint256 shareCapital = priceDivisibleInvestment.div(investmentPPS);

        // Increment total M-Bills issued on Kyama
        base.incrementTotalMIssued(amountInvested);
        // Increment total M-Bill share capital
        base.incrementMShareCap(shareCapital);

        // Record M-Bill investment
        base.recordMData(msg.sender, amountInvested, uint256(0), address(0), shareCapital);

        // Update the current M-Bill price per share
        base.updateMPPs();

        // Mint M-Bills for investor
        mBill.mintM_Bill(msg.sender, shareCapital);

        // emit M-Bill investment event
        emit MInvest(msg.sender, amountInvested, shareCapital, investmentPPS);
    }
}